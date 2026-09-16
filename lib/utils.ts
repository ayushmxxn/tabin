import type { AccentToken, OpenLinksMode } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class lists, letting later classes win on conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Opens a shortcut URL according to the user's Open links preference.
 * - 'newTab': Opens in a new browser tab without focusing away.
 * - 'sameTab': Navigates the current tab directly to the URL.
 */
export function openShortcutUrl(url: string, mode: OpenLinksMode = "newTab") {
  if (!url) return;
  if (mode === "sameTab") {
    if (typeof chrome !== "undefined" && chrome.tabs?.update) {
      chrome.tabs.update({ url }).catch(() => {
        window.location.href = url;
      });
    } else {
      window.location.href = url;
    }
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Best-effort favicon URL for a bookmark. This is only ever used as an
 * <img src>, so a failed load (offline, blocked, unknown host) is caught
 * by the caller's onError and falls back to a lettered accent tile —
 * there is no bookmark-import flow yet, so URLs come from mock data.
 */
export function getFaviconUrl(url: string, size = 128): string | null {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
  } catch {
    return null;
  }
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** First letter (or emoji-safe first grapheme) of a title, for fallback tiles. */
export function getInitial(title: string): string {
  const trimmed = title.trim();
  return trimmed ? ([...trimmed][0] ?? "?").toUpperCase() : "?";
}

/** Hand-picked gradient + ring pairs, keyed by accent token — no arbitrary hex per item. */
export const ACCENT_CLASSES: Record<
  AccentToken,
  { tile: string; ring: string; dot: string }
> = {
  violet: {
    tile: "from-violet-500/90 to-indigo-600/90",
    ring: "ring-violet-300/30",
    dot: "bg-violet-400",
  },
  blue: {
    tile: "from-sky-400/90 to-blue-600/90",
    ring: "ring-sky-300/30",
    dot: "bg-sky-400",
  },
  teal: {
    tile: "from-teal-400/90 to-emerald-600/90",
    ring: "ring-teal-300/30",
    dot: "bg-teal-400",
  },
  amber: {
    tile: "from-amber-400/90 to-orange-600/90",
    ring: "ring-amber-300/30",
    dot: "bg-amber-400",
  },
  rose: {
    tile: "from-rose-400/90 to-pink-600/90",
    ring: "ring-rose-300/30",
    dot: "bg-rose-400",
  },
  slate: {
    tile: "from-slate-400/90 to-slate-600/90",
    ring: "ring-slate-300/30",
    dot: "bg-slate-400",
  },
};

/** Clamp a point inside [0, max] — used to keep dragged tiles on-canvas. */
export function clampPosition(value: number, max: number): number {
  return Math.min(Math.max(value, 0), Math.max(max, 0));
}
