import { useRef, useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { animate, useMotionValue, type PanInfo } from 'motion/react';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';
import { GRID_CONFIG } from '@/lib/layout';
import { isRecentDrag, recordGlobalDragEnd } from '@/lib/utils';

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

function getRectDistance(r1: DOMRect, r2: DOMRect) {
  const dx = Math.max(0, Math.max(r1.left - r2.right, r2.left - r1.right));
  const dy = Math.max(0, Math.max(r1.top - r2.bottom, r2.top - r1.bottom));
  return Math.hypot(dx, dy);
}

function findNearbyDockTarget(pointX: number, pointY: number, tileRect?: DOMRect | null) {
  const POINTER_THRESHOLD = 110; // px radius around target
  const TILE_EDGE_THRESHOLD = 80; // px distance between tile bounding box and dock item

  const folderEls = Array.from(
    document.querySelectorAll<HTMLElement>('[data-dock-folder-id], [data-folder-id]'),
  );
  let bestTarget:
    | { type: 'folder'; id: string; el: HTMLElement }
    | { type: 'home'; el: HTMLElement }
    | null = null;
  let minDistance = Infinity;

  for (const el of folderEls) {
    const rect = el.getBoundingClientRect();
    const pointDist = getDistanceToRect(pointX, pointY, rect);
    const tileDist = tileRect ? getRectDistance(tileRect, rect) : Infinity;
    const isNearby = pointDist <= POINTER_THRESHOLD || tileDist <= TILE_EDGE_THRESHOLD;

    if (isNearby) {
      const effectiveDist = Math.min(pointDist, tileDist);
      if (effectiveDist < minDistance) {
        const folderId =
          el.getAttribute('data-dock-folder-id') || el.getAttribute('data-folder-id');
        if (folderId) {
          minDistance = effectiveDist;
          bestTarget = { type: 'folder', id: folderId, el };
        }
      }
    }
  }

  const homeEl = document.querySelector<HTMLElement>('[data-dock-home]');
  if (homeEl) {
    const rect = homeEl.getBoundingClientRect();
    const pointDist = getDistanceToRect(pointX, pointY, rect);
    const tileDist = tileRect ? getRectDistance(tileRect, rect) : Infinity;
    const isNearby = pointDist <= POINTER_THRESHOLD || tileDist <= TILE_EDGE_THRESHOLD;

    if (isNearby) {
      const effectiveDist = Math.min(pointDist, tileDist);
      if (effectiveDist < minDistance) {
        bestTarget = { type: 'home', el: homeEl };
      }
    }
  }

  return bestTarget;
}

export function useCanvasDrag({ id, canvasRef, columns, pageOffset, onMove, onReorder, onActivate }: UseCanvasDragOptions) {
  const dragDistance = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const activeDockTargetRef = useRef<
    | { type: 'folder'; id: string; el: HTMLElement }
    | { type: 'home'; el: HTMLElement }
    | null
  >(null);

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
      activeDockTargetRef.current = null;
    },
    onDrag: (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      dragDistance.current = Math.hypot(info.offset.x, info.offset.y);

      if (dragDistance.current >= DRAG_THRESHOLD) {
        const tileEl = document.querySelector<HTMLElement>(`[data-tile-id="${id}"]`);
        const tileRect = tileEl?.getBoundingClientRect() ?? null;
        let centerX = info.point.x;
        let centerY = info.point.y;
        if (tileRect) {
          centerX = tileRect.left + tileRect.width / 2;
          centerY = tileRect.top + tileRect.height / 2;
        }

        const target =
          findNearbyDockTarget(info.point.x, info.point.y, tileRect) ??
          findNearbyDockTarget(centerX, centerY, tileRect);

        activeDockTargetRef.current = target;
        const nextFolderId = target ? (target.type === 'folder' ? target.id : 'home') : null;
        if (useLaunchpadStore.getState().dragOverFolderId !== nextFolderId) {
          useLaunchpadStore.getState().setDragOverFolderId(nextFolderId);
        }
      }
    },
    onDragEnd: (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      setIsDragging(false);
      recordGlobalDragEnd();
      const pendingDragOverFolderId = useLaunchpadStore.getState().dragOverFolderId;
      useLaunchpadStore.getState().setDragOverFolderId(null);

      const totalOffset = Math.hypot(info.offset.x, info.offset.y);
      const wasDrag = Boolean(
        dragDistance.current >= DRAG_THRESHOLD ||
        totalOffset >= DRAG_THRESHOLD ||
        pendingDragOverFolderId ||
        activeDockTargetRef.current
      );

      if (wasDrag) {
        const tileEl = document.querySelector<HTMLElement>(`[data-tile-id="${id}"]`);
        const tileRect = tileEl?.getBoundingClientRect() ?? null;
        const centerX = tileRect ? tileRect.left + tileRect.width / 2 : info.point.x;
        const centerY = tileRect ? tileRect.top + tileRect.height / 2 : info.point.y;

        // Check proximity or whether the folder was visibly opened when released
        let target =
          findNearbyDockTarget(info.point.x, info.point.y, tileRect) ??
          findNearbyDockTarget(centerX, centerY, tileRect) ??
          activeDockTargetRef.current;

        if (!target && pendingDragOverFolderId) {
          if (pendingDragOverFolderId === 'home') {
            const homeEl = document.querySelector<HTMLElement>('[data-dock-home]');
            if (homeEl) target = { type: 'home', el: homeEl };
          } else {
            const folderEl = document.querySelector<HTMLElement>(`[data-dock-folder-id="${pendingDragOverFolderId}"], [data-folder-id="${pendingDragOverFolderId}"]`);
            if (folderEl) target = { type: 'folder', id: pendingDragOverFolderId, el: folderEl };
          }
        }

        activeDockTargetRef.current = null;

        if (target) {
          if (target.type === 'folder') {
            useLaunchpadStore.getState().moveToFolder(id, target.id);
            const rect = target.el.getBoundingClientRect();
            useLaunchpadStore.getState().openFolder(target.id, {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          } else if (target.type === 'home') {
            useLaunchpadStore.getState().moveToFolder(id, null);
            useLaunchpadStore.getState().closeFolder();
          }
          dragDistance.current = 0;
          animate(x, 0, { type: 'spring', stiffness: 350, damping: 28 });
          animate(y, 0, { type: 'spring', stiffness: 350, damping: 28 });
          return;
        }

        const canvas = canvasRef.current;
        const canvasRect = canvas?.getBoundingClientRect();
        if (canvasRect && columns && onReorder) {
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
        } else if (canvasRect && onMove) {
          const nextX = Math.min(Math.max((centerX - canvasRect.left) / canvasRect.width, 0.03), 0.97);
          const nextY = Math.min(Math.max((centerY - canvasRect.top) / canvasRect.height, 0.05), 0.92);
          onMove({ x: nextX, y: nextY });
        }
      } else {
        activeDockTargetRef.current = null;
      }

      // Smoothly spring offset back to 0
      animate(x, 0, { type: 'spring', stiffness: 350, damping: 28 });
      animate(y, 0, { type: 'spring', stiffness: 350, damping: 28 });

      // Clear drag distance shortly after drag finishes so future clicks are never blocked
      setTimeout(() => {
        dragDistance.current = 0;
      }, 60);
    },
  };

  const handleActivate = () => {
    if (isRecentDrag(600) || dragDistance.current >= DRAG_THRESHOLD) {
      dragDistance.current = 0;
      return;
    }
    dragDistance.current = 0;
    onActivate();
  };

  return { dragHandlers, handleActivate, isDragging, x, y };
}
