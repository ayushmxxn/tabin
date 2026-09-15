import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { INITIAL_DOCK_IDS, INITIAL_ITEMS, SPACES } from '@/data/mockBookmarks';
import { DEFAULT_WALLPAPER_CONFIG } from '@/data/wallpapers';
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
  dockMagnification: true,
  dockScale: 48,
  searchEngine: 'google',
};

interface LaunchpadState {
  spaces: Space[];
  activeSpaceIndex: number;
  items: LaunchpadItem[];
  dockIds: string[];
  openFolderId: string | null;
  isSearchOpen: boolean;
  searchQuery: string;

  // Wallpaper & Settings
  wallpaper: WallpaperConfig;
  settings: LaunchpadSettings;
  isSettingsOpen: boolean;
  isAddModalOpen: boolean;

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
    accent?: AccentToken;
    addToDock?: boolean;
  }) => void;
  addFolder: (params: {
    title: string;
    spaceId?: string;
    itemIds?: string[];
    accent?: AccentToken;
  }) => void;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<LaunchpadItem>) => void;

  // Folders
  openFolder: (id: string) => void;
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

export const useLaunchpadStore = create<LaunchpadState>()(
  persist(
    (set, get) => ({
      spaces: SPACES,
      activeSpaceIndex: 0,
      items: INITIAL_ITEMS,
      dockIds: INITIAL_DOCK_IDS,
      openFolderId: null,
      isSearchOpen: false,
      searchQuery: '',

      wallpaper: DEFAULT_WALLPAPER_CONFIG,
      settings: DEFAULT_SETTINGS,
      isSettingsOpen: false,
      isAddModalOpen: false,

      setActiveSpaceIndex: (index) => {
        const clamped = Math.min(Math.max(index, 0), get().spaces.length - 1);
        set({ activeSpaceIndex: clamped, openFolderId: null });
      },
      goToNextSpace: () => {
        const { activeSpaceIndex, spaces } = get();
        if (activeSpaceIndex < spaces.length - 1) {
          set({ activeSpaceIndex: activeSpaceIndex + 1, openFolderId: null });
        }
      },
      goToPrevSpace: () => {
        const { activeSpaceIndex } = get();
        if (activeSpaceIndex > 0) {
          set({ activeSpaceIndex: activeSpaceIndex - 1, openFolderId: null });
        }
      },

      moveItem: (id, position) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, position } : item,
          ),
        }));
      },

      addShortcut: ({ title, url, spaceId, accent = 'violet', addToDock = false }) => {
        const targetSpaceId = spaceId ?? (get().spaces[get().activeSpaceIndex]?.id ?? 'space-home');
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
          folderId: null,
          accent,
        };
        set((state) => ({
          items: [...state.items, newItem],
          dockIds: addToDock ? [...state.dockIds, id] : state.dockIds,
        }));
      },

      addFolder: ({ title, spaceId, itemIds = [], accent = 'violet' }) => {
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
        };
        set((state) => {
          const updatedItems = state.items.map((item) =>
            itemIds.includes(item.id) ? { ...item, folderId: id } : item,
          );
          return { items: [...updatedItems, newFolder] };
        });
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id && item.folderId !== id),
          dockIds: state.dockIds.filter((dockId) => dockId !== id),
          openFolderId: state.openFolderId === id ? null : state.openFolderId,
        }));
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? ({ ...item, ...updates } as LaunchpadItem) : item,
          ),
        }));
      },

      openFolder: (id) => set({ openFolderId: id }),
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
          openFolderId: null,
          isSearchOpen: false,
          searchQuery: '',
          isSettingsOpen: false,
          isAddModalOpen: false,
        });
      },
    }),
    {
      name: 'launchpad-storage',
      storage: createJSONStorage(() => localStorage),
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

/** Resolved dock items, in stored order. */
export function selectDockItems(items: LaunchpadItem[], dockIds: string[]) {
  return dockIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is LaunchpadItem => Boolean(item));
}

/** Every shortcut across every space + folder, for global search. */
export function selectAllShortcuts(items: LaunchpadItem[]) {
  return items.filter((item): item is Extract<LaunchpadItem, { type: 'shortcut' }> =>
    item.type === 'shortcut',
  );
}
