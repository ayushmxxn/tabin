import type { FolderItem, LaunchpadItem, ShortcutItem } from "@/types";
import { saveNewTabs } from "@/lib/savedTabsStorage";
import type { SavedTab } from "@/types/savedTabs";
import { fetchWebsiteMetadataDirect, downloadImageAsDataUrlDirect } from "@/lib/fetchMetadata";

// Tabin signature brand magenta color for badges
const BRAND_COLOR = "#FA1E76";

interface StoredState {
  state?: {
    items?: LaunchpadItem[];
    dockIds?: string[];
    spaces?: Array<{ id: string; name: string }>;
  };
}

/**
 * Normalizes URL for consistent duplicate checking (lowercase, stripped trailing slashes)
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

/**
 * Resolves the tab's direct favicon if valid, or returns null to let Tabin's
 * existing favicon resolution logic in Tile.tsx / Folder.tsx handle it natively.
 * Avoids making unnecessary external network requests in the service worker.
 */
function resolveFaviconUrl(tabFavicon?: string | null): string | null {
  if (
    tabFavicon &&
    !tabFavicon.startsWith("chrome://") &&
    !tabFavicon.startsWith("chrome-extension://") &&
    !tabFavicon.startsWith("devtools://")
  ) {
    return tabFavicon;
  }
  return null;
}

/**
 * Reads the current Launchpad storage from chrome.storage.local
 */
async function getStorageData(): Promise<{
  raw: unknown;
  state: StoredState["state"];
  items: LaunchpadItem[];
}> {
  try {
    const result = await chrome.storage.local.get("launchpad-storage");
    const raw = result["launchpad-storage"];
    const parsed: StoredState =
      typeof raw === "string" ? JSON.parse(raw) : raw || {};
    const state = parsed.state || {};
    const items = Array.isArray(state.items) ? state.items : [];
    return { raw, state, items };
  } catch {
    return { raw: null, state: {}, items: [] };
  }
}

let lastConfiguredFolderKey: string | null = null;

/**
 * Sets up the "Add to Tabin" context menu on browser tabs with dynamic folder submenus.
 * Checks folder signature to prevent unnecessary teardown/rebuilds on unrelated storage changes.
 */
async function setupContextMenus(force = false) {
  try {
    const { items } = await getStorageData();
    const folders = items.filter((i): i is FolderItem => i.type === "folder");
    const currentFolderKey = folders.map((f) => `${f.id}:${f.title}`).join("|");

    if (!force && lastConfiguredFolderKey !== null && lastConfiguredFolderKey === currentFolderKey) {
      return;
    }

    lastConfiguredFolderKey = currentFolderKey;
    await chrome.contextMenus.removeAll();

    if (folders.length > 0) {
      // Parent menu: Add to Tabin
      chrome.contextMenus.create({
        id: "add-to-tabin-root",
        title: "Add to Tabin",
        contexts: ["tab"],
      });

      // Quick destination: Home (Default)
      chrome.contextMenus.create({
        id: "add-to-tabin-dest-home",
        parentId: "add-to-tabin-root",
        title: "Home (Default)",
        contexts: ["tab"],
      });

      // Separator
      chrome.contextMenus.create({
        id: "add-to-tabin-sep",
        parentId: "add-to-tabin-root",
        type: "separator",
        contexts: ["tab"],
      });

      // Destination: Each existing folder
      for (const folder of folders) {
        chrome.contextMenus.create({
          id: `add-to-tabin-dest-folder_${folder.id}`,
          parentId: "add-to-tabin-root",
          title: folder.title,
          contexts: ["tab"],
        });
      }
    } else {
      // Single top-level item if no folders exist yet
      chrome.contextMenus.create({
        id: "add-to-tabin-root",
        title: "Add to Tabin",
        contexts: ["tab"],
      });
    }
  } catch (err) {
    console.error("Failed to setup Tabin context menus:", err);
  }
}

/**
 * Displays visual confirmation using native Chrome action badge and tooltip.
 * Fully compatible with Manifest V3 ServiceWorkerGlobalScope (zero DOM/document access).
 */
async function showConfirmation(
  tabId: number | undefined,
  type: "success" | "duplicate" | "error",
  title: string,
  destinationName: string,
) {
  try {
    const isSuccess = type === "success";
    const isDuplicate = type === "duplicate";

    const badgeText = isSuccess ? "✓" : isDuplicate ? "•" : "!";
    const badgeColor = isSuccess
      ? BRAND_COLOR
      : isDuplicate
        ? "#F59E0B"
        : "#EF4444";
    const tooltip = isSuccess
      ? `Added "${title}" to Tabin (${destinationName})`
      : isDuplicate
        ? `"${title}" is already in Tabin`
        : `Cannot add this page to Tabin`;

    await chrome.action.setBadgeBackgroundColor({ color: badgeColor });

    if (tabId) {
      await chrome.action.setBadgeText({ text: badgeText, tabId });
      await chrome.action.setTitle({ title: tooltip, tabId }).catch(() => {});

      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId }).catch(() => {});
        chrome.action.setTitle({ title: "Tabin", tabId }).catch(() => {});
      }, 2500);
    } else {
      await chrome.action.setBadgeText({ text: badgeText });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" }).catch(() => {});
      }, 2500);
    }
  } catch (err) {
    console.error("Failed to show Tabin action confirmation:", err);
  }
}

/**
 * Ensures only ONE Saved Tabs page exists across all windows.
/**
 * Ensures the persistent Saved Tabs page is open and pinned on the far-left
 * of every normal browser window, even when there are no saved tabs yet.
 * Reuses and optionally focuses the existing tab, closing any accidental duplicates.
 */
async function ensureSavedTabsPinnedTab(activate = false): Promise<void> {
  try {
    const savedTabsPageUrl = chrome.runtime.getURL("/saved-tabs.html");
    const windows = await chrome.windows.getAll({
      populate: true,
      windowTypes: ["normal"],
    });

    for (const win of windows) {
      if (!win.id) continue;
      const tabs = win.tabs || [];
      const matching = tabs.filter(
        (t) => t.url && t.url.startsWith(savedTabsPageUrl),
      );

      if (matching.length > 0) {
        const primary = matching[0];
        if (primary && primary.id) {
          if (!primary.pinned || primary.index !== 0) {
            await chrome.tabs.update(primary.id, { pinned: true }).catch(() => {});
            await chrome.tabs.move(primary.id, { index: 0 }).catch(() => {});
          }
          if (activate) {
            await chrome.windows.update(win.id, { focused: true }).catch(() => {});
            await chrome.tabs.update(primary.id, { active: true }).catch(() => {});
          }
        }
        if (matching.length > 1) {
          const dupeIds = matching.slice(1).map((t) => t.id!).filter(Boolean);
          if (dupeIds.length > 0) {
            await chrome.tabs.remove(dupeIds).catch(() => {});
          }
        }
      } else {
        await chrome.tabs.create({
          windowId: win.id,
          url: savedTabsPageUrl,
          pinned: true,
          active: activate,
          index: 0,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Failed to ensure Saved Tabs pinned tab:", err);
  }
}

/** Backward-compatible alias for actions that focus Saved Tabs */
const openOrFocusSavedTabsPage = () => ensureSavedTabsPinnedTab(true);

export default defineBackground(() => {
  // Enable extension action icon
  browser.action.enable();

  // Clicking pinned action icon captures all tabs, saves them, opens/focuses Saved Tabs page, and closes tabs
  let isCapturing = false;
  browser.action.onClicked.addListener(async (activeTab) => {
    if (isCapturing) return;
    isCapturing = true;
    try {
      const currentWindowId = activeTab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
      const allTabs = await chrome.tabs.query({ windowId: currentWindowId });
      const savedTabsPageUrl = chrome.runtime.getURL("/saved-tabs.html");

      // Filter tabs:
      // Exclude the Saved Tabs page itself and empty tabs
      const tabsToSave = allTabs.filter((tab) => {
        if (!tab.id || !tab.url) return false;
        if (tab.url.startsWith(savedTabsPageUrl)) return false;
        return true;
      });

      const hasActualWebTabs = tabsToSave.some((t) => {
        const u = t.url || "";
        return !u.startsWith("chrome://newtab") && !u.startsWith("about:blank") && !u.startsWith("chrome://welcome");
      });

      // If no valid tabs or just an empty new tab, simply focus/open the single Saved Tabs page
      if (tabsToSave.length === 0 || (!hasActualWebTabs && tabsToSave.length === 1)) {
        await openOrFocusSavedTabsPage();
        return;
      }

      // Fetch group metadata if tab groups are supported
      const groupCache = new Map<number, { title?: string; color?: string }>();
      if (chrome.tabGroups) {
        try {
          const groups = await chrome.tabGroups.query({ windowId: currentWindowId });
          for (const g of groups) {
            groupCache.set(g.id, { title: g.title, color: g.color });
          }
        } catch {
          // Tab groups not supported or empty
        }
      }

      // Convert tabs to lightweight SavedTab metadata
      const lightweightTabs: SavedTab[] = tabsToSave.map((tab) => {
        const groupInfo = tab.groupId && tab.groupId !== -1 ? groupCache.get(tab.groupId) : undefined;
        const safeFavicon =
          tab.favIconUrl && tab.favIconUrl.startsWith("http")
            ? tab.favIconUrl
            : null;

        return {
          id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: tab.url || tab.pendingUrl || "",
          title: tab.title || "Untitled Tab",
          favIconUrl: safeFavicon,
          pinned: tab.pinned ?? false,
          groupId: tab.groupId !== -1 ? tab.groupId : undefined,
          groupTitle: groupInfo?.title,
          groupColor: groupInfo?.color,
        };
      });

      // SAFETY: Save data FIRST and await storage commit before closing any tab
      await saveNewTabs(lightweightTabs);

      // Focus the single existing Saved Tabs page (or create it if none exists)
      await openOrFocusSavedTabsPage();

      // Close the captured tabs safely
      const tabIdsToClose = tabsToSave.map((t) => t.id!).filter(Boolean);
      if (tabIdsToClose.length > 0) {
        await chrome.tabs.remove(tabIdsToClose);
      }
    } catch (err) {
      console.error("Failed to execute Tabin Saved Tabs capture:", err);
      // SAFETY: In case of any error, tabs remain completely open
    } finally {
      isCapturing = false;
    }
  });

  // Setup context menus and ensure pinned Saved Tabs tab on startup and install
  setupContextMenus();
  ensureSavedTabsPinnedTab(false);

  chrome.runtime.onInstalled.addListener(() => {
    setupContextMenus(true);
    ensureSavedTabsPinnedTab(false);
  });

  chrome.runtime.onStartup?.addListener(() => {
    ensureSavedTabsPinnedTab(false);
  });

  if (chrome.windows?.onCreated) {
    chrome.windows.onCreated.addListener((win) => {
      if (win.type === "normal") {
        ensureSavedTabsPinnedTab(false);
      }
    });
  }

  // Re-sync context menus only if folders change in storage
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes["launchpad-storage"]) {
      setupContextMenus(false);
    }
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener(async (info, clickedTab) => {
    const menuItemId = info.menuItemId.toString();
    if (!menuItemId.startsWith("add-to-tabin")) return;

    // Resolve target tab
    let targetTab = clickedTab;
    if (!targetTab || !targetTab.url) {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      targetTab = activeTab;
    }

    const url = targetTab?.url || info.pageUrl || "";
    if (!url) return;

    // Filter out internal non-web URLs
    const isWebUrl = url.startsWith("http://") || url.startsWith("https://");
    if (!isWebUrl) {
      await showConfirmation(
        targetTab?.id,
        "error",
        "Only web URLs can be added",
        "",
      );
      return;
    }

    const rawTitle = targetTab?.title || info.selectionText || "";
    let title = rawTitle.trim();
    if (!title) {
      try {
        title = new URL(url).hostname;
      } catch {
        title = "Bookmark";
      }
    }

    // Determine target folder destination
    let destinationFolderId: string | null = null;
    let destinationName = "Home";

    if (menuItemId.startsWith("add-to-tabin-dest-folder_")) {
      destinationFolderId = menuItemId.replace("add-to-tabin-dest-folder_", "");
    }

    // Read current storage data
    const { raw, state, items } = await getStorageData();

    // Resolve destination name for confirmation feedback
    if (destinationFolderId) {
      const folder = items.find(
        (i): i is FolderItem =>
          i.type === "folder" && i.id === destinationFolderId,
      );
      if (folder) {
        destinationName = folder.title;
      } else {
        destinationFolderId = null;
      }
    }

    // Check for duplicates
    const normalizedTarget = normalizeUrl(url);
    const existingShortcut = items.find(
      (item): item is ShortcutItem =>
        item.type === "shortcut" && normalizeUrl(item.url) === normalizedTarget,
    );

    if (existingShortcut) {
      await showConfirmation(
        targetTab?.id,
        "duplicate",
        existingShortcut.title,
        destinationName,
      );
      return;
    }

    // Resolve latest favicon (prefer tab's direct favicon, or null for native resolution)
    const favIconUrl = resolveFaviconUrl(targetTab?.favIconUrl);

    // Resolve OG image once when adding shortcut
    let ogImage: string | null = null;
    try {
      const meta = await fetchWebsiteMetadataDirect(url);
      if (meta.ogImage) ogImage = meta.ogImage;
    } catch {}

    // Create new shortcut item
    const newId = `shortcut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newShortcut: ShortcutItem = {
      id: newId,
      type: "shortcut",
      title,
      url,
      spaceId: "space-home",
      folderId: destinationFolderId,
      accent: "violet",
      customIcon: favIconUrl,
      ...(ogImage ? { ogImage } : {}),
    };

    // If added to folder, update folder itemIds
    let updatedItems = [...items, newShortcut];
    if (destinationFolderId) {
      updatedItems = updatedItems.map((item) =>
        item.id === destinationFolderId && item.type === "folder"
          ? { ...item, itemIds: [...item.itemIds, newId] }
          : item,
      );
    }

    // Persist updated items to chrome.storage.local
    const updatedState = {
      ...state,
      items: updatedItems,
    };

    const containerObj =
      typeof raw === "string"
        ? JSON.parse(raw)
        : raw && typeof raw === "object"
          ? raw
          : {};

    containerObj.state = {
      ...(containerObj.state || {}),
      ...updatedState,
    };

    const serialized = JSON.stringify(containerObj);
    await chrome.storage.local.set({
      "launchpad-storage": serialized,
      "launchpad-storage_backup": serialized,
    });

    // Show fast, native, minimal confirmation
    await showConfirmation(targetTab?.id, "success", title, destinationName);
  });

  // Handle cross-origin metadata fetch and direct image download requests from newtab/extension pages
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "FETCH_WEBSITE_METADATA" && message.url) {
      fetchWebsiteMetadataDirect(message.url)
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err?.message }));
      return true;
    }
    if (message?.type === "DOWNLOAD_IMAGE" && message.url) {
      downloadImageAsDataUrlDirect(message.url)
        .then((dataUrl) => sendResponse({ success: true, dataUrl }))
        .catch((err) => sendResponse({ success: false, error: err?.message }));
      return true;
    }
  });
});
