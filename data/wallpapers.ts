import type { PresetWallpaper, WallpaperConfig } from '@/types';

export const PRESET_WALLPAPERS: PresetWallpaper[] = [
  {
    id: 'monterey',
    name: 'macOS Monterey',
    url: '/wallpapers/monterey.jpg',
  },
  {
    id: 'monterey_twilight',
    name: 'Monterey Twilight',
    url: '/wallpapers/monterey_twilight.jpg',
  },
  {
    id: 'sonoma',
    name: 'macOS Sonoma',
    url: '/wallpapers/sonoma.jpg',
  },
  {
    id: 'sequoia',
    name: 'macOS Sequoia',
    url: '/wallpapers/sequoia.jpg',
  },
];

export const DEFAULT_WALLPAPER_CONFIG: WallpaperConfig = {
  type: 'preset',
  presetId: 'monterey',
  blur: 0,
  darkness: 0.15,
};
