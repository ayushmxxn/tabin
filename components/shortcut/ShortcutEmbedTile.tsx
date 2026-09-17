import { ACCENT_CLASSES, cn, getHostname } from "@/lib/utils";
import type { ShortcutItem } from "@/types";
import { memo, useEffect, useState, useMemo } from "react";
import { Tile } from "./Tile";

interface ShortcutEmbedTileProps {
  item: ShortcutItem;
  className?: string;
}

// Session-level caches to track verified loaded images and prevent fallback flicker on re-renders
const verifiedLoadedUrls = new Set<string>();
const failedUrls = new Set<string>();

export function clearFailedImageUrl(url?: string | null) {
  if (url) {
    failedUrls.delete(url);
  } else {
    failedUrls.clear();
  }
}

export const ShortcutEmbedTile = memo(function ShortcutEmbedTile({
  item,
  className,
}: ShortcutEmbedTileProps) {

  // Stable resolved OG image URL (supports local data URLs, blob URLs, and external URLs)
  const ogImageUrl = useMemo(() => {
    if (
      typeof item.ogImage === "string" &&
      (item.ogImage.startsWith("data:") ||
        item.ogImage.startsWith("http://") ||
        item.ogImage.startsWith("https://"))
    ) {
      return item.ogImage;
    }
    return null;
  }, [item.ogImage]);

  const [hasError, setHasError] = useState(() => {
    return ogImageUrl ? failedUrls.has(ogImageUrl) : false;
  });

  // Keep error state in sync with URL
  useEffect(() => {
    if (ogImageUrl) {
      if (verifiedLoadedUrls.has(ogImageUrl)) {
        setHasError(false);
      } else {
        setHasError(failedUrls.has(ogImageUrl));
      }
    } else {
      setHasError(false);
    }
  }, [ogImageUrl]);

  const domain = getHostname(item.url);
  const showOgImage = Boolean(ogImageUrl && !hasError);

  const handleImageLoad = () => {
    if (ogImageUrl) {
      verifiedLoadedUrls.add(ogImageUrl);
      failedUrls.delete(ogImageUrl);
    }
    setHasError(false);
  };

  const handleImageError = () => {
    // If the image already successfully loaded, ignore transient error events
    if (ogImageUrl && verifiedLoadedUrls.has(ogImageUrl)) {
      return;
    }
    if (ogImageUrl) {
      failedUrls.add(ogImageUrl);
    }
    setHasError(true);
  };

  return (
    <div
      className={cn(
        "group/embed relative flex flex-col w-[140px] overflow-hidden select-none",
        "rounded-[16px] border border-white/[0.14] bg-[#121214]/80 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.55),0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-2xl",
        "transition-all duration-200 ease-out",
        "hover:bg-[#121214]/92 hover:shadow-[0_18px_36px_-6px_rgba(0,0,0,0.7)]",
        className,
      )}
    >
      {/* Top Preview Image Banner or Graceful Favicon Fallback */}
      <div className="relative w-full h-[74px] overflow-hidden bg-black/40 flex items-center justify-center border-b border-white/[0.06]">
        {showOgImage ? (
          <img
            src={ogImageUrl!}
            alt=""
            draggable={false}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover select-none"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          /* Graceful Fallback: Centered favicon/tile when OG image is absent or cannot be downloaded */
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-white/[0.07] to-transparent">
            <div
              className={cn(
                "absolute inset-0 opacity-20 blur-xl select-none",
                ACCENT_CLASSES[item.accent]?.tile,
              )}
            />
            <Tile
              title={item.title}
              url={item.url}
              customIcon={item.customIcon}
              accent={item.accent}
              size="md"
              className="relative z-10 shadow-md"
            />
          </div>
        )}
      </div>

      {/* Bottom Content Area: Favicon, Title, Domain */}
      <div className="p-2.5 pt-2 flex flex-col gap-0.5 bg-[#121214]/90 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 min-w-0">
          <Tile
            title={item.title}
            url={item.url}
            customIcon={item.customIcon}
            accent={item.accent}
            size="xs"
            className="shrink-0"
          />
          <span className="truncate text-[11.5px] font-medium text-white/95 tracking-tight leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
            {item.title}
          </span>
        </div>
        <span className="truncate text-[10px] text-white/45 pl-[22px] leading-tight font-normal">
          {domain}
        </span>
      </div>
    </div>
  );
});
