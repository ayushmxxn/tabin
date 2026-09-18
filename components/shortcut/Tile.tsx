import { ACCENT_CLASSES, cn, getFaviconUrl, getInitial } from "@/lib/utils";
import type { AccentToken } from "@/types";
import { useEffect, useState, memo } from "react";

interface TileProps {
  title: string;
  url?: string;
  customIcon?: string | null;
  accent: AccentToken;
  size?: "lg" | "md" | "sm" | "xs";
  className?: string;
  /** Render children instead of a favicon/initial — used for folder previews. */
  children?: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<TileProps["size"]>, string> = {
  lg: "h-12 w-12",
  md: "h-10 w-10",
  sm: "h-7 w-7",
  xs: "h-4 w-4",
};

// Module-level cache to track failed favicon URLs and prevent infinite retry/re-render loops
const failedFaviconUrls = new Set<string>();

export function clearFailedFaviconUrl(url?: string | null) {
  if (url) {
    failedFaviconUrls.delete(url);
  } else {
    failedFaviconUrls.clear();
  }
}

export const Tile = memo(function Tile({
  title,
  url,
  customIcon,
  accent,
  size = "lg",
  className,
  children,
}: TileProps) {
  const defaultFavicon = url ? getFaviconUrl(url) : null;
  const customFailed = Boolean(customIcon && failedFaviconUrls.has(customIcon));
  const activeIconUrl = (!customFailed && customIcon) ? customIcon : defaultFavicon;
  const isFailed = Boolean(activeIconUrl && failedFaviconUrls.has(activeIconUrl));

  const [hasError, setHasError] = useState(() => isFailed);

  useEffect(() => {
    setHasError(isFailed);
  }, [isFailed, activeIconUrl]);

  if (children) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden",
          "rounded-[22.5%] border border-white/20 bg-white/[0.16] shadow-[0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-xl",
          "transition-transform duration-200 ease-out",
          SIZE_CLASSES[size],
          className,
        )}
      >
        {children}
      </div>
    );
  }

  const showFavicon = Boolean(activeIconUrl && !hasError);

  if (showFavicon) {
    return (
      <img
        src={activeIconUrl!}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className={cn(
          "shrink-0 select-none object-cover rounded-[22.5%]",
          "drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]",
          "transition-transform duration-200 ease-out",
          SIZE_CLASSES[size],
          className,
        )}
        onError={() => {
          if (activeIconUrl) {
            failedFaviconUrls.add(activeIconUrl);
          }
          setHasError(true);
        }}
      />
    );
  }

  const accentConfig = (accent && ACCENT_CLASSES[accent]) ? ACCENT_CLASSES[accent] : ACCENT_CLASSES.violet;
  const tile = accentConfig.tile;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden",
        "rounded-[22.5%] bg-gradient-to-br shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
        "transition-transform duration-200 ease-out",
        tile,
        SIZE_CLASSES[size],
        className,
      )}
    >
      <span className="select-none text-xs font-semibold text-white/95">
        {getInitial(title)}
      </span>
    </div>
  );
});
