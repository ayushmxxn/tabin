import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Tile } from '../shortcut/Tile';
import { useLaunchpadStore, selectFolderChildren } from '@/store/useLaunchpadStore';
import type { FolderItem } from '@/types';

/**
 * The expanded view of an open folder — a centered glass panel that
 * shares a layoutId with its canvas tile, so opening/closing reads as
 * one continuous shape morphing rather than a modal popping in.
 */
export function FolderOverlay() {
  const openFolderId = useLaunchpadStore((state) => state.openFolderId);
  const items = useLaunchpadStore((state) => state.items);
  const closeFolder = useLaunchpadStore((state) => state.closeFolder);

  const folder = items.find(
    (item): item is FolderItem => item.type === 'folder' && item.id === openFolderId,
  );

  useEffect(() => {
    if (!folder) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFolder();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [folder, closeFolder]);

  const children = folder ? selectFolderChildren(items, folder) : [];

  return (
    <AnimatePresence>
      {folder && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={closeFolder}
        >
          <motion.div
            layoutId={`folder-tile-${folder.id}`}
            className="w-[min(90vw,32rem)] rounded-[24px] border border-white/15 bg-white/[0.09] p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-6 text-center text-body font-medium text-white/90">{folder.title}</h2>
            <div className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-5">
              {children.map((child) =>
                child.type === 'shortcut' ? (
                  <button
                    key={child.id}
                    className="flex flex-col items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
                    onClick={() => window.open(child.url, '_blank', 'noopener,noreferrer')}
                  >
                    <Tile title={child.title} url={child.url} accent={child.accent} size="md" />
                    <span className="max-w-[4.75rem] truncate text-center text-caption font-normal text-white/80">
                      {child.title}
                    </span>
                  </button>
                ) : null,
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
