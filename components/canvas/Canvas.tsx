import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Shortcut } from '../shortcut/Shortcut';
import { Folder } from '../folder/Folder';
import { useLaunchpadStore, selectSpaceItems } from '@/store/useLaunchpadStore';

import { useCanvasGrid, resolveItemPosition } from '@/lib/layout';

/**
 * The main canvas surface for the active space. Shortcuts and folders are
 * positioned within this container (see `useCanvasDrag`), and
 * the surface slides horizontally when the active space changes.
 */
export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const items = useLaunchpadStore((state) => state.items);
  const spaces = useLaunchpadStore((state) => state.spaces);
  const activeSpaceIndex = useLaunchpadStore((state) => state.activeSpaceIndex);
  const activeSpace = spaces[activeSpaceIndex] ?? spaces[0];
  const gridColumns = useLaunchpadStore((state) => state.settings?.gridColumns ?? 'auto');

  const { columns } = useCanvasGrid(canvasRef, gridColumns);

  if (!activeSpace) return null; // no spaces configured — nothing to render

  const spaceItems = selectSpaceItems(items, activeSpace.id);

  return (
    <div ref={canvasRef} className="relative h-full w-full select-none overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeSpace.id}
          className="absolute inset-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {spaceItems.map((item, index) => {
            const position = resolveItemPosition(item, index, columns);
            return item.type === 'shortcut' ? (
              <Shortcut
                key={item.id}
                item={item}
                position={position}
                canvasRef={canvasRef}
                columns={columns}
              />
            ) : (
              <Folder
                key={item.id}
                item={item}
                position={position}
                canvasRef={canvasRef}
                columns={columns}
              />
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
