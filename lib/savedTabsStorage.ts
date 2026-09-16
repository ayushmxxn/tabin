import type { SavedTab, SavedTabGroup } from "@/types/savedTabs";

const STORAGE_KEY = "tabin-saved-tabs";

/**
 * Retrieves all saved tab groups from storage.
 * Normalizes legacy sessions into SavedTabGroup.
 */
export async function getSavedGroups(): Promise<SavedTabGroup[]> {
  try {
    let raw: unknown = null;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      raw = result[STORAGE_KEY];
    } else {
      raw = localStorage.getItem(STORAGE_KEY);
    }

    if (!raw) return [];
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item, index) => ({
        id: item.id || `group-${index}`,
        name: item.name?.trim() && item.name !== "Saved Tabs" ? item.name.trim() : "Today",
        createdAt: item.createdAt || Date.now(),
        tabs: Array.isArray(item.tabs) ? item.tabs : [],
        isTarget: Boolean(item.isTarget),
      }));
  } catch (err) {
    console.error("Failed to load saved tab groups:", err);
    return [];
  }
}

/** Backward compatibility alias */
export const getSavedSessions = getSavedGroups;

async function persistGroups(groups: SavedTabGroup[]): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY]: groups });
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  }
}

const NOTICE_KEY = "tabin-saved-tabs-notice";

const TRACKING_PARAMS = new Set([
  // UTM parameters
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",
  // Google / Ads
  "gclid",
  "gclsrc",
  "dclid",
  "wbraid",
  "gbraid",
  "_ga",
  "_gl",
  // Meta / Social
  "fbclid",
  "twclid",
  "msclkid",
  "igshid",
  "mc_eid",
  "yclid",
  "spm",
  "ref",
  "ref_src",
  "ref_url",
]);

/**
 * Normalizes a URL for smart duplicate detection:
 * - Case-insensitive scheme and host
 * - Strips URL fragments (#hash)
 * - Strips common tracking query parameters (utm_*, gclid, fbclid, etc.)
 * - Strips trailing slashes from pathnames
 * - Sorts query parameters deterministically
 * - Preserves semantic queries and genuinely distinct URLs
 */
export function normalizeUrlForDuplicateCheck(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  try {
    const urlWithProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : trimmed.includes("://")
        ? trimmed
        : `https://${trimmed}`;

    const parsed = new URL(urlWithProto);

    // Remove hash/fragment
    parsed.hash = "";

    // Remove common tracking parameters
    const toDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (
        TRACKING_PARAMS.has(lower) ||
        lower.startsWith("utm_") ||
        lower.startsWith("ga_") ||
        lower.startsWith("hsa_")
      ) {
        toDelete.push(key);
      }
    });
    for (const key of toDelete) {
      parsed.searchParams.delete(key);
    }

    // Sort query parameters
    parsed.searchParams.sort();

    // Remove trailing slashes from path (root '/' remains '/')
    let pathname = parsed.pathname.replace(/\/+$/, "");
    if (!pathname) pathname = "/";

    const search = parsed.searchParams.toString();
    const query = search ? `?${search}` : "";
    const port = parsed.port ? `:${parsed.port}` : "";

    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${port}${pathname}${query}`;
  } catch {
    const base = trimmed.toLowerCase().split("#")[0] ?? "";
    return base.replace(/\/+$/, "");
  }
}

export async function recordDuplicateNotice(
  count: number,
  type: "saved" | "restored",
): Promise<void> {
  const text =
    type === "saved"
      ? `${count} duplicate ${count === 1 ? "tab" : "tabs"} skipped`
      : `${count} duplicate ${count === 1 ? "tab" : "tabs"} already open`;
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [NOTICE_KEY]: text });
  }
}

export async function consumeDuplicateNotice(): Promise<string | null> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const res = await chrome.storage.local.get(NOTICE_KEY);
    const val = res[NOTICE_KEY];
    const notice = typeof val === "string" ? val : null;
    if (notice) {
      await chrome.storage.local.remove(NOTICE_KEY);
    }
    return notice;
  }
  return null;
}

export interface SaveTabsResult {
  group: SavedTabGroup | null;
  savedCount: number;
  skippedCount: number;
}

/**
 * Saves newly captured tabs with smart duplicate detection:
 * - Detects tabs with the same normalized URL
 * - Does not save duplicates into the same group
 * - If a tab is already saved, skips it instead of creating another copy
 */
export async function saveNewTabs(
  tabs: SavedTab[],
  targetGroupId?: string | null,
): Promise<SaveTabsResult> {
  const existing = await getSavedGroups();

  // Deduplicate within the incoming batch itself
  const seenIncoming = new Set<string>();
  const deduplicatedIncoming: SavedTab[] = [];

  for (const tab of tabs) {
    const norm = normalizeUrlForDuplicateCheck(tab.url);
    if (!norm || seenIncoming.has(norm)) {
      continue;
    }
    seenIncoming.add(norm);
    deduplicatedIncoming.push(tab);
  }

  const target = targetGroupId
    ? existing.find((g) => g.id === targetGroupId)
    : existing.find((g) => g.isTarget);

  if (target) {
    const targetNorms = new Set(
      target.tabs.map((t) => normalizeUrlForDuplicateCheck(t.url)),
    );
    const newTabsToAdd = deduplicatedIncoming.filter(
      (t) => !targetNorms.has(normalizeUrlForDuplicateCheck(t.url)),
    );
    const skippedCount = tabs.length - newTabsToAdd.length;

    if (newTabsToAdd.length > 0) {
      const updated = existing.map((g) =>
        g.id === target.id ? { ...g, tabs: [...g.tabs, ...newTabsToAdd] } : g,
      );
      await persistGroups(updated);
      if (skippedCount > 0) {
        await recordDuplicateNotice(skippedCount, "saved");
      }
      return {
        group: { ...target, tabs: [...target.tabs, ...newTabsToAdd] },
        savedCount: newTabsToAdd.length,
        skippedCount,
      };
    }

    if (skippedCount > 0) {
      await recordDuplicateNotice(skippedCount, "saved");
    }
    return { group: target, savedCount: 0, skippedCount };
  }

  // Creating a new group: skip tabs already saved across any group
  const allExistingNorms = new Set(
    existing
      .flatMap((g) => g.tabs)
      .map((t) => normalizeUrlForDuplicateCheck(t.url)),
  );

  const newTabsToAdd = deduplicatedIncoming.filter(
    (t) => !allExistingNorms.has(normalizeUrlForDuplicateCheck(t.url)),
  );
  const skippedCount = tabs.length - newTabsToAdd.length;

  if (newTabsToAdd.length > 0) {
    const newGroup: SavedTabGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "Today",
      createdAt: Date.now(),
      tabs: newTabsToAdd,
    };
    const updated = [newGroup, ...existing];
    await persistGroups(updated);
    if (skippedCount > 0) {
      await recordDuplicateNotice(skippedCount, "saved");
    }
    return {
      group: newGroup,
      savedCount: newTabsToAdd.length,
      skippedCount,
    };
  }

  if (skippedCount > 0) {
    await recordDuplicateNotice(skippedCount, "saved");
  }
  return {
    group: null,
    savedCount: 0,
    skippedCount,
  };
}

/** Backward compatibility alias */
export const saveNewSession = (tabs: SavedTab[], name?: string) => {
  return saveNewTabs(tabs);
};

/**
 * Creates a new group populated with the specified tabs.
 * A new group only ever appears once tabs are placed into it.
 */
export async function createGroupWithTabs(
  name: string,
  tabIds: string[],
): Promise<{ newGroup: SavedTabGroup; updated: SavedTabGroup[] } | null> {
  if (tabIds.length === 0) return null;
  const existing = await getSavedGroups();
  const idSet = new Set(tabIds);
  const tabsToMove: SavedTab[] = [];

  for (const group of existing) {
    for (const tab of group.tabs) {
      if (idSet.has(tab.id)) {
        tabsToMove.push(tab);
      }
    }
  }

  if (tabsToMove.length === 0) return null;

  const newGroup: SavedTabGroup = {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "New group",
    createdAt: Date.now(),
    tabs: tabsToMove,
  };

  // Remove moved tabs from their original groups and filter out empty groups
  const updatedExisting = existing
    .map((g) => ({
      ...g,
      tabs: g.tabs.filter((t) => !idSet.has(t.id)),
    }))
    .filter((g) => g.tabs.length > 0);

  const updated = [newGroup, ...updatedExisting];
  await persistGroups(updated);
  return { newGroup, updated };
}

/** Backward compatibility alias */
export async function createGroup(
  name = "New group",
): Promise<{ newGroup: SavedTabGroup; updated: SavedTabGroup[] }> {
  const existing = await getSavedGroups();
  const newGroup: SavedTabGroup = {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "New group",
    createdAt: Date.now(),
    tabs: [],
  };
  const updated = [newGroup, ...existing];
  await persistGroups(updated);
  return { newGroup, updated };
}

/**
 * Renames a group.
 */
export async function renameGroup(
  groupId: string,
  newName: string,
): Promise<SavedTabGroup[]> {
  const existing = await getSavedGroups();
  const trimmed = newName.trim();
  const updated = existing.map((g) =>
    g.id === groupId ? { ...g, name: trimmed || "Today" } : g,
  );
  await persistGroups(updated);
  return updated;
}

/** Backward compatibility alias */
export const renameSession = renameGroup;

/**
 * Deletes a group by ID.
 */
export async function deleteGroup(groupId: string): Promise<SavedTabGroup[]> {
  const existing = await getSavedGroups();
  const updated = existing.filter((g) => g.id !== groupId);
  await persistGroups(updated);
  return updated;
}

/** Backward compatibility alias */
export const deleteSession = deleteGroup;

/**
 * Sets or unsets a group as the active target for incoming captured tabs.
 */
export async function setTargetGroup(groupId: string | null): Promise<SavedTabGroup[]> {
  const existing = await getSavedGroups();
  const updated = existing.map((g) => ({
    ...g,
    isTarget: groupId ? g.id === groupId : false,
  }));
  await persistGroups(updated);
  return updated;
}

/**
 * Moves an individual tab from one group to another.
 * Automatically cleans up any group left with 0 tabs.
 */
export async function moveTabToGroup(
  tabId: string,
  fromGroupId: string,
  toGroupId: string,
): Promise<SavedTabGroup[]> {
  const existing = await getSavedGroups();
  if (fromGroupId === toGroupId) return existing;
  const sourceGroup = existing.find((g) => g.id === fromGroupId);
  if (!sourceGroup) return existing;

  const tabToMove = sourceGroup.tabs.find((t) => t.id === tabId);
  if (!tabToMove) return existing;

  const updated = existing
    .map((g) => {
      if (g.id === fromGroupId) {
        return { ...g, tabs: g.tabs.filter((t) => t.id !== tabId) };
      }
      if (g.id === toGroupId) {
        return { ...g, tabs: [...g.tabs, tabToMove] };
      }
      return g;
    })
    .filter((g) => g.tabs.length > 0);

  await persistGroups(updated);
  return updated;
}

/**
 * Moves multiple tabs to a destination group.
 * Automatically cleans up any group left with 0 tabs.
 */
export async function moveMultipleTabsToGroup(
  tabIds: string[],
  toGroupId: string,
): Promise<SavedTabGroup[]> {
  const existing = await getSavedGroups();
  if (tabIds.length === 0) return existing;
  const targetGroup = existing.find((g) => g.id === toGroupId);
  if (!targetGroup) return existing;

  const idSet = new Set(tabIds);
  const tabsToMove: SavedTab[] = [];

  for (const group of existing) {
    for (const tab of group.tabs) {
      if (idSet.has(tab.id)) {
        tabsToMove.push(tab);
      }
    }
  }

  const updated = existing
    .map((g) => {
      if (g.id === toGroupId) {
        const remainingInTarget = g.tabs.filter((t) => !idSet.has(t.id));
        return { ...g, tabs: [...remainingInTarget, ...tabsToMove] };
      }
      return {
        ...g,
        tabs: g.tabs.filter((t) => !idSet.has(t.id)),
      };
    })
    .filter((g) => g.tabs.length > 0);

  await persistGroups(updated);
  return updated;
}

/**
 * Deletes multiple tabs across groups.
 * Automatically cleans up any group left with 0 tabs.
 */
export async function deleteMultipleTabs(tabIds: string[]): Promise<SavedTabGroup[]> {
  const existing = await getSavedGroups();
  if (tabIds.length === 0) return existing;
  const idSet = new Set(tabIds);
  const updated = existing
    .map((g) => ({
      ...g,
      tabs: g.tabs.filter((t) => !idSet.has(t.id)),
    }))
    .filter((g) => g.tabs.length > 0);

  await persistGroups(updated);
  return updated;
}

/**
 * Deletes a single tab from a group.
 * Automatically cleans up any group left with 0 tabs.
 */
export async function deleteTabFromGroup(
  groupId: string,
  tabId: string,
): Promise<SavedTabGroup[]> {
  const existing = await getSavedGroups();
  const updated = existing
    .map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        tabs: group.tabs.filter((t) => t.id !== tabId),
      };
    })
    .filter((group) => group.tabs.length > 0);

  await persistGroups(updated);
  return updated;
}

/** Backward compatibility alias */
export const deleteTabFromSession = deleteTabFromGroup;

/**
 * Restores a single saved tab.
 * If a tab with the same normalized URL is already open, focuses it instead of opening a duplicate.
 */
export async function restoreTab(
  tab: SavedTab,
  removeAfterRestore = true,
  groupId?: string,
): Promise<{ restored: boolean; focusedExisting: boolean; updated: SavedTabGroup[] | null }> {
  let focusedExisting = false;

  if (typeof chrome !== "undefined" && chrome.tabs?.query) {
    try {
      const normTarget = normalizeUrlForDuplicateCheck(tab.url);
      const openTabs = (await chrome.tabs.query({})) || [];
      const existing = openTabs.find(
        (t) => t.url && normalizeUrlForDuplicateCheck(t.url) === normTarget,
      );

      if (existing && existing.id) {
        await chrome.tabs.update(existing.id, { active: true });
        if (existing.windowId) {
          await chrome.windows
            .update(existing.windowId, { focused: true })
            .catch(() => {});
        }
        focusedExisting = true;
      } else {
        await chrome.tabs.create({ url: tab.url, active: true });
      }
    } catch {
      await chrome.tabs.create({ url: tab.url, active: true });
    }
  } else {
    window.open(tab.url, "_blank", "noopener,noreferrer");
  }

  let updated: SavedTabGroup[] | null = null;
  if (removeAfterRestore && groupId) {
    updated = await deleteTabFromGroup(groupId, tab.id);
  }

  return { restored: true, focusedExisting, updated };
}

/**
 * Restores all tabs in a group.
 * Recreates Chrome Tab Groups if group metadata is present.
 * If a tab is already open, focuses it instead of opening a duplicate.
 */
export async function restoreGroup(
  groupId: string,
): Promise<{ restoredCount: number; focusedExistingCount: number }> {
  const existing = await getSavedGroups();
  const group = existing.find((g) => g.id === groupId);
  if (!group || group.tabs.length === 0) {
    return { restoredCount: 0, focusedExistingCount: 0 };
  }

  let restoredCount = 0;
  let focusedExistingCount = 0;

  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    const openTabs = (await chrome.tabs.query({})) || [];
    const openUrlMap = new Map<string, chrome.tabs.Tab>();
    for (const t of openTabs) {
      if (t.url) {
        openUrlMap.set(normalizeUrlForDuplicateCheck(t.url), t);
      }
    }

    const groupsMap = new Map<
      number,
      { tabIds: number[]; title?: string | null; color?: string | null }
    >();

    let firstFocusedTab: chrome.tabs.Tab | null = null;

    for (const tab of group.tabs) {
      try {
        const norm = normalizeUrlForDuplicateCheck(tab.url);
        const existingOpen = openUrlMap.get(norm);

        if (existingOpen && existingOpen.id) {
          focusedExistingCount++;
          if (!firstFocusedTab) {
            firstFocusedTab = existingOpen;
          }
        } else {
          const createdTab = await chrome.tabs.create({
            url: tab.url,
            active: false,
            pinned: tab.pinned ?? false,
          });

          if (createdTab.id) {
            restoredCount++;
            openUrlMap.set(norm, createdTab);

            if (tab.groupId && tab.groupId !== -1) {
              const groupEntry = groupsMap.get(tab.groupId) ?? {
                tabIds: [],
                title: tab.groupTitle,
                color: tab.groupColor,
              };
              groupEntry.tabIds.push(createdTab.id);
              groupsMap.set(tab.groupId, groupEntry);
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to restore tab ${tab.url}:`, err);
      }
    }

    if (firstFocusedTab && firstFocusedTab.id && restoredCount === 0) {
      await chrome.tabs.update(firstFocusedTab.id, { active: true }).catch(() => {});
      if (firstFocusedTab.windowId) {
        await chrome.windows
          .update(firstFocusedTab.windowId, { focused: true })
          .catch(() => {});
      }
    }

    if (chrome.tabs.group && chrome.tabGroups) {
      for (const [, groupData] of groupsMap) {
        if (groupData.tabIds.length > 0) {
          try {
            const chGroupId = await chrome.tabs.group({
              tabIds: groupData.tabIds as [number, ...number[]],
            });
            if (groupData.title || groupData.color) {
              await chrome.tabGroups.update(chGroupId, {
                title: groupData.title || undefined,
                color:
                  (groupData.color as Parameters<
                    typeof chrome.tabGroups.update
                  >[1]["color"]) || undefined,
              });
            }
          } catch (err) {
            console.warn("Failed to recreate tab group:", err);
          }
        }
      }
    }
  } else {
    for (const tab of group.tabs) {
      window.open(tab.url, "_blank", "noopener,noreferrer");
      restoredCount++;
    }
  }

  await deleteGroup(groupId);
  return { restoredCount, focusedExistingCount };
}

/** Backward compatibility alias */
export const restoreSession = restoreGroup;

/**
 * Clears all saved tab groups.
 */
export async function clearAllGroups(): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.remove(STORAGE_KEY);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Backward compatibility alias */
export const clearAllSessions = clearAllGroups;
