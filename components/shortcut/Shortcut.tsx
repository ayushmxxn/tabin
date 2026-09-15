import type { RefObject } from 'react';
import { motion } from 'motion/react';
import { Tile } from './Tile';
import { useCanvasDrag } from '@/hooks/useCanvasDrag';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';
import { getHostname } from '@/lib/utils';
import type { ShortcutItem } from '@/types';

interface ShortcutProps {
  item: ShortcutItem;
  position: { x: number; y: number };
  canvasRef: RefObject<HTMLDivElement | null>;
  columns?: number;
}

export function Shortcut({ item, position, canvasRef, columns }: ShortcutProps) {
  const moveItem = useLaunchpadStore((state) => state.moveItem);

  const { dragHandlers, handleActivate, x, y } = useCanvasDrag({
    id: item.id,
    canvasRef,
    columns,
    onMove: (newPosition) => moveItem(item.id, newPosition),
    onActivate: () => window.open(item.url, '_blank', 'noopener,noreferrer'),
  });

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
    >
      <motion.div
        role="link"
        tabIndex={0}
        aria-label={`Open ${item.title}`}
        data-tile-id={item.id}
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
          if (event.key === 'Enter' || event.key === ' ') handleActivate();
        }}
      >
        <Tile title={item.title} url={item.url} accent={item.accent} size="lg" />
        <span className="max-w-[4.75rem] truncate text-center text-[11px] font-normal tracking-tight text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">
          {item.title}
        </span>
        <span className="sr-only">{getHostname(item.url)}</span>
      </motion.div>
    </div>
  );
}
