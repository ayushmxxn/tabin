import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';

export function UndoToast() {
  const deletionHistory = useLaunchpadStore((state) => state.deletionHistory) || [];
  const isUndoToastVisible = useLaunchpadStore((state) => state.isUndoToastVisible);
  const lastRestoredTitle = useLaunchpadStore((state) => state.lastRestoredTitle);
  const undoLastDeletion = useLaunchpadStore((state) => state.undoLastDeletion);
  const dismissUndoToast = useLaunchpadStore((state) => state.dismissUndoToast);
  const clearRestoredNotice = useLaunchpadStore((state) => state.clearRestoredNotice);

  const [isMac, setIsMac] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    }
  }, []);

  // Global Ctrl+Z / Cmd+Z listener (with input protection)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const active = document.activeElement;
        const target = e.target as HTMLElement | null;
        const isEditingText =
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA' ||
          target?.isContentEditable ||
          active?.tagName === 'INPUT' ||
          active?.tagName === 'TEXTAREA' ||
          (active as HTMLElement | null)?.isContentEditable;

        if (isEditingText) return;

        const history = useLaunchpadStore.getState().deletionHistory;
        if (Array.isArray(history) && history.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          useLaunchpadStore.getState().undoLastDeletion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  const lastDeleted = Array.isArray(deletionHistory) && deletionHistory.length > 0
    ? deletionHistory[deletionHistory.length - 1]
    : null;

  // Auto-dismiss countdown timer
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (lastRestoredTitle) {
      timerRef.current = setTimeout(() => {
        clearRestoredNotice();
        dismissUndoToast();
      }, 2400);
    } else if (isUndoToastVisible && lastDeleted) {
      timerRef.current = setTimeout(() => {
        dismissUndoToast();
      }, 6000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isUndoToastVisible, lastDeleted?.timestamp, lastRestoredTitle, dismissUndoToast, clearRestoredNotice]);

  const showToast = isUndoToastVisible && (Boolean(lastRestoredTitle) || Boolean(lastDeleted));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
      <AnimatePresence mode="wait">
        {showToast && (
          <motion.div
            key={lastRestoredTitle ? `restored-${lastRestoredTitle}` : `deleted-${lastDeleted?.id ?? 'none'}`}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-[#141414]/94 px-3.5 py-2 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.75)] backdrop-blur-2xl select-none"
          >
            {lastRestoredTitle ? (
              // Restored Success View
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-[12px] font-medium text-white/90">
                  Restored <span className="font-semibold text-white">"{lastRestoredTitle}"</span>
                </span>
              </div>
            ) : lastDeleted ? (
              // Deleted Item Undo View
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/40 shrink-0"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  <span className="text-[12px] text-white/80 truncate max-w-[180px]">
                    Deleted <span className="font-semibold text-white">"{lastDeleted.item?.title ?? 'Item'}"</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => undoLastDeletion()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#FA1E76] hover:bg-[#ff3086] active:bg-[#e01666] px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_2px_10px_rgba(250,30,118,0.35)] transition-all cursor-pointer"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 14 4 9l5-5" />
                      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
                    </svg>
                    <span>Undo</span>
                  </button>

                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-white/50 bg-white/[0.08] rounded border border-white/10">
                    {isMac ? '⌘Z' : 'Ctrl+Z'}
                  </kbd>

                  <button
                    type="button"
                    onClick={() => dismissUndoToast()}
                    aria-label="Dismiss"
                    className="flex h-5 w-5 items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
