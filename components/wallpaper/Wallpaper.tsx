import { PRESET_WALLPAPERS } from '@/data/wallpapers';
import { getLiveWallpaperBlob } from '@/lib/videoStorage';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';
import { useEffect, useRef, useState } from 'react';

export function Wallpaper() {
  const wallpaper = useLaunchpadStore((state) => state.wallpaper);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load video from IndexedDB when type is 'video'
  useEffect(() => {
    let currentObjectUrl: string | null = null;
    let isCancelled = false;

    if (wallpaper?.type === 'video') {
      setVideoError(false);
      getLiveWallpaperBlob().then((blob) => {
        if (isCancelled) return;
        if (blob) {
          currentObjectUrl = URL.createObjectURL(blob);
          setVideoSrc(currentObjectUrl);
        } else {
          setVideoError(true);
        }
      }).catch((err) => {
        console.error('Failed to load live wallpaper video:', err);
        if (!isCancelled) setVideoError(true);
      });
    } else {
      setVideoSrc(null);
    }

    return () => {
      isCancelled = true;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [wallpaper?.type, wallpaper?.videoFileName]);

  // Ensure video is strictly muted and plays seamlessly
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      if (!document.hidden && videoSrc) {
        videoRef.current.play().catch(() => {
          // Handled gracefully if browser blocks un-interacted autoplay
        });
      }
    }
  }, [videoSrc]);

  // Pause playback when tab is hidden to save CPU, GPU, and battery
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!videoRef.current) return;
      if (document.hidden) {
        videoRef.current.pause();
      } else if (wallpaper?.type === 'video' && videoSrc) {
        videoRef.current.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [wallpaper?.type, videoSrc]);

  const preset = PRESET_WALLPAPERS.find((p) => p.id === wallpaper?.presetId) ?? PRESET_WALLPAPERS[0];
  const staticImageSrc = wallpaper?.type === 'custom' && wallpaper?.customDataUrl
    ? wallpaper.customDataUrl
    : (preset?.url ?? '/wallpapers/monterey.jpg');

  const isLiveActive = wallpaper?.type === 'video' && videoSrc && !videoError;

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
        {isLiveActive ? (
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
            aria-hidden="true"
            onError={() => setVideoError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={staticImageSrc}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Darkness / Dimming overlay (affects live & static wallpaper identically) */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-150 ease-out"
        style={{ opacity: darknessAmount }}
      />

      {/* Subtle radial vignette for soft edge framing */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_35%,transparent_55%,rgba(0,0,0,0.35)_100%)]" />
    </div>
  );
}
