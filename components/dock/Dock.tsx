import { selectDockItems, useLaunchpadStore } from "@/store/useLaunchpadStore";
import { motion, Reorder } from "motion/react";
import { Tile } from "../shortcut/Tile";

export function Dock() {
  const items = useLaunchpadStore((state) => state.items);
  const dockIds = useLaunchpadStore((state) => state.dockIds);
  const reorderDock = useLaunchpadStore((state) => state.reorderDock);
  const setSettingsOpen = useLaunchpadStore((state) => state.setSettingsOpen);
  const setAddModalOpen = useLaunchpadStore((state) => state.setAddModalOpen);
  const dockMagnification = useLaunchpadStore(
    (state) => state.settings?.dockMagnification ?? true,
  );

  const dockItems = selectDockItems(items, dockIds);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3.5 z-20 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-[18px] border border-white/20 bg-white/[0.12] px-2.5 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.5),0_1px_0_1px_rgba(255,255,255,0.18)_inset] backdrop-blur-3xl">
        {/* User bookmark icons (Reorderable) */}
        <Reorder.Group
          as="div"
          axis="x"
          values={dockIds}
          onReorder={reorderDock}
          className="flex items-center gap-2"
        >
          {dockItems.map((item) => (
            <Reorder.Item
              key={item.id}
              value={item.id}
              as="div"
              whileHover={
                dockMagnification ? { scale: 1.15, y: -3 } : { scale: 1.05 }
              }
              whileTap={{ scale: 0.95 }}
              whileDrag={{ scale: 1.1, zIndex: 10 }}
              className="cursor-grab active:cursor-grabbing"
              onClick={() => {
                if (item.type === "shortcut") {
                  window.open(item.url, "_blank", "noopener,noreferrer");
                }
              }}
              title={item.title}
            >
              <Tile
                title={item.title}
                url={item.type === "shortcut" ? item.url : undefined}
                accent={item.accent}
                size="md"
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {/* Subtle vertical divider */}
        <div
          className="h-6 w-[1px] shrink-0 self-center bg-white/20 mx-0.5"
          aria-hidden="true"
        />

        {/* Add (+) Button */}
        <motion.button
          type="button"
          whileHover={
            dockMagnification ? { scale: 1.15, y: -3 } : { scale: 1.05 }
          }
          whileTap={{ scale: 0.95 }}
          onClick={() => setAddModalOpen(true)}
          title="Add Bookmark or Folder"
          aria-label="Add Bookmark or Folder"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[22.5%] border border-white/20 bg-white/[0.14] text-white/85 shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl transition-colors hover:bg-white/[0.22] hover:text-white active:bg-white/[0.28]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.button>

        {/* Settings Button (Grid/Dots icon) */}
        <motion.button
          type="button"
          whileHover={
            dockMagnification ? { scale: 1.15, y: -3 } : { scale: 1.05 }
          }
          whileTap={{ scale: 0.95 }}
          onClick={() => setSettingsOpen(true)}
          title="Launchpad Settings"
          aria-label="Launchpad Settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[22.5%] border border-white/20 bg-white/[0.14] text-white/85 shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl transition-colors hover:bg-white/[0.22] hover:text-white active:bg-white/[0.28]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="opacity-90"
          >
            <rect x="3" y="3" width="4.5" height="4.5" rx="1.2" />
            <rect x="9.75" y="3" width="4.5" height="4.5" rx="1.2" />
            <rect x="16.5" y="3" width="4.5" height="4.5" rx="1.2" />
            <rect x="3" y="9.75" width="4.5" height="4.5" rx="1.2" />
            <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1.2" />
            <rect x="16.5" y="9.75" width="4.5" height="4.5" rx="1.2" />
            <rect x="3" y="16.5" width="4.5" height="4.5" rx="1.2" />
            <rect x="9.75" y="16.5" width="4.5" height="4.5" rx="1.2" />
            <rect x="16.5" y="16.5" width="4.5" height="4.5" rx="1.2" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
