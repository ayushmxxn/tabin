import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PRESET_WALLPAPERS } from '@/data/wallpapers';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';
import { getFaviconUrl, getHostname } from '@/lib/utils';
import type { GridColumnsMode } from '@/types';

type SettingsTabId = 'wallpaper' | 'appearance' | 'layout' | 'dock' | 'shortcuts' | 'general';

interface TabItem {
  id: SettingsTabId;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: 'wallpaper', label: 'Wallpaper', icon: '🖼️' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'layout', label: 'Layout', icon: '📐' },
  { id: 'dock', label: 'Dock', icon: '⚓' },
  { id: 'shortcuts', label: 'Shortcuts', icon: '🔗' },
  { id: 'general', label: 'General', icon: '⚙️' },
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

  const [activeTab, setActiveTab] = useState<SettingsTabId>('wallpaper');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isSettingsOpen) return null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setWallpaper({
          type: 'custom',
          customDataUrl: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative flex h-[560px] w-[740px] overflow-hidden rounded-[16px] border border-white/20 bg-[#161224]/94 shadow-[0_30px_90px_rgba(0,0,0,0.8)] backdrop-blur-3xl text-white select-none"
        >
          {/* Left Sidebar */}
          <div className="flex w-[200px] flex-col border-r border-white/10 bg-white/[0.04] p-3.5">
            {/* macOS Window Controls */}
            <div className="mb-4 flex items-center gap-2 px-1 pt-0.5">
              <button
                onClick={() => setSettingsOpen(false)}
                className="h-3 w-3 rounded-full bg-[#ff5f56] hover:brightness-90 transition-all"
                title="Close"
              />
              <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>

            <span className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Preferences
            </span>

            {/* Nav Tabs */}
            <div className="flex flex-col gap-0.5">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto px-2 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  if (confirm('Reset all Tabin settings, shortcuts, and wallpapers to default?')) {
                    resetToDefaults();
                  }
                }}
                className="w-full rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-center text-[11px] font-medium text-red-300 hover:bg-red-500/20 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Right Panel Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Wallpaper Tab */}
            {activeTab === 'wallpaper' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white/90">Wallpaper</h3>
                  <p className="text-[12px] text-white/50">
                    Choose an Apple-style desktop background or upload your own image.
                  </p>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  {PRESET_WALLPAPERS.map((preset) => {
                    const isSelected =
                      wallpaper.type === 'preset' && wallpaper.presetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() =>
                          setWallpaper({ type: 'preset', presetId: preset.id })
                        }
                        className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-md'
                            : 'border-white/15 hover:border-white/30'
                        }`}
                      >
                        <div className="h-24 w-full overflow-hidden bg-black/40">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex items-center justify-between bg-white/[0.06] px-3 py-2">
                          <span className="text-[12px] font-medium text-white/90">
                            {preset.name}
                          </span>
                          {isSelected && (
                            <span className="text-[12px] text-blue-400 font-bold">✓</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Upload */}
                <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[13px] font-medium text-white/90">Custom Image</h4>
                      <p className="text-[11px] text-white/50">
                        Upload any high-res wallpaper from your computer.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/20 transition-colors"
                      >
                        Choose File…
                      </button>
                    </div>
                  </div>
                  {wallpaper.type === 'custom' && wallpaper.customDataUrl && (
                    <div className="mt-3 flex items-center gap-3">
                      <img
                        src={wallpaper.customDataUrl}
                        alt="Custom preview"
                        className="h-12 w-20 rounded-md object-cover border border-white/20"
                      />
                      <span className="text-[12px] text-emerald-400">Custom wallpaper active</span>
                    </div>
                  )}
                </div>

                {/* Sliders: Blur & Dimming */}
                <div className="space-y-4 rounded-xl border border-white/15 bg-white/[0.04] p-4">
                  {/* Blur */}
                  <div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-white/90">Wallpaper Blur</span>
                      <span className="text-white/50 font-mono">{wallpaper.blur ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={wallpaper.blur ?? 0}
                      onChange={(e) => setWallpaper({ blur: Number(e.target.value) })}
                      className="mt-2 w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Darkness */}
                  <div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-white/90">Background Dimming</span>
                      <span className="text-white/50 font-mono">
                        {Math.round((wallpaper.darkness ?? 0.15) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.75}
                      step={0.05}
                      value={wallpaper.darkness ?? 0.15}
                      onChange={(e) => setWallpaper({ darkness: Number(e.target.value) })}
                      className="mt-2 w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white/90">Appearance</h3>
                  <p className="text-[12px] text-white/50">Configure shortcut icon dimensions and styling.</p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4 space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white/90">Icon Scale</label>
                    <p className="text-[11px] text-white/50 mb-2">Adjust bounding size for Tabin icons.</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['compact', 'standard', 'large'] as const).map((scale) => (
                        <button
                          key={scale}
                          onClick={() => updateSettings({ iconScale: scale })}
                          className={`rounded-lg border px-3 py-2 text-center text-[12px] font-medium capitalize transition-all ${
                            settings.iconScale === scale
                              ? 'border-blue-500 bg-blue-600/30 text-white'
                              : 'border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {scale}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Layout Tab */}
            {activeTab === 'layout' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white/90">Layout</h3>
                  <p className="text-[12px] text-white/50">Control grid columns and alignment density.</p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4 space-y-3">
                  <label className="block text-[13px] font-medium text-white/90">Grid Columns</label>
                  <p className="text-[11px] text-white/50">
                    macOS Launchpad uses 10 columns on desktop. You can lock or auto-adapt.
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {(['auto', '6', '7', '8', '10'] as GridColumnsMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => updateSettings({ gridColumns: mode })}
                        className={`rounded-lg border px-2 py-2 text-center text-[12px] font-medium capitalize transition-all ${
                          settings.gridColumns === mode
                            ? 'border-blue-500 bg-blue-600/30 text-white'
                            : 'border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {mode === 'auto' ? 'Auto' : `${mode} Cols`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Dock Tab */}
            {activeTab === 'dock' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white/90">Dock</h3>
                  <p className="text-[12px] text-white/50">Customize the bottom pinned shelf.</p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[13px] font-medium text-white/90">Magnification</h4>
                      <p className="text-[11px] text-white/50">Enlarge icons smoothly on hover.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.dockMagnification}
                      onChange={(e) => updateSettings({ dockMagnification: e.target.checked })}
                      className="h-4 w-4 rounded accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Shortcuts Tab */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white/90">Shortcuts</h3>
                  <p className="text-[12px] text-white/50">Manage saved bookmarks and folders.</p>
                </div>

                <div className="max-h-[340px] overflow-y-auto rounded-xl border border-white/15 bg-white/[0.04] divide-y divide-white/10">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 px-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.type === 'shortcut' ? (
                          <img
                            src={getFaviconUrl(item.url, 64) ?? ''}
                            alt=""
                            className="h-6 w-6 object-contain shrink-0"
                          />
                        ) : (
                          <span className="text-base shrink-0">📁</span>
                        )}
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-white/90 truncate">
                            {item.title}
                          </p>
                          {item.type === 'shortcut' && (
                            <p className="text-[10px] text-white/40 truncate">
                              {getHostname(item.url)}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="rounded px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white/90">General</h3>
                  <p className="text-[12px] text-white/50">Search provider and system shortcuts.</p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4 space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white/90 mb-1.5">
                      Default Search Provider
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['google', 'duckduckgo', 'bing'] as const).map((eng) => (
                        <button
                          key={eng}
                          onClick={() => updateSettings({ searchEngine: eng })}
                          className={`rounded-lg border px-3 py-1.5 text-center text-[12px] font-medium capitalize transition-all ${
                            settings.searchEngine === eng
                              ? 'border-blue-500 bg-blue-600/30 text-white'
                              : 'border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {eng}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <h4 className="text-[12px] font-medium text-white/80 mb-2">
                      Keyboard Shortcuts
                    </h4>
                    <div className="space-y-1.5 text-[11px] text-white/60">
                      <div className="flex justify-between">
                        <span>Focus search bar</span>
                        <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">/</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Switch Spaces</span>
                        <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">← / →</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Dismiss modal or search</span>
                        <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">Esc</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
