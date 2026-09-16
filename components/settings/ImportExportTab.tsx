import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';
import { processImportSource, type ParsedImportResult } from '@/lib/bookmarkParser';
import {
  exportToHtml,
  exportToJson,
  exportToCsv,
  exportToText,
  downloadFile,
} from '@/lib/bookmarkExporter';

type ExportFormat = 'html' | 'json' | 'csv' | 'txt';

interface ConfirmState {
  bookmarkCount: number;
  folderCount: number;
  duplicateCount: number;
  isBackup: boolean;
  parseResult: ParsedImportResult;
  source: 'file' | 'chrome';
  fileName?: string;
}

type IconName = 'import' | 'chrome' | 'html' | 'json' | 'csv' | 'txt';

function TabinIcon({
  name,
  size = 18,
  className = '',
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  switch (name) {
    case 'import':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M3.5 12.5v3a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-3" />
          <path d="M10 3.5v9" />
          <path d="M6.5 9.5L10 13l3.5-3.5" />
        </svg>
      );
    case 'chrome':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="10" cy="10" r="7.5" />
          <circle cx="10" cy="10" r="3" />
          <path d="M10 7h6.9" />
          <path d="M12.6 11.5l-3.44 5.95" />
          <path d="M7.4 11.5L3.96 5.55" />
        </svg>
      );
    case 'html':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M6 6.5L2.5 10 6 13.5" />
          <path d="M14 6.5l3.5 3.5-3.5 3.5" />
          <path d="M11.5 4.5l-3 11" />
        </svg>
      );
    case 'json':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M7.5 4.5c-1.5 0-2 .8-2 2v2c0 .8-.6 1.5-1.5 1.5.9 0 1.5.7 1.5 1.5v2c0 1.2.5 2 2 2" />
          <path d="M12.5 4.5c1.5 0 2 .8 2 2v2c0 .8.6 1.5 1.5 1.5-.9 0-1.5.7-1.5 1.5v2c0 1.2-.5 2-2 2" />
          <circle cx="10" cy="8" r="0.85" fill="currentColor" stroke="none" />
          <circle cx="10" cy="12" r="0.85" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'csv':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <rect x="3" y="3.5" width="14" height="13" rx="2" />
          <path d="M3 8h14" />
          <path d="M8 8v8.5" />
          <path d="M13 8v8.5" />
        </svg>
      );
    case 'txt':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M4.5 2.5h7l4 4V16a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 3 16V4a1.5 1.5 0 0 1 1.5-1.5z" />
          <path d="M11.5 2.5v4h4" />
          <path d="M6.5 10.5h7" />
          <path d="M6.5 13.5h4" />
        </svg>
      );
  }
}

const EXPORT_FORMATS: {
  id: ExportFormat;
  label: string;
  note: string;
  ext: string;
  mime: string;
}[] = [
  {
    id: 'html',
    label: 'HTML',
    note: 'Import into Chrome, Firefox, Safari',
    ext: 'html',
    mime: 'text/html',
  },
  {
    id: 'json',
    label: 'JSON backup',
    note: 'Restore full Tabin workspace',
    ext: 'json',
    mime: 'application/json',
  },
  {
    id: 'csv',
    label: 'CSV',
    note: 'Open in any spreadsheet app',
    ext: 'csv',
    mime: 'text/csv',
  },
  {
    id: 'txt',
    label: 'Plain text',
    note: 'One URL per line',
    ext: 'txt',
    mime: 'text/plain',
  },
];

export function ImportExportTab() {
  const items = useLaunchpadStore((s) => s.items);
  const dockIds = useLaunchpadStore((s) => s.dockIds);
  const wallpaper = useLaunchpadStore((s) => s.wallpaper);
  const settings = useLaunchpadStore((s) => s.settings);
  const importBookmarksBatch = useLaunchpadStore((s) => s.importBookmarksBatch);
  const restoreBackup = useLaunchpadStore((s) => s.restoreBackup);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isChromeLoading, setIsChromeLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3200);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) { showToast(false, 'File is empty.'); return; }
      try {
        const result = processImportSource(text, items, file.name);
        if (result.totalCount === 0 && !result.rawTabinBackup) {
          showToast(false, 'No valid bookmarks found.');
          return;
        }
        setConfirmState({
          bookmarkCount: result.totalCount,
          folderCount: result.folderNames.length,
          duplicateCount: result.duplicateCount,
          isBackup: Boolean(result.rawTabinBackup?.items.length),
          parseResult: result,
          source: 'file',
          fileName: file.name,
        });
      } catch {
        showToast(false, 'Could not parse this file.');
      }
    };
    reader.onerror = () => showToast(false, 'Failed to read file.');
    reader.readAsText(file);
  };

  const handleImportFromChrome = async () => {
    setIsChromeLoading(true);
    try {
      if (typeof chrome === 'undefined' || !chrome.bookmarks) {
        if (chrome?.permissions?.request) {
          const granted = await chrome.permissions.request({ permissions: ['bookmarks'] });
          if (!granted) { showToast(false, 'Permission was not granted.'); setIsChromeLoading(false); return; }
        } else {
          showToast(false, 'Chrome Bookmarks API is unavailable.'); setIsChromeLoading(false); return;
        }
      }
      chrome.bookmarks.getTree((tree) => {
        setIsChromeLoading(false);
        if (!tree?.length) { showToast(false, 'No bookmarks found.'); return; }
        const result = processImportSource(tree, items, 'chrome.json', 'chrome');
        if (result.totalCount === 0) { showToast(false, 'No bookmarks found.'); return; }
        setConfirmState({
          bookmarkCount: result.totalCount,
          folderCount: result.folderNames.length,
          duplicateCount: result.duplicateCount,
          isBackup: false,
          parseResult: result,
          source: 'chrome',
        });
      });
    } catch {
      setIsChromeLoading(false);
      showToast(false, 'Could not access Chrome bookmarks.');
    }
  };

  const handleConfirm = () => {
    if (!confirmState) return;
    setIsImporting(true);
    try {
      if (confirmState.isBackup && confirmState.parseResult.rawTabinBackup) {
        restoreBackup(confirmState.parseResult.rawTabinBackup as any);
        const count = confirmState.parseResult.rawTabinBackup.items.length;
        showToast(true, `Workspace restored — ${count} items.`);
      } else {
        const { importedShortcuts, importedFolders } = importBookmarksBatch(
          confirmState.parseResult.items,
          { skipDuplicates: true, mergeFolders: true },
        );
        let msg = `${importedShortcuts} bookmark${importedShortcuts === 1 ? '' : 's'} added`;
        if (importedFolders > 0) msg += ` · ${importedFolders} folder${importedFolders === 1 ? '' : 's'}`;
        showToast(true, msg);
      }
    } finally {
      setIsImporting(false);
      setConfirmState(null);
    }
  };

  const handleExport = (format: ExportFormat) => {
    const date = new Date().toISOString().slice(0, 10);
    const opt = EXPORT_FORMATS.find((o) => o.id === format)!;
    let content = '';
    switch (format) {
      case 'html': content = exportToHtml(items); break;
      case 'json': content = exportToJson({ items, dockIds, settings, wallpaper }); break;
      case 'csv': content = exportToCsv(items); break;
      case 'txt': content = exportToText(items); break;
    }
    downloadFile(content, `Tabin-${format === 'json' ? 'backup' : 'bookmarks'}-${date}.${opt.ext}`, opt.mime);
  };

  const shortcutCount = items.filter((i) => i.type === 'shortcut').length;
  const folderCount = items.filter((i) => i.type === 'folder').length;
  const newCount = confirmState ? Math.max(0, confirmState.bookmarkCount - confirmState.duplicateCount) : 0;

  return (
    <div className="flex flex-col gap-0">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`mb-5 inline-flex w-fit max-w-[calc(100%-2.5rem)] items-center gap-2 rounded-lg px-3 py-2.5 text-[11.5px] font-medium leading-none ${
              toast.ok
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-red-500/[0.09] text-red-300/90'
            }`}
          >
            <span className="shrink-0 text-[13px]">{toast.ok ? '✓' : '✕'}</span>
            <span className="truncate">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.json,.csv,.txt"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ''; }}
        className="hidden"
      />

      {/* ── Import ────────────────────────────────── */}
      <section className="mb-6">
        <p className="mb-2.5 text-[11px] font-medium text-white/50">Import</p>

        <AnimatePresence mode="wait">
          {confirmState ? (
            /* Confirmation panel */
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              {/* Source */}
              <div className="flex items-center gap-2 mb-3.5">
                <TabinIcon
                  name={confirmState.source === 'chrome' ? 'chrome' : 'import'}
                  size={15}
                  className="shrink-0 text-white/50"
                />
                <span className="text-[11px] text-white/40 font-medium truncate max-w-[220px]">
                  {confirmState.source === 'chrome' ? 'Chrome bookmarks' : (confirmState.fileName ?? 'File')}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-end gap-6 mb-1">
                <div>
                  <span className="block text-[26px] font-semibold tracking-tight leading-none text-white">
                    {confirmState.isBackup ? (confirmState.parseResult.rawTabinBackup?.items.length ?? 0) : newCount}
                  </span>
                  <span className="text-[10.5px] text-white/35 mt-1 block">
                    {confirmState.isBackup ? 'items' : 'new bookmarks'}
                  </span>
                </div>
                {!confirmState.isBackup && confirmState.folderCount > 0 && (
                  <div>
                    <span className="block text-[26px] font-semibold tracking-tight leading-none text-white/55">
                      {confirmState.folderCount}
                    </span>
                    <span className="text-[10.5px] text-white/35 mt-1 block">
                      folder{confirmState.folderCount === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="mt-3 mb-4 space-y-1">
                {confirmState.folderCount > 0 && !confirmState.isBackup && (
                  <p className="text-[11px] text-white/35">Folder structure will be preserved.</p>
                )}
                {confirmState.duplicateCount > 0 && !confirmState.isBackup && (
                  <p className="text-[11px] text-white/25">
                    {confirmState.duplicateCount} duplicate{confirmState.duplicateCount === 1 ? '' : 's'} will be skipped.
                  </p>
                )}
                {confirmState.isBackup && (
                  <p className="text-[11px] text-amber-300/50">Replaces your current workspace.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isImporting || (!confirmState.isBackup && newCount === 0)}
                  className="rounded-lg bg-[#FA1E76] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-[0_2px_12px_rgba(250,30,118,0.3)] hover:bg-[#ff3086] active:bg-[#e01666] disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none transition-all cursor-pointer"
                >
                  {isImporting ? 'Importing…' : confirmState.isBackup ? 'Restore workspace' : 'Add to Tabin'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmState(null)}
                  className="rounded-lg px-2.5 py-1.5 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            /* Import sources */
            <motion.div
              key="sources"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="space-y-1.5"
            >
              {/* File drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) parseFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150 ${
                  isDragOver
                    ? 'bg-white/[0.06] border border-white/[0.12]'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.045] hover:border-white/[0.1]'
                }`}
              >
                <TabinIcon name="import" size={18} className="shrink-0 text-white/45 group-hover:text-white/80 transition-colors" />
                <div className="flex-1 min-w-0">
                  <span className="block text-[12px] font-medium text-white/70 group-hover:text-white/90 transition-colors">
                    {isDragOver ? 'Drop to import' : 'Open bookmark file'}
                  </span>
                  <span className="text-[10.5px] text-white/28 mt-0.5 block">
                    HTML · JSON · CSV · TXT — format detected automatically
                  </span>
                </div>
              </div>

              {/* Chrome import */}
              <button
                type="button"
                onClick={handleImportFromChrome}
                disabled={isChromeLoading}
                className="group w-full flex items-center gap-3 rounded-xl px-4 py-3 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.045] hover:border-white/[0.1] transition-all cursor-pointer disabled:opacity-40"
              >
                <TabinIcon name="chrome" size={18} className="shrink-0 text-white/45 group-hover:text-white/80 transition-colors" />
                <div className="flex-1 text-left min-w-0">
                  <span className="block text-[12px] font-medium text-white/65 group-hover:text-white/85 transition-colors">
                    Import from Chrome
                  </span>
                  <span className="text-[10.5px] text-white/28 mt-0.5 block">
                    Syncs bookmarks and folders with permission
                  </span>
                </div>
                {isChromeLoading && (
                  <span className="shrink-0 text-[10.5px] text-white/40">
                    Loading…
                  </span>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Divider */}
      <div className="border-t border-white/[0.06] mb-6" />

      {/* ── Export ────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <p className="text-[11px] font-medium text-white/50">Export</p>
          <span className="text-[10.5px] text-white/25">
            {shortcutCount} bookmark{shortcutCount === 1 ? '' : 's'}
            {folderCount > 0 ? ` · ${folderCount} folder${folderCount === 1 ? '' : 's'}` : ''}
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden divide-y divide-white/[0.04]">
          {EXPORT_FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              onClick={() => handleExport(fmt.id)}
              className="group w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.035] active:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <TabinIcon name={fmt.id} size={17} className="shrink-0 text-white/40 group-hover:text-white/80 transition-colors" />
              <div className="flex-1 min-w-0">
                <span className="block text-[12px] font-medium text-white/70 group-hover:text-white/90 transition-colors leading-tight">
                  {fmt.label}
                </span>
                <span className="text-[10.5px] text-white/28 leading-tight">{fmt.note}</span>
              </div>
              <span className="shrink-0 font-mono text-[9.5px] text-white/20 group-hover:text-white/40 transition-colors bg-white/[0.04] rounded px-1.5 py-0.5 group-hover:bg-white/[0.08]">
                .{fmt.ext}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
