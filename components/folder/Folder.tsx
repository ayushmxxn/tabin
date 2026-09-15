import { useCanvasDrag } from "@/hooks/useCanvasDrag";
import { getFaviconUrl, getInitial } from "@/lib/utils";
import {
  selectFolderChildren,
  useLaunchpadStore,
} from "@/store/useLaunchpadStore";
import type { FolderItem } from "@/types";
import { motion } from "motion/react";
import type { RefObject } from "react";
import { Tile } from "../shortcut/Tile";

interface FolderProps {
  item: FolderItem;
  position: { x: number; y: number };
  canvasRef: RefObject<HTMLDivElement | null>;
  columns?: number;
}

export function Folder({ item, position, canvasRef, columns }: FolderProps) {
  const items = useLaunchpadStore((state) => state.items);
  const moveItem = useLaunchpadStore((state) => state.moveItem);
  const openFolder = useLaunchpadStore((state) => state.openFolder);
  const children = selectFolderChildren(items, item).slice(0, 4);

  const { dragHandlers, handleActivate, x, y } = useCanvasDrag({
    id: item.id,
    canvasRef,
    columns,
    onMove: (newPosition) => moveItem(item.id, newPosition),
    onActivate: () => openFolder(item.id),
  });

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
    >
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`Open ${item.title} folder`}
        data-tile-id={item.id}
        layoutId={`folder-tile-${item.id}`}
        className="flex w-16 cursor-grab flex-col items-center gap-1.5 active:cursor-grabbing"
        style={{ x, y }}
        drag
        dragMomentum={false}
        dragElastic={0.05}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        whileDrag={{ scale: 1.08, zIndex: 30 }}
        {...dragHandlers}
        onClick={handleActivate}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") handleActivate();
        }}
      >
        <Tile title={item.title} accent={item.accent} size="lg">
          <div className="grid h-[64%] w-[64%] grid-cols-2 gap-[2px]">
            {children.map((child) => {
              const favicon =
                child.type === "shortcut" ? getFaviconUrl(child.url, 64) : null;
              return (
                <div
                  key={child.id}
                  className="flex items-center justify-center overflow-hidden rounded-[22.5%]"
                >
                  {favicon ? (
                    <img
                      src={favicon}
                      alt=""
                      draggable={false}
                      className="h-full w-full rounded-[22.5%] object-cover drop-shadow-xs"
                    />
                  ) : (
                    <span className="text-[8px] font-semibold text-white/90">
                      {getInitial(child.title)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Tile>
        <span className="max-w-[4.75rem] truncate text-center text-[11px] font-normal tracking-tight text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">
          {item.title}
        </span>
      </motion.div>
    </div>
  );
}
