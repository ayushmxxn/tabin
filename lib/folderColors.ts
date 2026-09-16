/**
 * Folder color presets and dynamic theme generator.
 * Provides presets across all color hues and supports arbitrary custom hex colors.
 */

export interface FolderColorPreset {
  id: string;
  name: string;
  hex: string;
  backFill: string;
  flapFill: string;
  flapStroke: string;
  backInsetShadow?: string;
  flapFillOpacity?: number;
  flapInsetColor?: string;
}

export const DEFAULT_FOLDER_COLOR = '#50B1FD';

export const FOLDER_COLOR_PRESETS: FolderColorPreset[] = [
  {
    id: 'blue',
    name: 'Blue',
    hex: '#50B1FD',
    backFill: '#50B1FD',
    flapFill: '#3a9ae8',
    flapStroke: '#7ec8ff',
    flapFillOpacity: 0.25,
    backInsetShadow: 'inset 0 0 6px 2px rgba(255,255,255,0.37)',
    flapInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    hex: '#06B6D4',
    backFill: '#06B6D4',
    flapFill: '#0891B2',
    flapStroke: '#67E8F9',
    flapFillOpacity: 0.45,
  },
  {
    id: 'teal',
    name: 'Teal',
    hex: '#14B8A6',
    backFill: '#14B8A6',
    flapFill: '#0D9488',
    flapStroke: '#5EEAD4',
    flapFillOpacity: 0.45,
  },
  {
    id: 'green',
    name: 'Emerald',
    hex: '#10B981',
    backFill: '#10B981',
    flapFill: '#059669',
    flapStroke: '#6EE7B7',
    flapFillOpacity: 0.45,
  },
  {
    id: 'lime',
    name: 'Lime',
    hex: '#84CC16',
    backFill: '#84CC16',
    flapFill: '#65A30D',
    flapStroke: '#BEF264',
    flapFillOpacity: 0.45,
  },
  {
    id: 'amber',
    name: 'Amber',
    hex: '#F59E0B',
    backFill: '#F59E0B',
    flapFill: '#D97706',
    flapStroke: '#FCD34D',
    flapFillOpacity: 0.45,
  },
  {
    id: 'orange',
    name: 'Orange',
    hex: '#F97316',
    backFill: '#F97316',
    flapFill: '#EA580C',
    flapStroke: '#FDBA74',
    flapFillOpacity: 0.45,
  },
  {
    id: 'red',
    name: 'Red',
    hex: '#EF4444',
    backFill: '#EF4444',
    flapFill: '#DC2626',
    flapStroke: '#FCA5A5',
    flapFillOpacity: 0.45,
  },
  {
    id: 'rose',
    name: 'Rose',
    hex: '#F43F5E',
    backFill: '#F43F5E',
    flapFill: '#E11D48',
    flapStroke: '#FDA4AF',
    flapFillOpacity: 0.45,
  },
  {
    id: 'pink',
    name: 'Pink',
    hex: '#EC4899',
    backFill: '#EC4899',
    flapFill: '#DB2777',
    flapStroke: '#F9A8D4',
    flapFillOpacity: 0.45,
  },
  {
    id: 'purple',
    name: 'Purple',
    hex: '#A855F7',
    backFill: '#A855F7',
    flapFill: '#9333EA',
    flapStroke: '#D8B4FE',
    flapFillOpacity: 0.45,
  },
  {
    id: 'indigo',
    name: 'Indigo',
    hex: '#6366F1',
    backFill: '#6366F1',
    flapFill: '#4F46E5',
    flapStroke: '#A5B4FC',
    flapFillOpacity: 0.45,
  },
  {
    id: 'slate',
    name: 'Slate',
    hex: '#64748B',
    backFill: '#475569',
    flapFill: '#334155',
    flapStroke: '#94A3B8',
    flapFillOpacity: 0.45,
  },
  {
    id: 'black',
    name: 'Midnight Black',
    hex: '#18181B',
    backFill: '#18181B',
    flapFill: '#27272A',
    flapStroke: '#71717A',
    flapFillOpacity: 0.35,
  },
  {
    id: 'white',
    name: 'Frost White',
    hex: '#FFFFFF',
    backFill: '#FFFFFF',
    flapFill: '#F4F4F5',
    flapStroke: '#D4D4D8',
    flapFillOpacity: 0.85,
  },
];

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return [80, 177, 253]; // fallback to #50B1FD
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

function adjustBrightness(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (percent / 100) * 255, g + (percent / 100) * 255, b + (percent / 100) * 255);
}

function generateCustomTheme(hex: string) {
  return {
    backFill: hex,
    backInsetShadow: 'inset 0 0 6px 2px rgba(255,255,255,0.35)',
    flapFill: adjustBrightness(hex, -15),
    flapFillOpacity: 0.45,
    flapStroke: adjustBrightness(hex, 25),
    flapInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0',
  };
}

export function getFolderTheme(color?: string): {
  backFill: string;
  backInsetShadow: string;
  flapFill: string;
  flapFillOpacity: number;
  flapStroke: string;
  flapInsetColor: string;
} {
  const normalized = color?.trim().toLowerCase() || 'blue';

  const found = FOLDER_COLOR_PRESETS.find(
    (p) => p.id === normalized || p.hex.toLowerCase() === normalized,
  );
  if (found) {
    return {
      backFill: found.backFill,
      backInsetShadow: found.backInsetShadow ?? 'inset 0 0 6px 2px rgba(255,255,255,0.35)',
      flapFill: found.flapFill,
      flapFillOpacity: found.flapFillOpacity ?? 0.45,
      flapStroke: found.flapStroke,
      flapInsetColor: found.flapInsetColor ?? '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0',
    };
  }

  if (normalized.startsWith('#')) {
    return generateCustomTheme(normalized);
  }

  return {
    backFill: '#50B1FD',
    backInsetShadow: 'inset 0 0 6px 2px rgba(255,255,255,0.37)',
    flapFill: '#3a9ae8',
    flapFillOpacity: 0.25,
    flapStroke: '#7ec8ff',
    flapInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0',
  };
}
