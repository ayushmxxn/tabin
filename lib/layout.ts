import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import type { GridColumnsMode, LaunchpadItem, Position } from '@/types';

export const GRID_CONFIG = {
  minColumns: 5,
  tabletColumns: 7,
  desktopColumns: 10,
  startY: 0.16,
  rowStep: 0.24,
  snapThresholdX: 0.035,
  snapThresholdY: 0.045,
};

export const PAGE_ROWS = 3;

export function getPageCapacity(columns: number): number {
  return columns * PAGE_ROWS;
}

export function getColumnsForWidth(
  width: number,
  mode: GridColumnsMode = 'auto',
  isEmbedMode = false,
): number {
  if (isEmbedMode) {
    // 140px card + 10px gap = 150px pitch
    const maxCols = Math.max(1, Math.floor((width - 48) / 150));
    if (mode !== 'auto') {
      const parsed = parseInt(mode, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.min(parsed, Math.max(3, maxCols));
      }
    }
    return Math.max(4, Math.min(10, maxCols));
  }

  if (mode !== 'auto') {
    const parsed = parseInt(mode, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (width < 768) return GRID_CONFIG.minColumns;
  if (width < 1180) return GRID_CONFIG.tabletColumns;
  return GRID_CONFIG.desktopColumns;
}

export function useColumns(
  mode: GridColumnsMode = 'auto',
  isEmbedMode = false,
): number {
  const [columns, setColumns] = useState(() => {
    if (typeof window !== 'undefined') {
      return getColumnsForWidth(window.innerWidth, mode, isEmbedMode);
    }
    return isEmbedMode ? 8 : GRID_CONFIG.desktopColumns;
  });

  useEffect(() => {
    const handleResize = () => {
      setColumns(getColumnsForWidth(window.innerWidth, mode, isEmbedMode));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mode, isEmbedMode]);

  return columns;
}

export function getGridPosition(
  index: number,
  columns: number,
  isEmbedMode = false,
  containerWidth?: number,
  containerHeight?: number,
): Position {
  const col = index % columns;
  const row = Math.floor(index / columns);

  if (isEmbedMode) {
    const cardWidth = 140;
    const gap = 10; // Consistent 10px horizontal gap (between 8–12px)
    const pitch = cardWidth + gap;
    const width = containerWidth || (typeof window !== 'undefined' ? window.innerWidth : 1440);
    const totalRowWidth = columns * cardWidth + (columns - 1) * gap;
    const startX = Math.max(gap + cardWidth / 2, (width - totalRowWidth) / 2 + cardWidth / 2);
    const pixelX = startX + col * pitch;
    const x = Number((pixelX / width).toFixed(4));

    // Vertical spacing: 126px card + 14px gap = 140px pitch (ensures 12–16px vertical gap)
    const height = containerHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);
    const startY = height * GRID_CONFIG.startY;
    const verticalPitch = 140;
    const pixelY = startY + row * verticalPitch;
    const y = Number((pixelY / height).toFixed(4));
    return { x, y };
  }

  const x = Number(((col + 0.5) / columns).toFixed(4));
  const y = Number((GRID_CONFIG.startY + row * GRID_CONFIG.rowStep).toFixed(4));
  return { x, y };
}

export function resolveItemPosition(
  _item: LaunchpadItem,
  index: number,
  columns: number,
  isEmbedMode = false,
  containerWidth?: number,
  containerHeight?: number,
): Position {
  return getGridPosition(index, columns, isEmbedMode, containerWidth, containerHeight);
}

export function snapToGridRhythm(pos: Position, columns: number): Position {
  let { x, y } = pos;

  const colFloat = (x * columns) - 0.5;
  const nearestCol = Math.round(colFloat);
  const targetX = (nearestCol + 0.5) / columns;
  if (nearestCol >= 0 && nearestCol < columns && Math.abs(x - targetX) < GRID_CONFIG.snapThresholdX) {
    x = Number(targetX.toFixed(4));
  }

  const rowFloat = (y - GRID_CONFIG.startY) / GRID_CONFIG.rowStep;
  const nearestRow = Math.round(rowFloat);
  const targetY = GRID_CONFIG.startY + nearestRow * GRID_CONFIG.rowStep;
  if (nearestRow >= 0 && Math.abs(y - targetY) < GRID_CONFIG.snapThresholdY) {
    y = Number(targetY.toFixed(4));
  }

  return { x, y };
}

export function useCanvasGrid(
  containerRef: RefObject<HTMLElement | null>,
  mode: GridColumnsMode = 'auto',
  isEmbedMode = false,
) {
  const [grid, setGrid] = useState(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const height = typeof window !== 'undefined' ? window.innerHeight : 800;
    return {
      columns: getColumnsForWidth(width, mode, isEmbedMode),
      containerWidth: width,
      containerHeight: height,
    };
  });

  useEffect(() => {
    const el = containerRef.current;
    const update = () => {
      const rect = el ? el.getBoundingClientRect() : null;
      const width = rect?.width || window.innerWidth;
      const height = rect?.height || window.innerHeight;
      setGrid({
        columns: getColumnsForWidth(width, mode, isEmbedMode),
        containerWidth: width,
        containerHeight: height,
      });
    };

    update();

    if (!el) {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setGrid({
            columns: getColumnsForWidth(entry.contentRect.width, mode, isEmbedMode),
            containerWidth: entry.contentRect.width,
            containerHeight: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, mode, isEmbedMode]);

  return grid;
}
