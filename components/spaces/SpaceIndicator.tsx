import { cn } from '@/lib/utils';
import { useLaunchpadStore, selectFolderChildren } from '@/store/useLaunchpadStore';
import { useColumns, PAGE_ROWS } from '@/lib/layout';
import type { FolderItem, LaunchpadItem, ShortcutItem } from '@/types';

/**
 * Clean, modern pagination indicator positioned directly above the Spaces bar / Dock.
 * - Shows when totalPages > 1 for the active space or open folder.
 * - Clicking a dot switches immediately to that 3-row page.
 * - Features high-contrast, polished styling ensuring visibility across all wallpapers.
 */
export function SpaceIndicator({ standalone = false }: { standalone?: boolean }) {
  const items = useLaunchpadStore((state) => state.items);
  const openFolderId = useLaunchpadStore((state) => state.openFolderId);
  const activePageIndex = useLaunchpadStore((state) => state.activePageIndex);
  const setActivePageIndex = useLaunchpadStore((state) => state.setActivePageIndex);
  const folderPageIndex = useLaunchpadStore((state) => state.folderPageIndex);
  const setFolderPageIndex = useLaunchpadStore((state) => state.setFolderPageIndex);
  const spaces = useLaunchpadStore((state) => state.spaces);
  const activeSpaceIndex = useLaunchpadStore((state) => state.activeSpaceIndex);
  const spacesEnabled = useLaunchpadStore(
    (state) => state.settings?.spacesEnabled ?? false,
  );
  const gridColumns = useLaunchpadStore(
    (state) => state.settings?.gridColumns ?? 'auto',
  );
  const shortcutStyle = useLaunchpadStore(
    (state) => state.settings?.shortcutStyle ?? 'icons',
  );
  const isEmbedMode = shortcutStyle === 'embeds';

  const activeSpace = spaces[activeSpaceIndex] ?? spaces[0] ?? { id: 'space-home', name: 'Home' };
  const activeFolder = openFolderId
    ? items.find((item): item is FolderItem => item.type === 'folder' && item.id === openFolderId)
    : null;

  const isFolderActive = Boolean(activeFolder);

  // Resolved list of shortcuts for current view (Space or Folder)
  const displayItems = activeFolder
    ? selectFolderChildren(items, activeFolder)
    : items.filter(
        (item): item is ShortcutItem =>
          item.type === 'shortcut' &&
          item.folderId === null &&
          (!spacesEnabled || (item.spaceId || 'space-home') === activeSpace.id),
      );

  const columns = useColumns(gridColumns, isEmbedMode);
  const maxRows = PAGE_ROWS; // Strictly 3 rows
  const pageSize = Math.max(1, columns * maxRows);
  const totalPages = Math.max(1, Math.ceil(displayItems.length / pageSize));

  const currentPage = isFolderActive ? folderPageIndex : activePageIndex;
  const setCurrentPage = isFolderActive ? setFolderPageIndex : setActivePageIndex;
  const safePage = Math.min(Math.max(currentPage, 0), totalPages - 1);

  // If standalone but spaces are enabled, SpaceSwitcher renders it at the top of the spaces toggle
  if (standalone && spacesEnabled) return null;

  // Only show pagination dots when more than 1 page is required
  if (totalPages <= 1) return null;

  const dots = (
    <div className="pointer-events-auto flex items-center gap-1.5 py-0.5">
      {Array.from({ length: totalPages }).map((_, index) => {
        const isActive = index === safePage;
        return (
          <button
            key={index}
            type="button"
            aria-label={`Go to page ${index + 1}`}
            aria-current={isActive}
            title={`Page ${index + 1} of ${totalPages}`}
            onClick={() => setCurrentPage(index)}
            className="p-1 cursor-pointer group/dot focus:outline-none flex items-center justify-center transition-transform hover:scale-125"
          >
            <span
              className={cn(
                "block rounded-full transition-all duration-200",
                isActive
                  ? "w-2 h-2 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
                  : "w-2 h-2 bg-white/40 group-hover/dot:bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.6)]",
              )}
            />
          </button>
        );
      })}
    </div>
  );

  if (standalone) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-20 flex justify-center select-none">
        {dots}
      </div>
    );
  }

  return dots;
}

