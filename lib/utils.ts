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
  const trimmed = url.trim();
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    console.warn("Blocked unsafe URL scheme:", trimmed);
    return;
  }
  const targetUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  if (mode === "sameTab") {
    if (typeof chrome !== "undefined" && chrome.tabs?.update) {
      chrome.tabs.update({ url: targetUrl }).catch(() => {
        window.location.href = targetUrl;
      });
    } else {
      window.location.href = targetUrl;
    }
  } else {
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url: targetUrl, active: true }).catch(() => {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      });
    } else {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
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
    if (hostname === 'cal.com' || hostname.endsWith('.cal.com')) {
      return '/cal.png';
    }
    if (hostname === 'cap.so' || hostname.endsWith('.cap.so')) {
      return '/cap.png';
    }
    if (
      hostname === 'runable.link' ||
      hostname.endsWith('.runable.link') ||
      hostname === 'runable.com' ||
      hostname.endsWith('.runable.com')
    ) {
      return '/runable.png';
    }
    if (
      hostname === 'viktor.com' ||
      hostname.endsWith('.viktor.com')
    ) {
      return '/viktor.png';
    }
    if (
      hostname === 'wisprflow.ai' ||
      hostname.endsWith('.wisprflow.ai')
    ) {
      return '/wisprflow.png';
    }
    if (
      hostname === 'superli.st' ||
      hostname.endsWith('.superli.st') ||
      hostname === 'superlist.com' ||
      hostname.endsWith('.superlist.com')
    ) {
      return '/superlist.png';
    }
    if (
      hostname === 'stacklist.link' ||
      hostname.endsWith('.stacklist.link') ||
      hostname === 'stacklist.com' ||
      hostname.endsWith('.stacklist.com')
    ) {
      return '/stacklist.png';
    }
    if (
      hostname === 'mira.tg' ||
      hostname.endsWith('.mira.tg')
    ) {
      return '/mira.png';
    }
    if (
      hostname === 'kolo.dub.link' ||
      hostname.endsWith('.kolo.dub.link') ||
      hostname === 'kolo.ai' ||
      hostname.endsWith('.kolo.ai')
    ) {
      return '/kolo.png';
    }
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
