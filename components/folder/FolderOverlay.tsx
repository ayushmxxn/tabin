import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Tile } from '../shortcut/Tile';
import { ShortcutEmbedTile } from '../shortcut/ShortcutEmbedTile';
import { useLaunchpadStore, selectFolderChildren } from '@/store/useLaunchpadStore';
import { openShortcutUrl } from '@/lib/utils';
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
  const openLinks = useLaunchpadStore((state) => state.settings?.openLinks ?? 'newTab');
  const shortcutStyle = useLaunchpadStore((state) => state.settings?.shortcutStyle ?? 'icons');
  const isEmbedMode = shortcutStyle === 'embeds';

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
            className={
              isEmbedMode
                ? "w-[min(92vw,44rem)] max-h-[85vh] overflow-y-auto touch-pan-y no-scrollbar rounded-[24px] border border-white/15 bg-white/[0.09] p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
                : "w-[min(90vw,32rem)] rounded-[24px] border border-white/15 bg-white/[0.09] p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-6 text-center text-body font-medium text-white/90">{folder.title}</h2>
            {isEmbedMode ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {children.map((child) =>
                  child.type === 'shortcut' ? (
                    <button
                      key={child.id}
                      type="button"
                      className="cursor-pointer text-left transition-opacity hover:opacity-90 active:opacity-80"
                      onClick={() => openShortcutUrl(child.url, openLinks)}
                    >
                      <ShortcutEmbedTile item={child} />
                    </button>
                  ) : null,
                )}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-5">
                {children.map((child) =>
                  child.type === 'shortcut' ? (
                    <button
                      key={child.id}
                      className="flex flex-col items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                      onClick={() => openShortcutUrl(child.url, openLinks)}
                    >
                      <Tile title={child.title} url={child.url} accent={child.accent} size="md" />
                      <span className="max-w-[4.75rem] truncate text-center text-caption font-normal text-white/80">
                        {child.title}
                      </span>
                    </button>
                  ) : null,
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
