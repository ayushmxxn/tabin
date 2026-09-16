import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLaunchpadStore } from "@/store/useLaunchpadStore";
import { deleteLiveWallpaperBlob } from "@/lib/videoStorage";

const PRIVACY_POLICY_URL =
  "https://github.com/ayushmxxn/tabin/blob/main/PRIVACY.md";

export function PrivacyTab() {
  const resetToDefaults = useLaunchpadStore((state) => state.resetToDefaults);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      // Clear live wallpaper video from IndexedDB
      await deleteLiveWallpaperBlob();

      // Clear chrome.storage.local
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        try {
          await chrome.storage.local.clear();
        } catch {}
      }

      // Clear localStorage
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.clear();
        } catch {}
      }

      // Reset in-memory Zustand store to defaults
      resetToDefaults();

      setIsConfirmOpen(false);
      setToastMessage("All local data and media have been cleared.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (error) {
      console.error("Failed to clear local data:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex w-fit max-w-[calc(100%-2.5rem)] items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-[11.5px] font-medium text-emerald-300"
          >
            <span className="shrink-0 text-[13px]">✓</span>
            <span className="truncate">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h3 className="text-[14px] font-medium text-white/90 tracking-tight">
          Privacy & Data
        </h3>
        <p className="text-[11.5px] text-white/40 mt-0.5">
          Tabin is built with a local-first architecture. Your data never leaves
          your browser.
        </p>
      </div>

      {/* Storage & Sync Overview */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/70 shrink-0 mt-0.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h10" />
              <path d="M7 12h10" />
              <path d="M7 17h10" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[12px] font-medium text-white/85">
              Local storage only
            </h4>
            <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">
              Your shortcuts, folder structure, layout settings, and custom
              wallpapers are saved in browser storage (chrome.storage.local &
              localStorage). Live wallpaper videos are cached offline in
              IndexedDB.
            </p>
          </div>
        </div>

        <div className="h-px bg-white/[0.04]" />

        <div className="flex items-start gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/70 shrink-0 mt-0.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[12px] font-medium text-white/85">
              Browser sync
            </h4>
            <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">
              If you use browser profile sync, synchronization is managed
              directly by your browser provider. Tabin does not operate any
              remote servers, databases, or tracking infrastructure.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Breakdown */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-white/40">
          Browser permissions
        </span>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 divide-y divide-white/[0.04] text-[11px]">
          <div className="flex items-center justify-between py-1.5 first:pt-0">
            <span className="font-mono text-white/75 text-[10.5px]">
              storage & unlimitedStorage
            </span>
            <span className="text-white/45 text-right">
              Save shortcuts, layout & media offline
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="font-mono text-white/75 text-[10.5px]">
              contextMenus
            </span>
            <span className="text-white/45 text-right">
              Right-click web pages to add shortcuts
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="font-mono text-white/75 text-[10.5px]">tabs</span>
            <span className="text-white/45 text-right">
              Open shortcuts in active or new tabs
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 last:pb-0">
            <span className="font-mono text-white/75 text-[10.5px]">
              bookmarks <span className="text-white/35">(optional)</span>
            </span>
            <span className="text-white/45 text-right">
              Only requested if you import bookmarks
            </span>
          </div>
        </div>
      </div>

      {/* What Tabin Does NOT Collect */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-white/40">
          Zero data collection
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] text-white/60">
              No browsing history tracking
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] text-white/60">
              No search query logging
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] text-white/60">
              No remote telemetry or cookies
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] text-white/60">
              No advertising or data sales
            </span>
          </div>
        </div>
      </div>

      {/* Policy Link & Clear Data Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] mt-auto">
        <a
          href={PRIVACY_POLICY_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[11.5px] text-white/50 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>View full privacy policy</span>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          className="rounded-lg border border-red-500/20 bg-red-500/[0.08] hover:bg-red-500/15 hover:border-red-500/35 px-3 py-1 text-[11px] font-medium text-red-300 transition-all cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
        >
          Clear local data…
        </button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !isClearing && setIsConfirmOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="w-[330px] rounded-2xl border border-white/10 bg-[#121215]/95 p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[13px] font-semibold text-white/95">
                    Clear local data?
                  </h4>
                  <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
                    This permanently removes all shortcuts, folders, custom
                    wallpapers, and cached media from your browser and resets
                    Tabin to its initial state.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => setIsConfirmOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={handleClearData}
                  className="rounded-lg bg-red-500/90 hover:bg-red-500 px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors cursor-pointer shadow-[0_2px_10px_rgba(239,68,68,0.3)] disabled:opacity-50"
                >
                  {isClearing ? "Clearing…" : "Clear data"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
