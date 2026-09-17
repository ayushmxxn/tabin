import type { PresetWallpaper, WallpaperConfig } from "@/types";

export const PRESET_WALLPAPERS: PresetWallpaper[] = [
  {
    id: "sonoma",
    name: "macOS Sonoma",
    url: "/wallpapers/sonoma.jpg",
  },
  {
    id: "moonlight",
    name: "Moonlit Coast",
    url: "/wallpapers/moonlight.jpg",
  },
  {
    id: "alpine_sunset",
    name: "Alpine Sunset",
    url: "/wallpapers/alpine_sunset.jpg",
  },
  {
    id: "lake_cabin",
    name: "Alpine Lake Cabin",
    url: "/wallpapers/lake_cabin.jpg",
  },
];

export const DEFAULT_WALLPAPER_CONFIG: WallpaperConfig = {
  type: "preset",
  presetId: "sonoma",
  blur: 10,
  darkness: 0.15,
};
