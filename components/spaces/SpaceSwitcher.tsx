import { useEffect } from "react";
import { motion } from "motion/react";
import { useLaunchpadStore } from "@/store/useLaunchpadStore";

export function SpaceSwitcher() {
  const spaces = useLaunchpadStore((state) => state.spaces);
  const activeSpaceIndex = useLaunchpadStore((state) => state.activeSpaceIndex);
  const switchSpace = useLaunchpadStore((state) => state.switchSpace);
  const spacesEnabled = useLaunchpadStore(
    (state) => state.settings?.spacesEnabled ?? false,
  );
  const isSearchOpen = useLaunchpadStore((state) => state.isSearchOpen);
  const isSettingsOpen = useLaunchpadStore((state) => state.isSettingsOpen);
  const isAddModalOpen = useLaunchpadStore((state) => state.isAddModalOpen);

  // Keyboard navigation: Alt + 1..9 switches space
  useEffect(() => {
    if (!spacesEnabled || isSearchOpen || isSettingsOpen || isAddModalOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.altKey && e.key >= "1" && e.key <= "9") {
        const targetIndex = parseInt(e.key, 10) - 1;
        if (targetIndex < spaces.length) {
          e.preventDefault();
          switchSpace(targetIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    spacesEnabled,
    spaces.length,
    switchSpace,
    isSearchOpen,
    isSettingsOpen,
    isAddModalOpen,
  ]);

  // When spaces are disabled, do not render any UI
  if (!spacesEnabled) return null;

  return (
    <div
      role="tablist"
      aria-label="Spaces"
      className="pointer-events-auto fixed top-3.5 left-6 z-20 flex items-center gap-1 rounded-[14px] border border-white/10 bg-[#141414]/85 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl select-none"
    >
      {spaces.map((space, index) => {
        const isActive = activeSpaceIndex === index;
        const isHome = space.id === "space-home";

        return (
          <button
            key={space.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`${space.name} space (Alt+${index + 1})`}
            title={`${space.name} (Alt+${index + 1})`}
            onClick={() => switchSpace(index)}
            className={`relative flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
              isActive
                ? "text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-space-pill"
                className="absolute inset-0 rounded-[10px] bg-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)]"
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 35,
                }}
              />
            )}

            <span className="relative z-10 shrink-0 opacity-70">
              {isHome ? (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 9.5 9-7 9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              ) : (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
              )}
            </span>

            <span className="relative z-10 truncate max-w-[120px]">
              {space.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
