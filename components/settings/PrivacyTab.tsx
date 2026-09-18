import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLaunchpadStore } from "@/store/useLaunchpadStore";
import { deleteLiveWallpaperBlob } from "@/lib/videoStorage";

export function PrivacyTab() {
  const resetToDefaults = useLaunchpadStore((state) => state.resetToDefaults);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await deleteLiveWallpaperBlob();

      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        try {
          await chrome.storage.local.clear();
        } catch {}
      }

      if (typeof localStorage !== "undefined") {
        try {
          localStorage.clear();
        } catch {}
      }

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
    <div className="flex flex-col h-full justify-between">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mb-2 inline-flex w-fit max-w-[calc(100%-2.5rem)] items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11.5px] font-medium text-emerald-300"
          >
            <span className="shrink-0 text-[13px]">✓</span>
            <span className="truncate">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-[14px] font-medium text-white/90 tracking-tight">
            Privacy
          </h3>
          <p className="text-[11.5px] text-white/40 mt-1">
            Your data stays yours. Tabin keeps your workspace stored locally on your computer.
          </p>
        </div>

        {/* 3 Structured Sections */}
        <div className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
          <div className="min-h-[60px] flex items-center gap-6 py-2.5">
            <span className="w-24 shrink-0 text-[11.5px] font-medium text-white/50">
              Your data
            </span>
            <p className="flex-1 text-[12px] text-white/70 leading-relaxed">
              Your shortcuts, folders, Spaces, settings, wallpapers, and saved tabs are stored on your device.
            </p>
          </div>

          <div className="min-h-[60px] flex items-center gap-6 py-2.5">
            <span className="w-24 shrink-0 text-[11.5px] font-medium text-white/50">
              Websites
            </span>
            <p className="flex-1 text-[12px] text-white/70 leading-relaxed">
              When you add a website, Tabin may connect to it to retrieve its title, icon, or preview image.
            </p>
          </div>

          <div className="min-h-[60px] flex items-center gap-6 py-2.5">
            <span className="w-24 shrink-0 text-[11.5px] font-medium text-white/50">
              Privacy
            </span>
            <p className="flex-1 text-[12px] text-white/70 leading-relaxed">
              Tabin does not track your browsing or log your searches.
            </p>
          </div>
        </div>
      </div>

      {/* Clear Data Action */}
      <div className="flex items-center justify-end pt-4 border-t border-white/[0.06] mt-auto">
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
                    This permanently removes all shortcuts, folders, Spaces,
                    custom wallpapers, and saved tabs from your device and resets
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
