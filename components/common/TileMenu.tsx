import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface TileMenuAction {
  label: string;
  hint?: string;
  danger?: boolean;
  onSelect: () => void;
}

/**
 * Small discoverable context menu for canvas + dock tiles.
 * Rendered inline (absolute) so it never adds chrome until invoked
 * via right-click or the hover "…" affordance.
 */
export function TileMenu({
  open,
  actions,
  onClose,
  align = 'center',
}: {
  open: boolean;
  actions: TileMenuAction[];
  onClose: () => void;
  align?: 'center' | 'left';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        'absolute top-[calc(100%+6px)] z-50 w-44 overflow-hidden rounded-xl border border-white/15',
        'bg-[#1a1528]/95 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
        align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0',
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          role="menuitem"
          type="button"
          onClick={() => {
            action.onSelect();
            onClose();
          }}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors',
            action.danger ? 'text-red-300 hover:bg-red-500/20' : 'text-white/85 hover:bg-white/10 hover:text-white',
          )}
        >
          <span>{action.label}</span>
          {action.hint && <span className="text-[10px] text-white/35">{action.hint}</span>}
        </button>
      ))}
    </div>
  );
}
