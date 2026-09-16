"use client";

import { getFolderTheme } from "@/lib/folderColors";
import { ACCENT_CLASSES, cn, getFaviconUrl, getInitial } from "@/lib/utils";
import type { ShortcutItem } from "@/types";
import { motion } from "motion/react";
import React, { useState, memo } from "react";

const sizeScales = {
  sm: 0.65,
  md: 1,
  lg: 1.35,
} as const;

type FolderComponentProps = Omit<React.ComponentProps<"div">, "color"> & {
  color?: string;
  size?: "sm" | "md" | "lg";
  items?: ShortcutItem[];
  isHovered?: boolean;
  isOpen?: boolean;
};

const BASE_WIDTH = 321;
const BASE_HEIGHT = 270;

const FLAP_PATH =
  "M0 25C0 11.1929 11.1929 0 25 0H136.084C143.044 0 149.689 2.90139 154.42 8.00608L178.08 33.5343C182.811 38.639 189.456 41.5404 196.416 41.5404H296C309.807 41.5404 321 52.7333 321 66.5404V216C321 229.807 309.807 241 296 241H25C11.1929 241 0 229.807 0 216V25Z";

const FolderIcon = memo(({ item }: { item?: ShortcutItem }) => {
  const [faviconFailed, setFaviconFailed] = useState(false);
  if (!item) return null;

  const favicon = item.customIcon || (item.url ? getFaviconUrl(item.url, 128) : null);

  return (
    <div
      data-slot="folder-favicon"
      className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[22.5%] border border-white/25 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.35)] select-none"
    >
      {favicon && !faviconFailed ? (
        <img
          src={favicon}
          alt={item.title}
          draggable={false}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover rounded-[22.5%]"
          onError={() => setFaviconFailed(true)}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-[22.5%] bg-gradient-to-br text-white font-bold text-3xl shadow-inner",
            ACCENT_CLASSES[item.accent ?? "violet"].tile,
          )}
        >
          {getInitial(item.title)}
        </div>
      )}
    </div>
  );
});

const FolderComponent = memo(({
  color = "blue",
  size = "md",
  items = [],
  className,
  isHovered: controlledHovered,
  isOpen: controlledOpen,
  ...props
}: FolderComponentProps) => {
  const theme = getFolderTheme(color);
  const scale = sizeScales[size];
  const [internalHovered, setInternalHovered] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isHovered = controlledHovered !== undefined ? (controlledHovered || internalHovered) : internalHovered;
  const isOpen = controlledOpen !== undefined ? (controlledOpen || internalOpen) : internalOpen;

  // Card 3 is front-left, Card 2 is center, Card 1 is right-back
  const isSingle = items.length === 1;
  const card1Item = items[2] ?? (items.length > 2 ? items[2] : undefined);
  const card2Item = items[1] ?? (items.length > 1 ? items[1] : undefined);
  const card3Item = items[0];

  return (
    <div
      data-slot="folder"
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        className,
      )}
      {...props}
    >
      <div
        className="relative cursor-pointer select-none"
        style={{
          width: BASE_WIDTH * scale,
          height: BASE_HEIGHT * scale,
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={() => setInternalHovered(true)}
        onMouseLeave={() => {
          setInternalHovered(false);
          setInternalOpen(false);
        }}
        onClick={() => setInternalOpen((o) => !o)}
      >
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
            perspective: 800 * scale,
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              style={{
                width: BASE_WIDTH,
                height: BASE_HEIGHT,
                borderRadius: 25,
                backgroundColor: theme.backFill,
                boxShadow: theme.backInsetShadow,
              }}
            />
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            {card1Item && (
              <motion.div
                className="absolute pointer-events-none"
                animate={{
                  y: isOpen ? 0 : isHovered ? -60 : -40,
                  x: isOpen ? 0 : 42,
                  rotate: isOpen ? 0 : isHovered ? 14 : 10,
                  opacity: isOpen ? 0 : 1,
                  scale: isOpen ? 0.6 : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 24,
                  delay: isOpen ? 0 : isHovered ? 0.08 : 0,
                }}
              >
                <FolderIcon item={card1Item} />
              </motion.div>
            )}
            {card2Item && (
              <motion.div
                className="absolute pointer-events-none"
                animate={{
                  y: isOpen ? 0 : isHovered ? -75 : -48,
                  x: isOpen ? 0 : 2,
                  rotate: isOpen ? 0 : isHovered ? -1 : 2,
                  opacity: isOpen ? 0 : 1,
                  scale: isOpen ? 0.6 : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 24,
                  delay: isOpen ? 0 : isHovered ? 0.04 : 0,
                }}
              >
                <FolderIcon item={card2Item} />
              </motion.div>
            )}
            {card3Item && (
              <motion.div
                className="absolute pointer-events-none"
                animate={{
                  y: isOpen ? 0 : isHovered ? -65 : -42,
                  x: isOpen ? 0 : isSingle ? 0 : -42,
                  rotate: isOpen ? 0 : isSingle ? 0 : isHovered ? -9 : -6,
                  opacity: isOpen ? 0 : 1,
                  scale: isOpen ? 0.6 : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 24,
                  delay: 0,
                }}
              >
                <FolderIcon item={card3Item} />
              </motion.div>
            )}
          </div>

          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-4"
            style={{
              transformOrigin: "bottom center",
              transformStyle: "preserve-3d",
              width: 321,
              height: 241,
            }}
            animate={{ rotateX: isOpen ? -55 : isHovered ? -45 : -15 }}
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
          >
            <div
              className="absolute inset-0"
              style={{
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                clipPath: `path('${FLAP_PATH}')`,
                WebkitClipPath: `path('${FLAP_PATH}')`,
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                willChange: "transform",
              }}
            />
            <svg
              className="absolute inset-0"
              width="321"
              height="241"
              viewBox="0 0 321 241"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g filter="url(#filter0_i_171_13)">
                <path
                  d={FLAP_PATH}
                  fill={theme.flapFill}
                  fillOpacity={theme.flapFillOpacity}
                />
                <path
                  d="M25 0.5H136.084C142.905 0.5 149.417 3.3431 154.054 8.3457L177.713 33.874C182.539 39.0808 189.317 42.04 196.416 42.04H296C309.531 42.04 320.5 53.0092 320.5 66.54V216C320.5 229.531 309.531 240.5 296 240.5H25C11.469 240.5 0.5 229.531 0.5 216V25C0.5 11.469 11.469 0.5 25 0.5Z"
                  stroke={theme.flapStroke}
                />
              </g>
              <defs>
                <filter
                  id="filter0_i_171_13"
                  x="-25.4"
                  y="-25.4"
                  width="371.8"
                  height="291.8"
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="BackgroundImageFix"
                    result="shape"
                  />
                  <feColorMatrix
                    in="SourceAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    result="hardAlpha"
                  />
                  <feOffset />
                  <feGaussianBlur stdDeviation="2.65" />
                  <feComposite
                    in2="hardAlpha"
                    operator="arithmetic"
                    k2="-1"
                    k3="1"
                  />
                  <feColorMatrix type="matrix" values={theme.flapInsetColor} />
                  <feBlend
                    mode="normal"
                    in2="shape"
                    result="effect1_innerShadow_171_13"
                  />
                </filter>
              </defs>
            </svg>
          </motion.div>
        </div>
      </div>
    </div>
  );
});

export default FolderComponent;

export { FolderComponent as Folder };
export type { FolderComponentProps };
