import { useEffect, useRef, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Shortcut } from '../shortcut/Shortcut';
import {
  useLaunchpadStore,
  selectFolderChildren,
} from '@/store/useLaunchpadStore';
import { useCanvasGrid, resolveItemPosition, PAGE_ROWS } from '@/lib/layout';
import { cn } from '@/lib/utils';
import type { FolderItem, LaunchpadItem, ShortcutItem } from '@/types';

/**
 * The main canvas surface for the active destination (Home or Folder).
 * In Embeds mode:
 * - Shows a maximum of 3 rows of shortcuts at a time.
 * - Paginates additional shortcuts into 3-row pages.
 * - Supports pagination dots and mouse wheel scrolling over the Embed area.
 * - Keeps the current page and transitions between pages smoothly.
 */
export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const items = useLaunchpadStore((state) => state.items);
  const gridColumns = useLaunchpadStore((state) => state.settings?.gridColumns ?? 'auto');
  const openFolderId = useLaunchpadStore((state) => state.openFolderId);
  const openFolder = useLaunchpadStore((state) => state.openFolder);
  const folderOrigin = useLaunchpadStore((state) => state.folderOrigin);
  const closeFolder = useLaunchpadStore((state) => state.closeFolder);
  const activePageIndex = useLaunchpadStore((state) => state.activePageIndex);
  const setActivePageIndex = useLaunchpadStore((state) => state.setActivePageIndex);
  const folderPageIndex = useLaunchpadStore((state) => state.folderPageIndex);
  const setFolderPageIndex = useLaunchpadStore((state) => state.setFolderPageIndex);
  const setAddModalOpen = useLaunchpadStore((state) => state.setAddModalOpen);
  const isSearchOpen = useLaunchpadStore((state) => state.isSearchOpen);
  const isSettingsOpen = useLaunchpadStore((state) => state.isSettingsOpen);
  const isAddModalOpen = useLaunchpadStore((state) => state.isAddModalOpen);
  const spaces = useLaunchpadStore((state) => state.spaces);
  const activeSpaceIndex = useLaunchpadStore((state) => state.activeSpaceIndex);
  const spacesEnabled = useLaunchpadStore((state) => state.settings?.spacesEnabled ?? false);
  const activeSpace = spaces[activeSpaceIndex] ?? spaces[0] ?? { id: 'space-home', name: 'Home' };

  const shortcutStyle = useLaunchpadStore((state) => state.settings?.shortcutStyle ?? 'icons');
  const activeFolder = openFolderId
    ? items.find((item): item is FolderItem => item.type === 'folder' && item.id === openFolderId)
    : null;

  const isFolderActive = Boolean(activeFolder);
  const isEmbedMode = shortcutStyle === 'embeds';

  const { columns, containerWidth, containerHeight } = useCanvasGrid(canvasRef, gridColumns, isEmbedMode);

  // Canvas right-click context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Escape navigates to parent folder or Home
  useEffect(() => {
    if (!openFolderId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activeFolder?.folderId) {
          openFolder(activeFolder.folderId);
        } else {
          closeFolder();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openFolderId, activeFolder, closeFolder, openFolder]);

  // Dismiss canvas context menu on outside click or Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ctxMenuRef.current?.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [ctxMenu]);

  // Native document-level contextmenu listener and touch long-press on empty canvas
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (
        target.closest('[data-tile-id]') ||
        target.closest('[data-folder-item]') ||
        target.closest('[data-dock]') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('[role="dialog"]') ||
        target.closest('[data-modal]')
      ) {
        return;
      }

      e.preventDefault();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuW = 184;
      const menuH = 44;
      const x = Math.min(e.clientX, vw - menuW - 8);
      const y = Math.min(e.clientY, vh - menuH - 8);
      setCtxMenu({ x, y });
    };

    const canvasEl = canvasRef.current;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let touchOrigin: { x: number; y: number } | null = null;

    const onPointerDownCanvas = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('[data-tile-id]') ||
        target?.closest('[data-folder-item]') ||
        target?.closest('[data-dock]') ||
        target?.closest('button') ||
        target?.closest('a') ||
        target?.closest('input') ||
        target?.closest('[role="dialog"]') ||
        target?.closest('[data-modal]')
      ) {
        return;
      }
      touchOrigin = { x: e.clientX, y: e.clientY };
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const menuW = 184;
        const menuH = 44;
        const x = Math.min(e.clientX, vw - menuW - 8);
        const y = Math.min(e.clientY, vh - menuH - 8);
        setCtxMenu({ x, y });
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch {}
        }
      }, 500);
    };

    const onPointerMoveCanvas = (e: PointerEvent) => {
      if (touchOrigin && longPressTimer) {
        const dist = Math.hypot(e.clientX - touchOrigin.x, e.clientY - touchOrigin.y);
        if (dist > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
    };

    const onPointerUpCanvas = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    if (canvasEl) {
      canvasEl.addEventListener('pointerdown', onPointerDownCanvas);
      canvasEl.addEventListener('pointermove', onPointerMoveCanvas);
      canvasEl.addEventListener('pointerup', onPointerUpCanvas);
      canvasEl.addEventListener('pointercancel', onPointerUpCanvas);
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      if (canvasEl) {
        canvasEl.removeEventListener('pointerdown', onPointerDownCanvas);
        canvasEl.removeEventListener('pointermove', onPointerMoveCanvas);
        canvasEl.removeEventListener('pointerup', onPointerUpCanvas);
        canvasEl.removeEventListener('pointercancel', onPointerUpCanvas);
      }
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  }, []);

  const displayItems = useMemo<LaunchpadItem[]>(() => {
    return activeFolder
      ? selectFolderChildren(items, activeFolder)
      : items.filter(
          (item): item is ShortcutItem =>
            item.type === 'shortcut' &&
            item.folderId === null &&
            (!spacesEnabled || (item.spaceId || 'space-home') === activeSpace.id),
        );
  }, [items, activeFolder, spacesEnabled, activeSpace.id]);

  // Show a maximum of 3 rows of shortcuts at a time. Never allow grid to exceed 3 rows.
  const maxRows = PAGE_ROWS; // 3 rows
  const pageSize = Math.max(1, columns * maxRows);
  const totalPages = Math.max(1, Math.ceil(displayItems.length / pageSize));

  const currentPageIndex = isFolderActive ? folderPageIndex : activePageIndex;
  const setCurrentPageIndex = isFolderActive ? setFolderPageIndex : setActivePageIndex;
  const safePageIndex = Math.min(Math.max(currentPageIndex, 0), totalPages - 1);

  // Sync state if bounds change
  useEffect(() => {
    if (currentPageIndex !== safePageIndex) {
      setCurrentPageIndex(safePageIndex);
    }
  }, [currentPageIndex, safePageIndex, setCurrentPageIndex]);

  // Strictly slice display items so that at most 3 rows are rendered per page
  const pageItems = displayItems.slice(
    safePageIndex * pageSize,
    (safePageIndex + 1) * pageSize,
  );

  const prevPageRef = useRef(safePageIndex);
  const pageDirection = safePageIndex >= prevPageRef.current ? 1 : -1;
  useEffect(() => {
    prevPageRef.current = safePageIndex;
  }, [safePageIndex]);

  // Mouse wheel navigation over the Embed area to switch pages smoothly
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || totalPages <= 1) return;

    let isThrottled = false;
    let accumulatedDelta = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[role="dialog"]') || target?.closest?.('[data-modal]')) return;

      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 8) return;

      e.preventDefault();
      accumulatedDelta += delta;

      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        accumulatedDelta = 0;
      }, 200);

      if (isThrottled) return;

      const threshold = 30;
      if (accumulatedDelta > threshold) {
        if (safePageIndex < totalPages - 1) {
          isThrottled = true;
          accumulatedDelta = 0;
          setCurrentPageIndex(safePageIndex + 1);
          setTimeout(() => {
            isThrottled = false;
          }, 280);
        }
      } else if (accumulatedDelta < -threshold) {
        if (safePageIndex > 0) {
          isThrottled = true;
          accumulatedDelta = 0;
          setCurrentPageIndex(safePageIndex - 1);
          setTimeout(() => {
            isThrottled = false;
          }, 280);
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [totalPages, safePageIndex, setCurrentPageIndex]);

  // Touch swipe navigation over the canvas to switch pages smoothly on touch devices
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || totalPages <= 1) return;

    let startX = 0;
    let startY = 0;
    let isTracking = false;
    let isSwipeThrottled = false;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[role="dialog"]') || target?.closest?.('[data-modal]')) return;
      if (e.touches.length === 1) {
        startX = e.touches[0]!.clientX;
        startY = e.touches[0]!.clientY;
        isTracking = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isTracking || isSwipeThrottled || e.changedTouches.length === 0) {
        isTracking = false;
        return;
      }
      isTracking = false;
      const endX = e.changedTouches[0]!.clientX;
      const endY = e.changedTouches[0]!.clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;

      // Detect prominent horizontal swipe gesture
      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
        if (diffX < 0 && safePageIndex < totalPages - 1) {
          isSwipeThrottled = true;
          setCurrentPageIndex(safePageIndex + 1);
          setTimeout(() => {
            isSwipeThrottled = false;
          }, 280);
        } else if (diffX > 0 && safePageIndex > 0) {
          isSwipeThrottled = true;
          setCurrentPageIndex(safePageIndex - 1);
          setTimeout(() => {
            isSwipeThrottled = false;
          }, 280);
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [totalPages, safePageIndex, setCurrentPageIndex]);

  // Keyboard left/right arrow navigation
  useEffect(() => {
    if (isSearchOpen || isSettingsOpen || isAddModalOpen || totalPages <= 1) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && safePageIndex < totalPages - 1) {
        setCurrentPageIndex(safePageIndex + 1);
      }
      if (e.key === 'ArrowLeft' && safePageIndex > 0) {
        setCurrentPageIndex(safePageIndex - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSearchOpen, isSettingsOpen, isAddModalOpen, totalPages, safePageIndex, setCurrentPageIndex]);

  const destinationKey = activeFolder
    ? `folder-${activeFolder.id}-page-${safePageIndex}`
    : `space-${spacesEnabled ? activeSpace.id : "all"}-screen-${safePageIndex}`;

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (ctxMenu) {
      setCtxMenu(null);
      return;
    }
    if (isFolderActive && e.target === e.currentTarget) {
      if (activeFolder?.folderId) {
        openFolder(activeFolder.folderId);
      } else {
        closeFolder();
      }
    }
  };

  return (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="pointer-events-auto relative h-full w-full select-none overflow-visible"
    >
      <AnimatePresence initial={false} mode="wait" custom={pageDirection}>
        <motion.div
          key={destinationKey}
          custom={pageDirection}
          className="absolute inset-0 overflow-visible"
          initial={{ opacity: 0, x: pageDirection * 48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: pageDirection * -48, transition: { duration: 0.18 } }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {pageItems.length === 0 && !isFolderActive && (
            <div className="flex h-full w-full flex-col items-center justify-center pointer-events-none select-none">
              <div className="flex flex-col items-center text-center max-w-sm px-6 py-8 rounded-2xl bg-[#141414]/60 border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 mb-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                </div>
                <h3 className="text-[14px] font-medium text-white/90">
                  {spacesEnabled ? `${activeSpace.name} Space is empty` : "No shortcuts yet"}
                </h3>
                <p className="mt-1 text-[12px] text-white/40 leading-relaxed">
                  {spacesEnabled
                    ? "Add shortcuts to this space, or switch back to Home below."
                    : "Add your favorite websites to get started."}
                </p>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="mt-4 pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add shortcut</span>
                </button>
              </div>
            </div>
          )}

          {pageItems.map((item, pageItemIndex) => {
            const position = resolveItemPosition(item, pageItemIndex, columns, isEmbedMode, containerWidth, containerHeight);
            const globalIndex = isFolderActive ? pageItemIndex : safePageIndex * pageSize + pageItemIndex;

            if (item.type === 'folder') {
              return (
                <motion.div
                  key={item.id}
                  layout
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <button
                    type="button"
                    data-folder-item
                    data-folder-id={item.id}
                    onClick={() => openFolder(item.id)}
                    onContextMenu={(e) => e.stopPropagation()}
                    className="flex w-16 flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/20 shadow-lg select-none backdrop-blur-md transition-all"
                      style={{ backgroundColor: `${item.color || '#50B1FD'}28` }}
                    >
                      <span className="text-2xl">📁</span>
                    </div>
                    <span className="max-w-[4.75rem] truncate text-center text-[11px] font-normal tracking-tight text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">
                      {item.title}
                    </span>
                  </button>
                </motion.div>
              );
            }

            return (
              <Shortcut
                key={item.id}
                item={item}
                position={position}
                canvasRef={canvasRef}
                columns={columns}
                index={pageItemIndex}
                globalIndex={globalIndex}
                isFolderView={isFolderActive}
                folderOrigin={folderOrigin}
              />
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Canvas right-click context menu */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            key="canvas-context-menu"
            ref={ctxMenuRef}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
            className="w-46 overflow-hidden rounded-xl border border-white/15 bg-[#141414]/96 p-1 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.75)] backdrop-blur-2xl select-none"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              onClick={() => {
                setCtxMenu(null);
                setAddModalOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] text-white/90 text-left cursor-pointer hover:bg-white/10 transition-colors"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/60 shrink-0"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Create new shortcut</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
