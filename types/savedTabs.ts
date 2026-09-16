/**
 * Domain types for Tabin's OneTab-style Saved Tabs feature.
 * Strict, lightweight metadata only: no DOM, no screenshots, minimal memory.
 */

export interface SavedTab {
  id: string;
  url: string;
  title: string;
  favIconUrl?: string | null;
  pinned?: boolean;
  groupId?: number;
  groupTitle?: string | null;
  groupColor?: string | null;
}

export interface SavedTabGroup {
  id: string;
  name: string;
  createdAt: number;
  tabs: SavedTab[];
  isTarget?: boolean;
}

export type SavedTabSession = SavedTabGroup;
