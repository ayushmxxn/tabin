import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';

/**
 * Minimal page-dot indicator for paging between Spaces. Also wires up
 * left/right arrow keys as a keyboard-accessible way to page, since the
 * dots alone aren't a great primary interaction on a full canvas.
 */
export function SpaceIndicator() {
  const spaces = useLaunchpadStore((state) => state.spaces);
  const activeSpaceIndex = useLaunchpadStore((state) => state.activeSpaceIndex);
  const setActiveSpaceIndex = useLaunchpadStore((state) => state.setActiveSpaceIndex);
  const goToNextSpace = useLaunchpadStore((state) => state.goToNextSpace);
  const goToPrevSpace = useLaunchpadStore((state) => state.goToPrevSpace);
  const isSearchOpen = useLaunchpadStore((state) => state.isSearchOpen);

  useEffect(() => {
    if (isSearchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goToNextSpace();
      if (event.key === 'ArrowLeft') goToPrevSpace();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSearchOpen, goToNextSpace, goToPrevSpace]);

  if (spaces.length <= 1) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-20 z-20 flex justify-center gap-1.5">
      {spaces.map((space, index) => (
        <button
          key={space.id}
          aria-label={`Go to ${space.name}`}
          aria-current={index === activeSpaceIndex}
          onClick={() => setActiveSpaceIndex(index)}
          className="p-1.5"
        >
          <span
            className={cn(
              'block h-1.5 w-1.5 rounded-full transition-all duration-200',
              index === activeSpaceIndex ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'bg-white/30 hover:bg-white/50',
            )}
          />
        </button>
      ))}
    </div>
  );
}
