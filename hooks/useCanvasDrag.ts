import { useRef } from 'react';
import type { RefObject } from 'react';
import { useMotionValue, type PanInfo } from 'motion/react';

import { snapToGridRhythm } from '@/lib/layout';

// Pointer must move more than this (in px) before a drag "counts" —
// keeps an ordinary click from being swallowed by the drag gesture.
const DRAG_THRESHOLD = 6;

interface UseCanvasDragOptions {
  id: string;
  canvasRef: RefObject<HTMLDivElement | null>;
  columns?: number;
  onMove: (position: { x: number; y: number }) => void;
  onActivate: () => void;
}

/**
 * Encapsulates the "drag a tile around the canvas, but a small nudge
 * still counts as a click" behavior shared by Shortcut and Folder.
 *
 * Position is persisted as a 0–1 fraction of the canvas (via `onMove`),
 * applied by the caller as `left`/`top` on a non-dragged wrapper. The
 * actual `drag`-enabled element only ever moves by a local x/y motion
 * value *offset* from that anchor — importantly, once a drop is
 * committed to the store, that offset is reset back to 0 in the same
 * tick. Skipping the reset would leave Motion's internal drag transform
 * stacked on top of the new left/top forever, so every subsequent drag
 * would start further off than it looks.
 */
export function useCanvasDrag({ id, canvasRef, columns, onMove, onActivate }: UseCanvasDragOptions) {
  const dragDistance = useRef(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const dragHandlers = {
    onDragStart: () => {
      dragDistance.current = 0;
    },
    onDrag: (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      dragDistance.current = Math.hypot(info.offset.x, info.offset.y);
    },
    onDragEnd: () => {
      const canvas = canvasRef.current;
      const wasDrag = canvas && dragDistance.current >= DRAG_THRESHOLD;

      if (wasDrag) {
        const tileEl = document.querySelector<HTMLElement>(`[data-tile-id="${id}"]`);
        if (tileEl) {
          const canvasRect = canvas.getBoundingClientRect();
          const tileRect = tileEl.getBoundingClientRect();
          const centerX = tileRect.left + tileRect.width / 2;
          const centerY = tileRect.top + tileRect.height / 2;

          const nextX = Math.min(Math.max((centerX - canvasRect.left) / canvasRect.width, 0.03), 0.97);
          const nextY = Math.min(Math.max((centerY - canvasRect.top) / canvasRect.height, 0.05), 0.92);
          const finalPos = columns ? snapToGridRhythm({ x: nextX, y: nextY }, columns) : { x: nextX, y: nextY };
          onMove(finalPos);
        }
      }

      // Always zero the offset back out — the wrapper's left/top now
      // encodes the position (updated or unchanged), so the drag
      // transform's job is done.
      x.set(0);
      y.set(0);
    },
  };

  const handleActivate = () => {
    if (dragDistance.current >= DRAG_THRESHOLD) return;
    onActivate();
  };

  return { dragHandlers, handleActivate, x, y };
}
