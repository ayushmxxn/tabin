import { PRESET_WALLPAPERS } from "@/data/wallpapers";
import { getFaviconUrl, getHostname } from "@/lib/utils";
import { useLaunchpadStore } from "@/store/useLaunchpadStore";
import type { GridColumnsMode, ShortcutStyleMode } from "@/types";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImportExportTab } from "./ImportExportTab";
import { PrivacyTab } from "./PrivacyTab";
import { AboutTab } from "./AboutTab";
import { SpacesTab } from "./SpacesTab";
import { saveLiveWallpaperBlob } from "@/lib/videoStorage";

type SettingsTabId =
  | "wallpaper"
  | "layout"
  | "shortcuts"
  | "spaces"
  | "backup"
  | "privacy"
  | "about";

interface TabItem {
  id: SettingsTabId;
  label: string;
  icon: (isActive: boolean) => ReactNode;
}

const TABS: TabItem[] = [
  {
    id: "wallpaper",
    label: "Wallpaper",
    icon: (isActive) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isActive ? "text-[#FA1E76]" : "text-white/45"}
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
  },
  {
    id: "layout",
    label: "Layout",
    icon: (isActive) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isActive ? "text-[#FA1E76]" : "text-white/45"}
      >
        <rect width="7" height="7" x="3" y="3" rx="1.5" />
        <rect width="7" height="7" x="14" y="3" rx="1.5" />
        <rect width="7" height="7" x="14" y="14" rx="1.5" />
        <rect width="7" height="7" x="3" y="14" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    icon: (isActive) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isActive ? "text-[#FA1E76]" : "text-white/45"}
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    id: "spaces",
    label: "Spaces",
    icon: (isActive) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isActive ? "text-[#FA1E76]" : "text-white/45"}
      >
        <rect width="18" height="18" x="3" y="3" rx="3" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    id: "backup",
    label: "Import & Export",
    icon: (isActive) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isActive ? "text-[#FA1E76]" : "text-white/45"}
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </svg>
    ),
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: (isActive) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isActive ? "text-[#FA1E76]" : "text-white/45"}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: "about",
    label: "About",
    icon: (isActive) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isActive ? "text-[#FA1E76]" : "text-white/45"}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
];

export function SettingsModal() {
  const isSettingsOpen = useLaunchpadStore((state) => state.isSettingsOpen);
  const setSettingsOpen = useLaunchpadStore((state) => state.setSettingsOpen);

  const wallpaper = useLaunchpadStore((state) => state.wallpaper);
  const setWallpaper = useLaunchpadStore((state) => state.setWallpaper);

  const settings = useLaunchpadStore((state) => state.settings);
  const updateSettings = useLaunchpadStore((state) => state.updateSettings);

  const items = useLaunchpadStore((state) => state.items);
  const deleteItem = useLaunchpadStore((state) => state.deleteItem);
  const resetToDefaults = useLaunchpadStore((state) => state.resetToDefaults);

  const [activeTab, setActiveTab] = useState<SettingsTabId>("wallpaper");
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    title: string;
    type: "shortcut" | "folder";
  } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Live Wallpaper preview state
  const [pendingVideo, setPendingVideo] = useState<{
    file: File;
    previewUrl: string;
    name: string;
    sizeFormatted: string;
    isError?: boolean;
  } | null>(null);
  const [videoErrorMessage, setVideoErrorMessage] = useState<string | null>(null);
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  const handleCancelPreview = () => {
    if (pendingVideo) {
      URL.revokeObjectURL(pendingVideo.previewUrl);
      setPendingVideo(null);
    }
  };

  useEffect(() => {
    return () => {
      if (pendingVideo?.previewUrl) {
        URL.revokeObjectURL(pendingVideo.previewUrl);
      }
    };
  }, [pendingVideo?.previewUrl]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pendingVideo) {
          handleCancelPreview();
        } else if (itemToDelete) {
          setItemToDelete(null);
        } else if (isResetConfirmOpen) {
          setIsResetConfirmOpen(false);
        } else {
          setSettingsOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen, setSettingsOpen, itemToDelete, isResetConfirmOpen, pendingVideo]);

  if (!isSettingsOpen) return null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setWallpaper({
          type: "custom",
          customDataUrl: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers again
    event.target.value = "";

    const isVideoExt = /\.(mp4|webm|ogg|mov)$/i.test(file.name);
    const validTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!validTypes.includes(file.type) && !isVideoExt) {
      setVideoErrorMessage("Please choose a valid MP4 or WebM video file.");
      return;
    }

    if (file.size > 120 * 1024 * 1024) {
      setVideoErrorMessage("File is too large. Please choose a video under 120MB.");
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

    if (pendingVideo?.previewUrl) {
      URL.revokeObjectURL(pendingVideo.previewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setVideoErrorMessage(null);
    setPendingVideo({
      file,
      previewUrl,
      name: file.name,
      sizeFormatted,
    });
  };

  const handleApplyLiveWallpaper = async () => {
    if (!pendingVideo) return;
    setIsSavingVideo(true);
    try {
      await saveLiveWallpaperBlob(pendingVideo.file);
      setWallpaper({
        type: "video",
        videoFileName: pendingVideo.name,
      });
      URL.revokeObjectURL(pendingVideo.previewUrl);
      setPendingVideo(null);
      setVideoErrorMessage(null);
    } catch (err) {
      console.error("Failed to save live wallpaper:", err);
      setVideoErrorMessage("Failed to save live wallpaper locally.");
    } finally {
      setIsSavingVideo(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4 pb-16"
        onClick={() => setSettingsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative flex h-[475px] w-[740px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#121215]/75 shadow-[0_28px_80px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.09)] backdrop-blur-3xl text-white select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Top Specular / Ambient Rim */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="absolute top-3.5 right-3.5 z-20 flex h-7 w-7 items-center justify-center rounded-[8px] text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Left Sidebar - Integrated Glass Column */}
          <div className="flex w-[195px] shrink-0 flex-col border-r border-white/[0.06] p-3 pt-4">
            <span className="mb-2 px-2.5 text-[11px] font-medium text-white/40">
              Preferences
            </span>

            {/* Nav Tabs */}
            <div className="flex flex-col gap-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors cursor-pointer ${
                      isActive
                        ? "text-white font-medium"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settings-active-tab-pill"
                        className="absolute inset-0 rounded-lg bg-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 35,
                        }}
                      />
                    )}
                    <span className="relative z-10 shrink-0">
                      {tab.icon(isActive)}
                    </span>
                    <span className="relative z-10 truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Reset to Defaults Action */}
            <div className="mt-auto px-1 pt-2.5 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="group w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium text-white/35 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Reset to Defaults</span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-40 group-hover:opacity-100 transition-opacity"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto touch-pan-y px-6 py-5">
            {/* Wallpaper Tab */}
            {activeTab === "wallpaper" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[14px] font-medium text-white/90 tracking-tight">
                    Wallpaper
                  </h3>
                  <p className="text-[11.5px] text-white/40 mt-0.5">
                    Choose a desktop background or upload your own.
                  </p>
                </div>

                {/* Presets Grid - Single 4-column row */}
                <div className="grid grid-cols-4 gap-2.5">
                  {PRESET_WALLPAPERS.map((preset) => {
                    const isSelected =
                      wallpaper.type === "preset" &&
                      wallpaper.presetId === preset.id;
                    const displayName = preset.name.replace(/^macOS\s+/i, "");
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        title={displayName}
                        onClick={() =>
                          setWallpaper({ type: "preset", presetId: preset.id })
                        }
                        className={`group relative aspect-[16/10] overflow-hidden rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#FA1E76]/80 ring-1 ring-[#FA1E76]/40 shadow-[0_2px_12px_rgba(250,30,118,0.15)]"
                            : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.18]"
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={displayName}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Custom Upload - Compact inline row */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[12px] font-medium text-white/85">
                        Custom Image
                      </h4>
                      {wallpaper.type === "custom" && wallpaper.customDataUrl && (
                        <span className="text-[10.5px] text-emerald-400 flex items-center gap-1 font-medium shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Upload a high-res image from your device.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {wallpaper.type === "custom" && wallpaper.customDataUrl && (
                      <img
                        src={wallpaper.customDataUrl}
                        alt="Custom preview"
                        className="h-6 w-9 rounded-md object-cover border border-white/[0.1] shrink-0"
                      />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 whitespace-nowrap rounded-lg border border-white/[0.09] bg-white/[0.06] hover:bg-white/[0.12] px-3 py-1 text-[11.5px] font-medium text-white/90 transition-all cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                    >
                      Choose File…
                    </button>
                  </div>
                </div>

                {/* Live Wallpaper - Compact inline row */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[12px] font-medium text-white/85">
                        Live Wallpaper
                      </h4>
                      {wallpaper.type === "video" && (
                        <span className="text-[10.5px] text-emerald-400 flex items-center gap-1 font-medium shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Looping MP4 or WebM video background without sound.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {wallpaper.type === "video" && (
                      <button
                        type="button"
                        onClick={() =>
                          setWallpaper({ type: "preset", presetId: "sonoma" })
                        }
                        className="shrink-0 whitespace-nowrap text-[11px] text-white/40 hover:text-white transition-colors cursor-pointer px-1 py-0.5"
                        title="Switch back to static wallpaper"
                      >
                        Reset to static
                      </button>
                    )}
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => videoFileInputRef.current?.click()}
                      className="shrink-0 whitespace-nowrap rounded-lg border border-white/[0.09] bg-white/[0.06] hover:bg-white/[0.12] px-3 py-1 text-[11.5px] font-medium text-white/90 transition-all cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                    >
                      Choose Video…
                    </button>
                  </div>
                </div>

                {/* Video Error Message if any */}
                {videoErrorMessage && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[11px] text-red-300 flex items-center justify-between">
                    <span>{videoErrorMessage}</span>
                    <button
                      type="button"
                      onClick={() => setVideoErrorMessage(null)}
                      className="text-white/40 hover:text-white cursor-pointer ml-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Sliders: Blur & Dimming - Compact Side-by-Side */}
                <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-white/[0.06]">
                  {/* Blur */}
                  <div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="font-medium text-white/80">
                        Wallpaper Blur
                      </span>
                      <span className="text-white/45 font-mono text-[10.5px] bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {wallpaper.blur ?? 10}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={wallpaper.blur ?? 10}
                      onChange={(e) =>
                        setWallpaper({ blur: Number(e.target.value) })
                      }
                      className="mt-1.5 w-full accent-[#FA1E76] cursor-pointer"
                    />
                  </div>

                  {/* Darkness */}
                  <div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="font-medium text-white/80">
                        Background Dimming
                      </span>
                      <span className="text-white/45 font-mono text-[10.5px] bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {Math.round((wallpaper.darkness ?? 0.15) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.75}
                      step={0.05}
                      value={wallpaper.darkness ?? 0.15}
                      onChange={(e) =>
                        setWallpaper({ darkness: Number(e.target.value) })
                      }
                      className="mt-1.5 w-full accent-[#FA1E76] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Layout Tab */}
            {activeTab === "layout" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[15px] font-medium text-white/90 tracking-tight">
                    Layout
                  </h3>
                  <p className="text-[12px] text-white/45 mt-0.5">
                    Control grid columns and alignment density.
                  </p>
                </div>

                <div className="pt-5 border-t border-white/[0.06] space-y-3">
                  <div>
                    <h4 className="text-[13px] font-medium text-white/85">
                      Grid Columns
                    </h4>
                    <p className="text-[11.5px] text-white/45 mt-0.5">
                      Choose Auto to adapt to your screen or lock to a specific
                      count.
                    </p>
                  </div>

                  <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] gap-1">
                    {(["auto", "6", "7", "8", "10"] as GridColumnsMode[]).map(
                      (mode) => {
                        const isSelected = settings.gridColumns === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() =>
                              updateSettings({ gridColumns: mode })
                            }
                            className={`relative px-3.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors cursor-pointer ${
                              isSelected
                                ? "text-white"
                                : "text-white/50 hover:text-white/80"
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="settings-layout-pill"
                                className="absolute inset-0 rounded-lg bg-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                                transition={{
                                  type: "spring",
                                  stiffness: 450,
                                  damping: 35,
                                }}
                              />
                            )}
                            <span className="relative z-10 capitalize">
                              {mode === "auto" ? "Auto" : `${mode} Cols`}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Shortcut Style Setting */}
                <div className="pt-5 border-t border-white/[0.06] space-y-3">
                  <div>
                    <h4 className="text-[13px] font-medium text-white/85">
                      Shortcut style
                    </h4>
                    <p className="text-[11.5px] text-white/45 mt-0.5">
                      Choose between classic app icons and compact preview embeds.
                    </p>
                  </div>

                  <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] gap-1">
                    {(
                      [
                        { id: "icons", label: "Icons" },
                        { id: "embeds", label: "Embeds" },
                      ] as const
                    ).map((styleOpt) => {
                      const isSelected =
                        (settings.shortcutStyle ?? "icons") === styleOpt.id;
                      return (
                        <button
                          key={styleOpt.id}
                          type="button"
                          onClick={() =>
                            updateSettings({ shortcutStyle: styleOpt.id })
                          }
                          className={`relative px-3.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? "text-white"
                              : "text-white/50 hover:text-white/80"
                          }`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="settings-shortcut-style-pill"
                              className="absolute inset-0 rounded-lg bg-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                              transition={{
                                type: "spring",
                                stiffness: 450,
                                damping: 35,
                              }}
                            />
                          )}
                          <span className="relative z-10">{styleOpt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Shortcuts Tab */}
            {activeTab === "shortcuts" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-medium text-white/90 tracking-tight">
                        Shortcuts
                      </h3>
                      <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] font-medium text-white/50">
                        {items.length}
                      </span>
                    </div>
                    <p className="text-[12px] text-white/45 mt-0.5">
                      Manage saved bookmarks and folders.
                    </p>
                  </div>
                </div>

                {/* Open Links Setting */}
                <div className="flex items-center justify-between py-3 mb-4 border-y border-white/[0.06] gap-3 shrink-0">
                  <div>
                    <h4 className="text-[13px] font-medium text-white/85">
                      Open links
                    </h4>
                    <p className="text-[11.5px] text-white/45 mt-0.5">
                      Choose where shortcuts open when clicked.
                    </p>
                  </div>

                  <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] gap-1">
                    {(
                      [
                        { id: "newTab", label: "New tab" },
                        { id: "sameTab", label: "Same tab" },
                      ] as const
                    ).map((opt) => {
                      const isSelected =
                        (settings.openLinks ?? "newTab") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateSettings({ openLinks: opt.id })}
                          className={`relative px-3.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? "text-white"
                              : "text-white/50 hover:text-white/80"
                          }`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="settings-open-links-pill"
                              className="absolute inset-0 rounded-lg bg-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                              transition={{
                                type: "spring",
                                stiffness: 450,
                                damping: 35,
                              }}
                            />
                          )}
                          <span className="relative z-10">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.015] divide-y divide-white/[0.04]">
                  {items.length === 0 ? (
                    <div className="p-8 text-center text-[12px] text-white/40">
                      No bookmarks or folders yet.
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.type === "shortcut" ? (
                            <img
                              src={getFaviconUrl(item.url, 64) ?? ""}
                              alt=""
                              className="h-5 w-5 rounded-[5px] object-contain shrink-0"
                            />
                          ) : (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-white/50 shrink-0"
                            >
                              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                            </svg>
                          )}
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-white/90 truncate leading-snug">
                              {item.title}
                            </p>
                            {item.type === "shortcut" && (
                              <p className="text-[11px] font-normal text-white/40 truncate leading-snug">
                                {getHostname(item.url)}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setItemToDelete({
                              id: item.id,
                              title: item.title,
                              type: item.type,
                            })
                          }
                          className="opacity-0 group-hover:opacity-100 rounded px-2 py-1 text-[11px] text-white/35 hover:text-red-400 hover:bg-red-500/[0.1] transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Spaces Tab */}
            {activeTab === "spaces" && <SpacesTab />}

            {/* Import / Export Tab */}
            {activeTab === "backup" && <ImportExportTab />}

            {/* Privacy Tab */}
            {activeTab === "privacy" && <PrivacyTab />}

            {/* About Tab */}
            {activeTab === "about" && <AboutTab />}
          </div>

          {/* Delete Item Warning Dialog */}
          <AnimatePresence>
            {itemToDelete && (
              <div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={() => setItemToDelete(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  className="w-[330px] rounded-2xl border border-white/10 bg-[#121215]/85 p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-3xl"
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
                        Delete{" "}
                        {itemToDelete.type === "folder" ? "Folder" : "Shortcut"}
                        ?
                      </h4>
                      <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
                        {itemToDelete.type === "folder"
                          ? `Are you sure you want to delete "${itemToDelete.title}" and all its contained shortcuts? This action cannot be undone.`
                          : `Are you sure you want to delete "${itemToDelete.title}"? This action cannot be undone.`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setItemToDelete(null)}
                      className="h-8 px-3.5 rounded-[9px] border border-white/10 bg-white/[0.04] text-[12px] font-medium text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteItem(itemToDelete.id);
                        setItemToDelete(null);
                      }}
                      className="h-8 px-3.5 rounded-[9px] bg-red-500 text-[12px] font-medium text-white shadow-md shadow-red-500/25 hover:bg-red-600 active:bg-red-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Reset to Defaults Warning Dialog */}
          <AnimatePresence>
            {isResetConfirmOpen && (
              <div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  className="w-[330px] rounded-2xl border border-white/10 bg-[#121215]/85 p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-3xl"
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
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-semibold text-white/95">
                        Reset to Defaults?
                      </h4>
                      <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
                        This will reset all Tabin settings, shortcuts, and
                        wallpapers to their default states. This action cannot
                        be undone.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsResetConfirmOpen(false)}
                      className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetToDefaults();
                        setIsResetConfirmOpen(false);
                      }}
                      className="rounded-lg bg-red-500/90 hover:bg-red-500 px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors cursor-pointer shadow-[0_2px_10px_rgba(239,68,68,0.3)]"
                    >
                      Reset Everything
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Live Wallpaper Preview Modal Dialog */}
          <AnimatePresence>
            {pendingVideo && (
              <div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                onClick={handleCancelPreview}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 6 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="w-[420px] max-w-full rounded-2xl border border-white/12 bg-[#121215]/95 p-5 text-white shadow-[0_28px_80px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-3xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[13px] font-semibold text-white/95">
                        Preview Live Wallpaper
                      </h4>
                      <span className="rounded px-1.5 py-0.5 text-[9.5px] font-medium bg-[#FA1E76]/15 text-[#FA1E76] border border-[#FA1E76]/25 leading-none">
                        Video
                      </span>
                    </div>
                    <span className="text-[11px] text-white/45 font-mono">
                      {pendingVideo.sizeFormatted}
                    </span>
                  </div>

                  {/* Video Preview Container */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/70 border border-white/[0.08]">
                    <video
                      src={pendingVideo.previewUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      onError={() =>
                        setPendingVideo((prev) =>
                          prev ? { ...prev, isError: true } : null
                        )
                      }
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur-md select-none">
                      Muted · Looping
                    </div>
                  </div>

                  {pendingVideo.isError ? (
                    <p className="mt-2.5 text-[11.5px] text-red-300 leading-relaxed">
                      This video could not be decoded. Please select an MP4 (H.264) or WebM (VP8/VP9) file.
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-white/50 truncate">
                      {pendingVideo.name}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancelPreview}
                      className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingVideo || pendingVideo.isError}
                      onClick={handleApplyLiveWallpaper}
                      className="rounded-lg bg-[#FA1E76] hover:bg-[#ff3086] active:bg-[#e01666] disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-1.5 text-[12px] font-medium text-white transition-all cursor-pointer shadow-[0_2px_12px_rgba(250,30,118,0.35)]"
                    >
                      {isSavingVideo ? "Applying…" : "Apply as Wallpaper"}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
