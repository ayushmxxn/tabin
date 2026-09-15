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

export function getColumnsForWidth(width: number, mode: GridColumnsMode = 'auto'): number {
  if (mode !== 'auto') {
    const parsed = parseInt(mode, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (width < 768) return GRID_CONFIG.minColumns;
  if (width < 1180) return GRID_CONFIG.tabletColumns;
  return GRID_CONFIG.desktopColumns;
}

export function getGridPosition(index: number, columns: number): Position {
  const col = index % columns;
  const row = Math.floor(index / columns);
  const x = Number(((col + 0.5) / columns).toFixed(4));
  const y = Number((GRID_CONFIG.startY + row * GRID_CONFIG.rowStep).toFixed(4));
  return { x, y };
}

export function resolveItemPosition(
  item: LaunchpadItem,
  index: number,
  columns: number,
): Position {
  if (item.position && typeof item.position.x === 'number' && typeof item.position.y === 'number') {
    return item.position;
  }
  return getGridPosition(index, columns);
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
) {
  const [columns, setColumns] = useState(() => {
    if (typeof window !== 'undefined') {
      return getColumnsForWidth(window.innerWidth, mode);
    }
    return GRID_CONFIG.desktopColumns;
  });

  useEffect(() => {
    const el = containerRef.current;
    const update = () => {
      const width = el ? el.getBoundingClientRect().width : window.innerWidth;
      setColumns(getColumnsForWidth(width, mode));
    };

    update();

    if (!el) {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setColumns(getColumnsForWidth(entry.contentRect.width, mode));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, mode]);

  return { columns };
}
