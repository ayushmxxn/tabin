/**
 * Core domain types for the Launchpad-style bookmark canvas.
 *
 * Two kinds of item live on a Space's canvas: a Shortcut (a single
 * bookmark) and a Folder (a container of Shortcuts). Both share a
 * free-form `position` so they can be placed anywhere on the canvas,
 * mirroring the spatial feel of macOS Launchpad rather than a fixed
 * grid list.
 */

export interface Position {
  x: number;
  y: number;
}

export interface BaseItem {
  id: string;
  title: string;
  /** Which space (page) this item's tile lives on. Ignored while inside a folder. */
  spaceId: string;
  /** Free-form canvas position (fraction 0-1) relative to the canvas origin, or undefined for automatic grid layout. */
  position?: Position | null;
  /** Id of the folder this item is nested in, or null if it sits directly on the canvas. */
  folderId: string | null;
  /** Tailwind gradient class pair used for the fallback tile + folder preview swatch. */
  accent: AccentToken;
}

export interface ShortcutItem extends BaseItem {
  type: 'shortcut';
  url: string;
}

export interface FolderItem extends BaseItem {
  type: 'folder';
  /** Ordered ids of the shortcuts nested inside this folder. */
  itemIds: string[];
}

export type LaunchpadItem = ShortcutItem | FolderItem;

export interface Space {
  id: string;
  name: string;
}

/**
 * A small closed set of named accent tokens (rather than raw hex values)
 * so every fallback tile / folder swatch draws from one consistent,
 * hand-picked palette instead of arbitrary colors.
 */
export type AccentToken =
  | 'violet'
  | 'blue'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'slate';

export interface PresetWallpaper {
  id: string;
  name: string;
  url: string;
}

export interface WallpaperConfig {
  type: 'preset' | 'custom';
  presetId: string;
  customDataUrl?: string;
  blur: number; // in pixels (0 - 30)
  darkness: number; // fraction (0 - 0.7)
}

export type GridColumnsMode = 'auto' | '6' | '7' | '8' | '10';

export interface LaunchpadSettings {
  gridColumns: GridColumnsMode;
  iconScale: 'compact' | 'standard' | 'large';
  dockMagnification: boolean;
  dockScale: number; // 40 - 64 px
  searchEngine: 'google' | 'duckduckgo' | 'bing';
}
