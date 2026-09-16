import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';
import { useColumns, PAGE_ROWS } from '@/lib/layout';

export function SpaceIndicator() {
  const items = useLaunchpadStore((state) => state.items);
  const openFolderId = useLaunchpadStore((state) => state.openFolderId);
  const activePageIndex = useLaunchpadStore((state) => state.activePageIndex);
  const setActivePageIndex = useLaunchpadStore((state) => state.setActivePageIndex);
  const goToNextPage = useLaunchpadStore((state) => state.goToNextPage);
  const goToPrevPage = useLaunchpadStore((state) => state.goToPrevPage);
  const isSearchOpen = useLaunchpadStore((state) => state.isSearchOpen);
  const isSettingsOpen = useLaunchpadStore((state) => state.isSettingsOpen);
  const isAddModalOpen = useLaunchpadStore((state) => state.isAddModalOpen);

  const columns = useColumns();
  const pageSize = columns * PAGE_ROWS;

  const topLevelShortcuts = items.filter(
    (item) => item.type === 'shortcut' && item.folderId === null,
  );
  const totalPages = Math.max(1, Math.ceil(topLevelShortcuts.length / pageSize));

  // Keyboard navigation
  useEffect(() => {
    if (isSearchOpen || openFolderId !== null || isSettingsOpen || isAddModalOpen) return;
    if (totalPages <= 1) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goToNextPage(totalPages);
      if (event.key === 'ArrowLeft') goToPrevPage();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [totalPages, isSearchOpen, openFolderId, isSettingsOpen, isAddModalOpen, goToNextPage, goToPrevPage]);

  // Mouse wheel navigation:
  // Wheel down / scroll right -> next screen (active dot moves to the right)
  // Wheel up / scroll left -> prev screen (active dot moves to the left)
  useEffect(() => {
    if (isSearchOpen || openFolderId !== null || isSettingsOpen || isAddModalOpen) return;
    if (totalPages <= 1) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let accumulatedDelta = 0;

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[role="dialog"]') || target?.closest?.('[data-modal]')) return;

      const primaryDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(primaryDelta) < 10) return;

      accumulatedDelta += primaryDelta;

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        accumulatedDelta = 0;
      }, 250);

      if (accumulatedDelta > 35) {
        accumulatedDelta = 0;
        goToNextPage(totalPages);
      } else if (accumulatedDelta < -35) {
        accumulatedDelta = 0;
        goToPrevPage();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [totalPages, isSearchOpen, openFolderId, isSettingsOpen, isAddModalOpen, goToNextPage, goToPrevPage]);

  // Only show dots when available space on screen gets completely filled (multiple pages exist)
  if (openFolderId !== null || totalPages <= 1) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-24 z-20 flex justify-center gap-1.5">
      {Array.from({ length: totalPages }).map((_, index) => (
        <button
          key={index}
          aria-label={`Go to screen ${index + 1}`}
          aria-current={index === activePageIndex}
          onClick={() => setActivePageIndex(index)}
          className="p-1.5 cursor-pointer"
        >
          <span
            className={cn(
              'block h-1.5 w-1.5 rounded-full transition-all duration-200',
              index === activePageIndex
                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] scale-125'
                : 'bg-white/30 hover:bg-white/50',
            )}
          />
        </button>
      ))}
    </div>
  );
}
