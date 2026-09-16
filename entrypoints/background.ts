import type { FolderItem, LaunchpadItem, ShortcutItem } from "@/types";

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

/**
 * Sets up the "Add to Tabin" context menu on browser tabs with dynamic folder submenus
 */
async function setupContextMenus() {
  try {
    await chrome.contextMenus.removeAll();

    const { items } = await getStorageData();
    const folders = items.filter((i): i is FolderItem => i.type === "folder");

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

export default defineBackground(() => {
  // Enable extension action icon
  browser.action.enable();

  // Clicking pinned action icon opens the Tabin new tab page
  browser.action.onClicked.addListener(async () => {
    await browser.tabs.create({});
  });

  // Setup context menus on startup and install
  setupContextMenus();
  chrome.runtime.onInstalled.addListener(() => {
    setupContextMenus();
  });

  // Re-sync context menus whenever folders change in storage
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes["launchpad-storage"]) {
      setupContextMenus();
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

    const containerObj = typeof raw === "string" ? JSON.parse(raw) : raw || {};
    containerObj.state = updatedState;

    await chrome.storage.local.set({
      "launchpad-storage":
        typeof raw === "string" ? JSON.stringify(containerObj) : containerObj,
    });

    // Show fast, native, minimal confirmation
    await showConfirmation(targetTab?.id, "success", title, destinationName);
  });
});
