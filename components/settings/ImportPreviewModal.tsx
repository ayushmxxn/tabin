import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ParsedImportResult } from '@/lib/bookmarkParser';

interface ImportPreviewModalProps {
  isOpen: boolean;
  result: ParsedImportResult | null;
  onClose: () => void;
  onConfirm: (options: { skipDuplicates: boolean; mergeFolders: boolean }) => void;
}

const FORMAT_LABELS: Record<string, string> = {
  html: 'HTML Bookmarks',
  json: 'JSON Backup',
  csv: 'CSV Spreadsheet',
  text: 'Plain-Text URL List',
  chrome: 'Chrome Bookmarks',
};

export function ImportPreviewModal({
  isOpen,
  result,
  onClose,
  onConfirm,
}: ImportPreviewModalProps) {
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [mergeFolders, setMergeFolders] = useState(true);

  if (!isOpen || !result) return null;

  const toImportCount = skipDuplicates
    ? Math.max(0, result.totalCount - result.duplicateCount)
    : result.totalCount;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="relative w-full max-w-[520px] overflow-hidden rounded-[20px] border border-white/12 bg-[#161616]/98 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="text-[16px] font-semibold text-white/90">
                Import Bookmarks Preview
              </h3>
              <p className="text-[12px] text-white/50 mt-0.5">
                Detected format:{' '}
                <span className="font-medium text-white/80">
                  {FORMAT_LABELS[result.format] || result.format.toUpperCase()}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Counts Overview Grid */}
          <div className="grid grid-cols-3 gap-2.5 my-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
              <span className="block text-[20px] font-bold text-white">
                {result.totalCount}
              </span>
              <span className="text-[11px] text-white/50">Bookmarks Found</span>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
              <span className="block text-[20px] font-bold text-sky-400">
                {result.folderNames.length}
              </span>
              <span className="text-[11px] text-white/50">Folders</span>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
              <span className="block text-[20px] font-bold text-amber-400">
                {result.duplicateCount}
              </span>
              <span className="text-[11px] text-white/50">Already Exist</span>
            </div>
          </div>

          {result.invalidCount > 0 && (
            <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-300">
              Filtered out {result.invalidCount} invalid or unsupported URLs.
            </div>
          )}

          {/* Sample Bookmarks Preview */}
          <div className="mb-4">
            <span className="block text-[11px] font-medium text-white/50 mb-1.5">
              Preview ({Math.min(5, result.items.length)} of {result.totalCount})
            </span>
            <div className="max-h-[130px] overflow-y-auto rounded-xl border border-white/8 bg-black/30 p-2 space-y-1.5">
              {result.items.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-white/85">
                      {item.title}
                    </span>
                    <span className="block truncate text-[10px] text-white/40">
                      {item.url}
                    </span>
                  </div>
                  {(item.folderPath && item.folderPath.length > 0) || item.folderName ? (
                    <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                      📁 {item.folderPath && item.folderPath.length > 0 ? item.folderPath.join(' › ') : item.folderName}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Options Toggles */}
          <div className="space-y-2 mb-6 border-t border-white/10 pt-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="pr-4">
                <span className="block text-[12px] font-medium text-white/85">
                  Skip Duplicates
                </span>
                <span className="block text-[11px] text-white/45">
                  Avoid re-adding bookmarks that already exist on your canvas
                </span>
              </div>
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 accent-[#FA1E76] cursor-pointer"
              />
            </label>

            {result.folderNames.length > 0 && (
              <label className="flex items-center justify-between cursor-pointer pt-2">
                <div className="pr-4">
                  <span className="block text-[12px] font-medium text-white/85">
                    Merge Into Existing Folders
                  </span>
                  <span className="block text-[11px] text-white/45">
                    Add bookmarks into existing folders if titles match
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={mergeFolders}
                  onChange={(e) => setMergeFolders(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 accent-[#FA1E76] cursor-pointer"
                />
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-4 py-2 text-[12px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={toImportCount === 0}
              onClick={() => onConfirm({ skipDuplicates, mergeFolders })}
              className="rounded-xl bg-[#FA1E76] px-5 py-2 text-[12px] font-medium text-white shadow-lg shadow-[#FA1E76]/25 hover:bg-[#FA1E76]/90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {toImportCount} Bookmark{toImportCount === 1 ? '' : 's'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
