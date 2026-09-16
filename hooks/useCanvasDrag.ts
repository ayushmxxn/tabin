import { useRef, useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { animate, useMotionValue, type PanInfo } from 'motion/react';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';

import { GRID_CONFIG } from '@/lib/layout';

// Pointer must move more than this (in px) before a drag "counts" —
// keeps an ordinary click from being swallowed by the drag gesture.
const DRAG_THRESHOLD = 6;

interface UseCanvasDragOptions {
  id: string;
  canvasRef: RefObject<HTMLDivElement | null>;
  columns?: number;
  pageOffset?: number;
  onMove?: (position: { x: number; y: number }) => void;
  onReorder?: (targetIndex: number) => void;
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
function getDistanceToRect(px: number, py: number, rect: DOMRect) {
  const dx = Math.max(rect.left - px, 0, px - rect.right);
  const dy = Math.max(rect.top - py, 0, py - rect.bottom);
  return Math.hypot(dx, dy);
}

function findNearbyDockTarget(pointX: number, pointY: number) {
  const PROXIMITY_THRESHOLD = 55; // px radius around target

  const folderEls = Array.from(document.querySelectorAll<HTMLElement>('[data-dock-folder-id]'));
  let bestTarget: { type: 'folder'; id: string; el: HTMLElement } | { type: 'home'; el: HTMLElement } | null = null;
  let minDistance = Infinity;

  for (const el of folderEls) {
    const rect = el.getBoundingClientRect();
    const distance = getDistanceToRect(pointX, pointY, rect);
    if (distance <= PROXIMITY_THRESHOLD && distance < minDistance) {
      const folderId = el.getAttribute('data-dock-folder-id');
      if (folderId) {
        minDistance = distance;
        bestTarget = { type: 'folder', id: folderId, el };
      }
    }
  }

  const homeEl = document.querySelector<HTMLElement>('[data-dock-home]');
  if (homeEl) {
    const rect = homeEl.getBoundingClientRect();
    const distance = getDistanceToRect(pointX, pointY, rect);
    if (distance <= PROXIMITY_THRESHOLD && distance < minDistance) {
      bestTarget = { type: 'home', el: homeEl };
    }
  }

  return bestTarget;
}

export function useCanvasDrag({ id, canvasRef, columns, pageOffset, onMove, onReorder, onActivate }: UseCanvasDragOptions) {
  const dragDistance = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (isDragging) {
      const prevCursor = document.body.style.cursor;
      document.body.style.cursor = 'grabbing';
      return () => {
        document.body.style.cursor = prevCursor;
      };
    }
  }, [isDragging]);

  const dragHandlers = {
    onDragStart: () => {
      dragDistance.current = 0;
      setIsDragging(true);
    },
    onDrag: (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      dragDistance.current = Math.hypot(info.offset.x, info.offset.y);

      if (dragDistance.current >= DRAG_THRESHOLD) {
        const tileEl = document.querySelector<HTMLElement>(`[data-tile-id="${id}"]`);
        let centerX = info.point.x;
        let centerY = info.point.y;
        if (tileEl) {
          const tileRect = tileEl.getBoundingClientRect();
          centerX = tileRect.left + tileRect.width / 2;
          centerY = tileRect.top + tileRect.height / 2;
        }

        const target = findNearbyDockTarget(info.point.x, info.point.y) ?? findNearbyDockTarget(centerX, centerY);
        const nextFolderId = target && target.type === 'folder' ? target.id : null;
        if (useLaunchpadStore.getState().dragOverFolderId !== nextFolderId) {
          useLaunchpadStore.getState().setDragOverFolderId(nextFolderId);
        }
      }
    },
    onDragEnd: (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      setIsDragging(false);
      useLaunchpadStore.getState().setDragOverFolderId(null);

      const canvas = canvasRef.current;
      const wasDrag = canvas && dragDistance.current >= DRAG_THRESHOLD;

      if (wasDrag) {
        const tileEl = document.querySelector<HTMLElement>(`[data-tile-id="${id}"]`);
        if (tileEl) {
          const canvasRect = canvas.getBoundingClientRect();
          const tileRect = tileEl.getBoundingClientRect();
          const centerX = tileRect.left + tileRect.width / 2;
          const centerY = tileRect.top + tileRect.height / 2;

          // Check proximity to dock folder or home button (using both cursor and tile center)
          const target = findNearbyDockTarget(info.point.x, info.point.y) ?? findNearbyDockTarget(centerX, centerY);
          if (target) {
            if (target.type === 'folder') {
              useLaunchpadStore.getState().moveToFolder(id, target.id);
            } else if (target.type === 'home') {
              useLaunchpadStore.getState().moveToFolder(id, null);
            }
            animate(x, 0, { type: 'spring', stiffness: 350, damping: 28 });
            animate(y, 0, { type: 'spring', stiffness: 350, damping: 28 });
            return;
          }

          if (columns && onReorder) {
            const relX = centerX - canvasRect.left;
            const relY = centerY - canvasRect.top;
            const colWidth = canvasRect.width / columns;
            const startYPx = canvasRect.height * GRID_CONFIG.startY;
            const rowHeight = canvasRect.height * GRID_CONFIG.rowStep;

            const col = Math.min(Math.max(Math.floor(relX / colWidth), 0), columns - 1);
            const row = Math.max(0, Math.round((relY - startYPx) / rowHeight));
            const slotOnPage = row * columns + col;
            const targetIndex = (pageOffset ?? 0) + slotOnPage;

            onReorder(targetIndex);
          } else if (onMove) {
            const nextX = Math.min(Math.max((centerX - canvasRect.left) / canvasRect.width, 0.03), 0.97);
            const nextY = Math.min(Math.max((centerY - canvasRect.top) / canvasRect.height, 0.05), 0.92);
            onMove({ x: nextX, y: nextY });
          }
        }
      }

      // Smoothly spring offset back to 0
      animate(x, 0, { type: 'spring', stiffness: 350, damping: 28 });
      animate(y, 0, { type: 'spring', stiffness: 350, damping: 28 });
    },
  };

  const handleActivate = () => {
    if (dragDistance.current >= DRAG_THRESHOLD) return;
    onActivate();
  };

  return { dragHandlers, handleActivate, isDragging, x, y };
}
