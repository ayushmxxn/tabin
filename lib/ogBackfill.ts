import { useLaunchpadStore } from "@/store/useLaunchpadStore";
import type { ShortcutItem } from "@/types";
import { downloadImage, fetchWebsiteMetadata } from "./fetchMetadata";

// In-memory set of shortcut IDs that have been checked or processed this session
const attemptedShortcutIds = new Set<string>();
let isBackfillRunning = false;

/**
 * Migration and backfill service for existing shortcuts.
 *
 * Automatically inspects shortcuts in Tabin storage and:
 * 1. Finds shortcuts where ogImage is still a remote HTTP/HTTPS URL and downloads/converts
 *    them into lightweight local WebP data URLs.
 * 2. Finds shortcuts saved without an ogImage and fetches their website metadata to extract
 *    and store their actual Open Graph image locally.
 * 3. Gracefully leaves shortcuts whose websites genuinely provide no OG image to their
 *    native favicon fallback.
 * 4. Never overwrites or removes an existing valid stored local OG image.
 */
export async function backfillShortcutsOgImages(): Promise<void> {
  if (isBackfillRunning) return;
  isBackfillRunning = true;

  try {
    const store = useLaunchpadStore.getState();
    const items = store.items || [];

    // Filter shortcuts that need backfill
    const candidates = items.filter((item): item is ShortcutItem => {
      if (item.type !== "shortcut" || !item.url) return false;
      if (attemptedShortcutIds.has(item.id)) return false;

      // Remote URL needing local storage conversion
      const hasRemoteUrl =
        typeof item.ogImage === "string" &&
        (item.ogImage.startsWith("http://") || item.ogImage.startsWith("https://"));

      // Missing OG image completely
      const isMissing = item.ogImage === null || item.ogImage === undefined;

      return hasRemoteUrl || isMissing;
    });

    if (candidates.length === 0) return;

    for (const shortcut of candidates) {
      attemptedShortcutIds.add(shortcut.id);

      try {
        let localDataUrl: string | null = null;

        // If the shortcut already has a remote OG image URL, download it directly first
        if (
          typeof shortcut.ogImage === "string" &&
          (shortcut.ogImage.startsWith("http://") || shortcut.ogImage.startsWith("https://"))
        ) {
          localDataUrl = await downloadImage(shortcut.ogImage);
        }

        // If direct download was not available or failed, fetch website metadata to extract fresh OG image
        if (!localDataUrl) {
          const meta = await fetchWebsiteMetadata(shortcut.url);
          if (meta.ogImage && meta.ogImage.startsWith("data:")) {
            localDataUrl = meta.ogImage;
          }
        }

        // Only update if we successfully obtained a local data URI
        if (localDataUrl && localDataUrl.startsWith("data:")) {
          useLaunchpadStore.getState().updateItem(shortcut.id, {
            ogImage: localDataUrl,
          });
        }
      } catch {
        // Gracefully continue with next shortcut
      }

      // Small throttle pause between requests to preserve UI responsiveness
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } finally {
    isBackfillRunning = false;
  }
}
