import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Shortcut } from '../shortcut/Shortcut';
import {
  useLaunchpadStore,
  selectFolderChildren,
} from '@/store/useLaunchpadStore';
import { useCanvasGrid, resolveItemPosition, PAGE_ROWS } from '@/lib/layout';
import type { FolderItem, LaunchpadItem, ShortcutItem } from '@/types';

/**
 * The main canvas surface for the active destination (Home or Folder).
 * When viewing Home, it renders shortcuts in dynamic screens with page capacity.
 * When a screen completely fills up, icons spill over to the second screen.
 * When viewing a folder, it renders nested shortcuts and subfolders with breadcrumb navigation.
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
  const setAddModalOpen = useLaunchpadStore((state) => state.setAddModalOpen);

  const { columns } = useCanvasGrid(canvasRef, gridColumns);

  const activeFolder = openFolderId
    ? items.find((item): item is FolderItem => item.type === 'folder' && item.id === openFolderId)
    : null;

  const isFolderActive = Boolean(activeFolder);

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
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [ctxMenu]);

  // Native document-level contextmenu listener — avoids the React e.target vs
  // e.currentTarget mismatch caused by the inner motion.div covering the canvas.
  // Shortcuts already call e.stopPropagation(), so only true empty-space clicks
  // reach the document listener within the canvas bounds.
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Only handle events within the canvas
      if (!canvasRef.current?.contains(target)) return;

      // If the click is on/inside any interactive Tabin element, let it be
      // (Shortcut handles its own contextmenu and stops propagation; this
      // handles folder buttons and any other interactive descendants)
      if (
        target.closest('[data-tile-id]') ||
        target.closest('[data-folder-item]') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input')
      ) {
        return;
      }

      // Empty canvas space — take over
      e.preventDefault();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuW = 184;
      const menuH = 44;
      const x = Math.min(e.clientX, vw - menuW - 8);
      const y = Math.min(e.clientY, vh - menuH - 8);
      setCtxMenu({ x, y });
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const displayItems: LaunchpadItem[] = activeFolder
    ? selectFolderChildren(items, activeFolder)
    : items.filter(
        (item): item is ShortcutItem => item.type === 'shortcut' && item.folderId === null,
      );

  const pageSize = columns * PAGE_ROWS;
  const totalPages = isFolderActive ? 1 : Math.max(1, Math.ceil(displayItems.length / pageSize));
  const safePageIndex = isFolderActive ? 0 : Math.min(Math.max(activePageIndex, 0), totalPages - 1);

  useEffect(() => {
    if (!isFolderActive && activePageIndex !== safePageIndex) {
      setActivePageIndex(safePageIndex);
    }
  }, [isFolderActive, activePageIndex, safePageIndex, setActivePageIndex]);

  const pageItems = isFolderActive
    ? displayItems
    : displayItems.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);

  const prevPageRef = useRef(safePageIndex);
  const pageDirection = safePageIndex >= prevPageRef.current ? 1 : -1;
  useEffect(() => {
    prevPageRef.current = safePageIndex;
  }, [safePageIndex]);

  const destinationKey = activeFolder ? `folder-${activeFolder.id}` : `screen-${safePageIndex}`;

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
          initial={
            isFolderActive
              ? { opacity: 1 }
              : { opacity: 0, x: pageDirection * 40 }
          }
          animate={{ opacity: 1, x: 0 }}
          exit={
            isFolderActive
              ? { opacity: 0, transition: { duration: 0.18 } }
              : { opacity: 0, x: pageDirection * -40, transition: { duration: 0.18 } }
          }
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {pageItems.map((item, pageItemIndex) => {
            const position = resolveItemPosition(item, pageItemIndex, columns);
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <button
                    type="button"
                    data-folder-item
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
