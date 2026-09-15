import { PRESET_WALLPAPERS } from '@/data/wallpapers';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';

export function Wallpaper() {
  const wallpaper = useLaunchpadStore((state) => state.wallpaper);

  const preset = PRESET_WALLPAPERS.find((p) => p.id === wallpaper?.presetId) ?? PRESET_WALLPAPERS[0];
  const imageSrc = wallpaper?.type === 'custom' && wallpaper?.customDataUrl
    ? wallpaper.customDataUrl
    : (preset?.url ?? '/wallpapers/monterey.jpg');

  const blurAmount = Math.max(0, Math.min(wallpaper.blur ?? 0, 30));
  const darknessAmount = Math.max(0, Math.min(wallpaper.darkness ?? 0.15, 0.75));

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0a0812] select-none pointer-events-none">
      <div
        className="absolute inset-0 transition-[filter,transform] duration-200 ease-out"
        style={{
          filter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none',
          transform: blurAmount > 0 ? 'scale(1.06)' : 'scale(1)',
        }}
      >
        <img
          src={imageSrc}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
        />
      </div>

      {/* Darkness / Dimming overlay (affects wallpaper only) */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-150 ease-out"
        style={{ opacity: darknessAmount }}
      />

      {/* Subtle macOS radial vignette for soft edge framing */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_35%,transparent_55%,rgba(0,0,0,0.35)_100%)]" />
    </div>
  );
}
