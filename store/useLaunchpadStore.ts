import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { INITIAL_DOCK_IDS, INITIAL_ITEMS, SPACES } from '@/data/mockBookmarks';
import { DEFAULT_WALLPAPER_CONFIG } from '@/data/wallpapers';
import { DEFAULT_FOLDER_COLOR } from '@/lib/folderColors';
import type {
  AccentToken,
  FolderItem,
  LaunchpadItem,
  LaunchpadSettings,
  Position,
  ShortcutItem,
  Space,
  WallpaperConfig,
} from '@/types';

export const DEFAULT_SETTINGS: LaunchpadSettings = {
  gridColumns: 'auto',
  iconScale: 'standard',
  dockMagnification: false,
  dockScale: 48,
  searchEngine: 'google',
};

export interface DeletionRecord {
  id: string;
  item: LaunchpadItem;
  containedItems?: LaunchpadItem[];
  parentFolderId?: string | null;
  parentFolderIndex?: number;
  originalItemIndex?: number;
  dockIndex?: number;
  timestamp: number;
}

interface LaunchpadState {
  spaces: Space[];
  activeSpaceIndex: number;
  items: LaunchpadItem[];
  dockIds: string[];
  openFolderId: string | null;
  activeShortcutMenuId: string | null;
  setActiveShortcutMenuId: (id: string | null) => void;
  hoveredShortcutId: string | null;
  setHoveredShortcutId: (id: string | null) => void;
  isSearchOpen: boolean;
  searchQuery: string;

  // Deletion & Undo
  deletionHistory: DeletionRecord[];
  lastRestoredTitle: string | null;
  isUndoToastVisible: boolean;
  undoLastDeletion: () => boolean;
  dismissUndoToast: () => void;
  clearRestoredNotice: () => void;

  // Wallpaper & Settings
  wallpaper: WallpaperConfig;
  settings: LaunchpadSettings;
  isSettingsOpen: boolean;
  isAddModalOpen: boolean;

  // Drag over dock target
  dragOverFolderId: string | null;
  setDragOverFolderId: (id: string | null) => void;

  // Pages & Navigation
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
  goToNextPage: (maxPages?: number) => void;
  goToPrevPage: () => void;

  // Spaces
  setActiveSpaceIndex: (index: number) => void;
  goToNextSpace: () => void;
  goToPrevSpace: () => void;

  // Canvas items
  moveItem: (id: string, position: Position) => void;
  addShortcut: (params: {
    title: string;
    url: string;
    spaceId?: string;
    folderId?: string | null;
    accent?: AccentToken;
    addToDock?: boolean;
    customIcon?: string | null;
  }) => string;
  addFolder: (params: {
    title: string;
    spaceId?: string;
    itemIds?: string[];
    accent?: AccentToken;
    color?: string;
  }) => string;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<LaunchpadItem>) => void;
  moveToFolder: (shortcutId: string, folderId: string | null) => void;
  reorderCanvasItems: (fromId: string, targetIndex: number) => void;
  importBookmarksBatch: (
    parsedItems: Array<{
      title: string;
      url: string;
      folderPath?: string[];
      folderName?: string | null;
    }>,
    options: { skipDuplicates: boolean; mergeFolders: boolean },
  ) => { importedShortcuts: number; importedFolders: number };
  restoreBackup: (backup: {
    items: LaunchpadItem[];
    dockIds?: string[];
    settings?: Partial<LaunchpadSettings>;
    wallpaper?: Partial<WallpaperConfig>;
  }) => boolean;

  // Folders
  folderOrigin: { x: number; y: number } | null;
  openFolder: (id: string, origin?: { x: number; y: number }) => void;
  closeFolder: () => void;

  // Dock
  reorderDock: (nextOrder: string[]) => void;

  // Search
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Modals & Preferences
  setWallpaper: (config: Partial<WallpaperConfig>) => void;
  updateSettings: (updates: Partial<LaunchpadSettings>) => void;
  setSettingsOpen: (open: boolean) => void;
  setAddModalOpen: (open: boolean) => void;
  resetToDefaults: () => void;
}

const dualStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const result = await chrome.storage.local.get(name);
        if (result && result[name]) {
          return typeof result[name] === 'string' ? result[name] : JSON.stringify(result[name]);
        }
      } catch {}
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const localVal = localStorage.getItem(name);
        if (localVal && typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set({ [name]: localVal }).catch(() => {});
        }
        return localVal;
      } catch {}
    }
    return null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(name, value);
      } catch {}
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        await chrome.storage.local.set({ [name]: value });
      } catch {}
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(name);
      } catch {}
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        await chrome.storage.local.remove(name);
      } catch {}
    }
  },
};

export const useLaunchpadStore = create<LaunchpadState>()(
  persist(
    (set, get) => ({
      spaces: SPACES,
      activeSpaceIndex: 0,
      items: INITIAL_ITEMS,
      dockIds: INITIAL_DOCK_IDS,
      openFolderId: null,
      activeShortcutMenuId: null,
      setActiveShortcutMenuId: (id) => set({ activeShortcutMenuId: id }),
      hoveredShortcutId: null,
      setHoveredShortcutId: (id) => set({ hoveredShortcutId: id }),
      isSearchOpen: false,
      searchQuery: '',

      // Deletion & Undo
      deletionHistory: [],
      lastRestoredTitle: null,
      isUndoToastVisible: false,

      wallpaper: DEFAULT_WALLPAPER_CONFIG,
      settings: DEFAULT_SETTINGS,
      isSettingsOpen: false,
      isAddModalOpen: false,

      dragOverFolderId: null,
      setDragOverFolderId: (id) => set({ dragOverFolderId: id }),

      activePageIndex: 0,
      setActivePageIndex: (index) =>
        set({ activePageIndex: Math.max(0, index), activeSpaceIndex: Math.max(0, index), openFolderId: null }),
      goToNextPage: (maxPages) => {
        const { activePageIndex } = get();
        if (maxPages === undefined || activePageIndex < maxPages - 1) {
          const next = activePageIndex + 1;
          set({ activePageIndex: next, activeSpaceIndex: next, openFolderId: null });
        }
      },
      goToPrevPage: () => {
        const { activePageIndex } = get();
        if (activePageIndex > 0) {
          const prev = activePageIndex - 1;
          set({ activePageIndex: prev, activeSpaceIndex: prev, openFolderId: null });
        }
      },

      setActiveSpaceIndex: (index) => {
        const clamped = Math.max(0, index);
        set({ activeSpaceIndex: clamped, activePageIndex: clamped, openFolderId: null });
      },
      goToNextSpace: () => get().goToNextPage(),
      goToPrevSpace: () => get().goToPrevPage(),

      moveItem: (id, position) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, position } : item,
          ),
        }));
      },

      addShortcut: ({ title, url, spaceId, folderId, accent = 'violet', addToDock = false, customIcon }) => {
        const targetSpaceId = spaceId ?? (get().spaces[get().activeSpaceIndex]?.id ?? 'space-home');
        const targetFolderId = folderId !== undefined ? folderId : get().openFolderId;
        const id = `shortcut-${Date.now()}`;
        const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
          ? url
          : `https://${url}`;
        const newItem: ShortcutItem = {
          id,
          type: 'shortcut',
          title: title.trim() || 'Bookmark',
          url: normalizedUrl,
          spaceId: targetSpaceId,
          folderId: targetFolderId,
          accent,
          ...(customIcon != null ? { customIcon } : {}),
        };
        set((state) => {
          let updatedItems = [...state.items, newItem];
          if (targetFolderId) {
            updatedItems = updatedItems.map((item) => {
              if (item.type === 'folder' && item.id === targetFolderId) {
                return {
                  ...item,
                  itemIds: item.itemIds.includes(id) ? item.itemIds : [...item.itemIds, id],
                };
              }
              return item;
            });
          }
          return {
            items: updatedItems,
            dockIds: addToDock ? [...state.dockIds, id] : state.dockIds,
          };
        });
        return id;
      },

      addFolder: ({
        title,
        spaceId,
        itemIds = [],
        accent = 'blue',
        color = DEFAULT_FOLDER_COLOR,
      }) => {
        const targetSpaceId = spaceId ?? (get().spaces[get().activeSpaceIndex]?.id ?? 'space-home');
        const id = `folder-${Date.now()}`;
        const newFolder: FolderItem = {
          id,
          type: 'folder',
          title: title.trim() || 'New Folder',
          spaceId: targetSpaceId,
          folderId: null,
          itemIds,
          accent,
          color,
        };
        set((state) => {
          const updatedItems = state.items.map((item) =>
            itemIds.includes(item.id) ? { ...item, folderId: id } : item,
          );
          return {
            items: [...updatedItems, newFolder],
            dockIds: [...state.dockIds, id],
          };
        });
        return id;
      },

      deleteItem: (id) => {
        const state = get();
        const targetItem = state.items.find((item) => item.id === id);
        if (!targetItem) return;

        const originalItemIndex = state.items.findIndex((item) => item.id === id);
        const dockIndex = state.dockIds.indexOf(id);

        let containedItems: LaunchpadItem[] | undefined;
        let parentFolderId: string | null = null;
        let parentFolderIndex: number = -1;

        if (targetItem.type === 'folder') {
          containedItems = state.items.filter(
            (item) => item.folderId === id || targetItem.itemIds.includes(item.id),
          );
        } else if (targetItem.folderId) {
          parentFolderId = targetItem.folderId;
          const parentFolder = state.items.find(
            (i): i is FolderItem => i.type === 'folder' && i.id === parentFolderId,
          );
          if (parentFolder) {
            parentFolderIndex = parentFolder.itemIds.indexOf(id);
          }
        }

        const record: DeletionRecord = {
          id,
          item: targetItem,
          containedItems,
          parentFolderId,
          parentFolderIndex,
          originalItemIndex,
          dockIndex: dockIndex !== -1 ? dockIndex : undefined,
          timestamp: Date.now(),
        };

        set((currentState) => ({
          deletionHistory: [...currentState.deletionHistory.slice(-19), record],
          lastRestoredTitle: null,
          isUndoToastVisible: true,
          items: currentState.items
            .filter((item) => item.id !== id && item.folderId !== id)
            .map((item) =>
              item.type === 'folder' && item.itemIds.includes(id)
                ? { ...item, itemIds: item.itemIds.filter((childId) => childId !== id) }
                : item,
            ),
          dockIds: currentState.dockIds.filter((dockId) => dockId !== id),
          openFolderId: currentState.openFolderId === id ? null : currentState.openFolderId,
          activeShortcutMenuId:
            currentState.activeShortcutMenuId === id ? null : currentState.activeShortcutMenuId,
          hoveredShortcutId:
            currentState.hoveredShortcutId === id ? null : currentState.hoveredShortcutId,
        }));
      },

      undoLastDeletion: () => {
        const { deletionHistory } = get();
        const record = deletionHistory[deletionHistory.length - 1];
        if (!record) return false;

        const nextHistory = deletionHistory.slice(0, -1);

        set((state) => {
          const restoredItems = [...state.items];

          // 1. Re-insert target item
          if (
            record.originalItemIndex !== undefined &&
            record.originalItemIndex >= 0 &&
            record.originalItemIndex <= restoredItems.length
          ) {
            restoredItems.splice(record.originalItemIndex, 0, record.item);
          } else {
            restoredItems.push(record.item);
          }

          // 2. If it was a folder, restore any contained child items
          if (record.containedItems && record.containedItems.length > 0) {
            for (const child of record.containedItems) {
              if (!restoredItems.some((i) => i.id === child.id)) {
                restoredItems.push(child);
              }
            }
          }

          // 3. If item belonged to a parent folder, re-add into parentFolder's itemIds
          let finalItems = restoredItems;
          if (record.parentFolderId) {
            finalItems = finalItems.map((item) => {
              if (item.id === record.parentFolderId && item.type === 'folder') {
                if (!item.itemIds.includes(record.id)) {
                  const nextItemIds = [...item.itemIds];
                  if (
                    record.parentFolderIndex !== undefined &&
                    record.parentFolderIndex >= 0 &&
                    record.parentFolderIndex <= nextItemIds.length
                  ) {
                    nextItemIds.splice(record.parentFolderIndex, 0, record.id);
                  } else {
                    nextItemIds.push(record.id);
                  }
                  return { ...item, itemIds: nextItemIds };
                }
              }
              return item;
            });
          }

          // 4. If it was in dock, restore into dockIds
          const nextDockIds = [...state.dockIds];
          if (record.dockIndex !== undefined && !nextDockIds.includes(record.id)) {
            if (record.dockIndex >= 0 && record.dockIndex <= nextDockIds.length) {
              nextDockIds.splice(record.dockIndex, 0, record.id);
            } else {
              nextDockIds.push(record.id);
            }
          }

          return {
            deletionHistory: nextHistory,
            items: finalItems,
            dockIds: nextDockIds,
            lastRestoredTitle: record.item.title,
            isUndoToastVisible: true,
          };
        });

        return true;
      },

      dismissUndoToast: () => {
        set({ isUndoToastVisible: false, lastRestoredTitle: null });
      },

      clearRestoredNotice: () => {
        set({ lastRestoredTitle: null });
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? ({ ...item, ...updates } as LaunchpadItem) : item,
          ),
        }));
      },

      moveToFolder: (shortcutId, folderId) => {
        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.id === shortcutId) {
              return { ...item, folderId };
            }
            if (item.type === 'folder') {
              const isTarget = item.id === folderId;
              const alreadyHas = item.itemIds.includes(shortcutId);
              if (isTarget && !alreadyHas) {
                return { ...item, itemIds: [...item.itemIds, shortcutId] };
              }
              if (!isTarget && alreadyHas) {
                return { ...item, itemIds: item.itemIds.filter((id) => id !== shortcutId) };
              }
            }
            return item;
          });
          return { items: updatedItems };
        });
      },

      reorderCanvasItems: (fromId, targetIndex) => {
        const { openFolderId, items, spaces, activeSpaceIndex } = get();

        if (openFolderId) {
          const folder = items.find(
            (item): item is FolderItem => item.type === 'folder' && item.id === openFolderId,
          );
          if (!folder) return;
          const currentIndex = folder.itemIds.indexOf(fromId);
          if (currentIndex === -1) return;
          const clampedTarget = Math.min(Math.max(targetIndex, 0), folder.itemIds.length - 1);

          const nextItemIds = [...folder.itemIds];
          const [movedId] = nextItemIds.splice(currentIndex, 1);
          if (movedId) {
            nextItemIds.splice(clampedTarget, 0, movedId);
          }

          set({
            items: items.map((item) => {
              if (item.id === openFolderId) {
                return { ...item, itemIds: nextItemIds };
              }
              if (item.position) {
                const { position: _pos, ...cleanItem } = item;
                return cleanItem as LaunchpadItem;
              }
              return item;
            }),
          });
        } else {
          const activeSpace = spaces[activeSpaceIndex] ?? spaces[0];
          if (!activeSpace) return;

          const spaceShortcuts = items.filter(
            (item): item is ShortcutItem =>
              item.folderId === null && item.spaceId === activeSpace.id && item.type === 'shortcut',
          );
          const currentIndex = spaceShortcuts.findIndex((item) => item.id === fromId);
          if (currentIndex === -1) return;
          const clampedTarget = Math.min(Math.max(targetIndex, 0), spaceShortcuts.length - 1);

          const nextSpaceShortcuts = [...spaceShortcuts];
          const [movedItem] = nextSpaceShortcuts.splice(currentIndex, 1);
          if (movedItem) {
            nextSpaceShortcuts.splice(clampedTarget, 0, movedItem);
          }

          let spaceIndex = 0;
          const newItems = items.map((item) => {
            if (item.folderId === null && item.spaceId === activeSpace.id && item.type === 'shortcut') {
              const replacement = nextSpaceShortcuts[spaceIndex++] ?? item;
              const { position: _pos, ...cleanItem } = replacement;
              return cleanItem as LaunchpadItem;
            }
            if (item.position) {
              const { position: _pos, ...cleanItem } = item;
              return cleanItem as LaunchpadItem;
            }
            return item;
          });

          set({ items: newItems });
        }
      },

      importBookmarksBatch: (parsedItems, options) => {
        const { items, dockIds } = get();

        const existingUrls = new Set<string>();
        for (const item of items) {
          if (item.type === 'shortcut' && item.url) {
            existingUrls.add(item.url.toLowerCase());
          }
        }

        // Map existing folders by hierarchy key: `${parentId ?? 'root'}::${titleLower}`
        const existingHierarchyMap = new Map<string, FolderItem>();
        for (const item of items) {
          if (item.type === 'folder') {
            const key = `${item.folderId ?? 'root'}::${item.title.trim().toLowerCase()}`;
            existingHierarchyMap.set(key, item);
          }
        }

        const newShortcuts: ShortcutItem[] = [];
        const newFolders: FolderItem[] = [];
        const activeFolderRegistry = new Map<string, FolderItem>();
        const modifiedExistingFolders = new Map<string, FolderItem>();
        const newRootDockIds: string[] = [];
        const addedUrlsInBatch = new Set<string>();

        let shortcutCounter = 0;
        let folderCounter = 0;

        for (const parsed of parsedItems) {
          const urlLower = parsed.url.toLowerCase();

          if (options.skipDuplicates) {
            if (existingUrls.has(urlLower) || addedUrlsInBatch.has(urlLower)) {
              continue;
            }
          }

          // Resolve nested folder hierarchy
          let currentParentId: string | null = null;
          const folderPath =
            parsed.folderPath && parsed.folderPath.length > 0
              ? parsed.folderPath
              : parsed.folderName
              ? [parsed.folderName]
              : [];

          for (let depth = 0; depth < folderPath.length; depth++) {
            const rawTitle = folderPath[depth]?.trim();
            if (!rawTitle) continue;
            const titleLower = rawTitle.toLowerCase();
            const hierarchyKey: string = `${currentParentId ?? 'root'}::${titleLower}`;

            let resolvedFolderId: string | null = null;

            if (activeFolderRegistry.has(hierarchyKey)) {
              resolvedFolderId = activeFolderRegistry.get(hierarchyKey)!.id;
            } else if (options.mergeFolders && existingHierarchyMap.has(hierarchyKey)) {
              const existing =
                modifiedExistingFolders.get(existingHierarchyMap.get(hierarchyKey)!.id) ||
                existingHierarchyMap.get(hierarchyKey)!;
              resolvedFolderId = existing.id;
              activeFolderRegistry.set(hierarchyKey, existing);
            } else {
              const newFid = `folder-import-${Date.now()}-${folderCounter++}-${Math.random().toString(36).slice(2, 6)}`;
              const newFolderItem: FolderItem = {
                id: newFid,
                type: 'folder',
                title: rawTitle,
                spaceId: 'space-home',
                folderId: currentParentId,
                itemIds: [],
                accent: 'blue',
                color: DEFAULT_FOLDER_COLOR,
              };

              newFolders.push(newFolderItem);
              activeFolderRegistry.set(hierarchyKey, newFolderItem);

              if (currentParentId) {
                // Link child folder to parent folder's itemIds
                const parentInNew = newFolders.find((f) => f.id === currentParentId);
                if (parentInNew) {
                  if (!parentInNew.itemIds.includes(newFid)) {
                    parentInNew.itemIds.push(newFid);
                  }
                } else {
                  const parentInExisting =
                    modifiedExistingFolders.get(currentParentId) ||
                    items.find((f): f is FolderItem => f.id === currentParentId);
                  if (parentInExisting) {
                    const updated = {
                      ...parentInExisting,
                      itemIds: [...parentInExisting.itemIds, newFid],
                    };
                    modifiedExistingFolders.set(currentParentId, updated);
                  }
                }
              } else {
                newRootDockIds.push(newFid);
              }

              resolvedFolderId = newFid;
            }

            currentParentId = resolvedFolderId;
          }

          const shortcutId = `shortcut-import-${Date.now()}-${shortcutCounter++}-${Math.random().toString(36).slice(2, 6)}`;
          const newShortcut: ShortcutItem = {
            id: shortcutId,
            type: 'shortcut',
            title: parsed.title || 'Bookmark',
            url: parsed.url,
            spaceId: 'space-home',
            folderId: currentParentId,
            accent: 'violet',
          };

          newShortcuts.push(newShortcut);
          addedUrlsInBatch.add(urlLower);

          if (currentParentId) {
            const folderInNew = newFolders.find((f) => f.id === currentParentId);
            if (folderInNew) {
              folderInNew.itemIds.push(shortcutId);
            } else {
              const folderInExisting =
                modifiedExistingFolders.get(currentParentId) ||
                items.find((f): f is FolderItem => f.id === currentParentId);
              if (folderInExisting) {
                const updated = {
                  ...folderInExisting,
                  itemIds: [...folderInExisting.itemIds, shortcutId],
                };
                modifiedExistingFolders.set(currentParentId, updated);
              }
            }
          }
        }

        let updatedItems = items.map((item) => {
          if (item.type === 'folder' && modifiedExistingFolders.has(item.id)) {
            return modifiedExistingFolders.get(item.id)!;
          }
          return item;
        });

        updatedItems = [...updatedItems, ...newFolders, ...newShortcuts];

        const updatedDockIds = [...dockIds];
        for (const rid of newRootDockIds) {
          if (!updatedDockIds.includes(rid)) {
            updatedDockIds.push(rid);
          }
        }

        set({
          items: updatedItems,
          dockIds: updatedDockIds,
        });

        return {
          importedShortcuts: newShortcuts.length,
          importedFolders: newFolders.length,
        };
      },

      restoreBackup: (backup) => {
        if (!backup || !Array.isArray(backup.items)) return false;
        set((state) => ({
          items: backup.items,
          dockIds: Array.isArray(backup.dockIds) ? backup.dockIds : state.dockIds,
          settings: backup.settings
            ? { ...state.settings, ...(backup.settings as Partial<LaunchpadSettings>) }
            : state.settings,
          wallpaper: backup.wallpaper
            ? { ...state.wallpaper, ...(backup.wallpaper as Partial<WallpaperConfig>) }
            : state.wallpaper,
        }));
        return true;
      },

      folderOrigin: null,
      openFolder: (id, origin) => set({ openFolderId: id, folderOrigin: origin ?? null }),
      closeFolder: () => set({ openFolderId: null }),

      reorderDock: (nextOrder) => set({ dockIds: nextOrder }),

      setSearchOpen: (open) =>
        set((state) => ({
          isSearchOpen: open,
          searchQuery: open ? state.searchQuery : '',
        })),
      setSearchQuery: (query) => set({ searchQuery: query }),

      setWallpaper: (config) =>
        set((state) => ({
          wallpaper: { ...state.wallpaper, ...config },
        })),

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setAddModalOpen: (open) => set({ isAddModalOpen: open }),

      resetToDefaults: () => {
        set({
          spaces: SPACES,
          items: INITIAL_ITEMS,
          dockIds: INITIAL_DOCK_IDS,
          wallpaper: DEFAULT_WALLPAPER_CONFIG,
          settings: DEFAULT_SETTINGS,
          activeSpaceIndex: 0,
          activePageIndex: 0,
          openFolderId: null,
          activeShortcutMenuId: null,
          hoveredShortcutId: null,
          isSearchOpen: false,
          searchQuery: '',
          isSettingsOpen: false,
          isAddModalOpen: false,
          dragOverFolderId: null,
          deletionHistory: [],
          lastRestoredTitle: null,
          isUndoToastVisible: false,
        });
      },
    }),
    {
      name: 'launchpad-storage',
      storage: createJSONStorage(() => dualStorageAdapter),
      partialize: (state) => ({
        spaces: state.spaces,
        items: state.items,
        dockIds: state.dockIds,
        wallpaper: state.wallpaper,
        settings: state.settings,
      }),
    },
  ),
);

/**
 * Synchronizes store state when external updates occur (e.g. from background service worker).
 */
export function syncStoreFromExternal(data: unknown) {
  if (!data) return;
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const incomingState = (parsed as { state?: Partial<LaunchpadState> })?.state || (parsed as Partial<LaunchpadState>);
    if (incomingState && Array.isArray(incomingState.items)) {
      useLaunchpadStore.setState((current) => ({
        ...current,
        items: incomingState.items ?? current.items,
        dockIds: incomingState.dockIds ?? current.dockIds,
        spaces: incomingState.spaces ?? current.spaces,
      }));
    }
  } catch (err) {
    console.warn('Failed to sync Tabin store from external update:', err);
  }
}

// --- Derived selectors -----------------------------------------------

/** Top-level items (shortcuts + folders) belonging to a given space. */
export function selectSpaceItems(items: LaunchpadItem[], spaceId: string) {
  return items.filter((item) => item.folderId === null && item.spaceId === spaceId);
}

/** Resolved child shortcuts for an open folder, in stored order. */
export function selectFolderChildren(items: LaunchpadItem[], folder: FolderItem) {
  return folder.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is LaunchpadItem => Boolean(item));
}

/** Resolved dock folders, in stored order. Falls back to all available folders if dockIds has no folders. */
export function selectDockFolders(items: LaunchpadItem[], dockIds: string[]): FolderItem[] {
  const rootFolders = items.filter(
    (item): item is FolderItem => item.type === 'folder' && item.folderId === null,
  );
  const folderMap = new Map(rootFolders.map((f) => [f.id, f]));
  const ordered = dockIds
    .map((id) => folderMap.get(id))
    .filter((f): f is FolderItem => Boolean(f));

  const unlisted = rootFolders.filter((f) => !dockIds.includes(f.id));
  const result = [...ordered, ...unlisted];
  return result.length > 0 ? result : rootFolders;
}

/** Resolved dock items, in stored order. */
export function selectDockItems(items: LaunchpadItem[], dockIds: string[]): FolderItem[] {
  return selectDockFolders(items, dockIds);
}

/** Every shortcut across every space + folder, for global search. */
export function selectAllShortcuts(items: LaunchpadItem[]) {
  return items.filter((item): item is Extract<LaunchpadItem, { type: 'shortcut' }> =>
    item.type === 'shortcut',
  );
}
