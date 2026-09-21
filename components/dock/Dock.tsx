import { DEFAULT_FOLDER_COLOR } from "@/lib/folderColors";
import { cn, isRecentDrag } from "@/lib/utils";
import {
  selectDockFolders,
  selectFolderChildren,
  useLaunchpadStore,
} from "@/store/useLaunchpadStore";
import type { FolderItem, LaunchpadItem, ShortcutItem } from "@/types";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Folder } from "../folder/Folder";
import { FolderColorPicker } from "../folder/FolderColorPicker";

function DockTooltip({
  label,
  isOpen,
  targetRef,
}: {
  label: string;
  isOpen: boolean;
  targetRef: React.RefObject<HTMLElement | null>;
}) {
  const [coords, setCoords] = useState<{ left: number; bottom: number } | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        setCoords({
          left: rect.left + rect.width / 2,
          bottom: window.innerHeight - rect.top + 16,
        });
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, targetRef]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && coords && (
        <div
          style={{
            position: "fixed",
            left: coords.left,
            bottom: coords.bottom,
            zIndex: 9999,
          }}
          className="pointer-events-none -translate-x-1/2 flex items-center justify-center whitespace-nowrap"
        >
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.96 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="rounded-lg bg-[#121215]/80 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/90 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl select-none"
          >
            {label}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const DockFolderItem = memo(function DockFolderItem({
  folder,
  items,
  openFolderId,
  dockMagnification,
  onOpenFolder,
  onCloseFolder,
}: {
  folder: FolderItem;
  items: LaunchpadItem[];
  openFolderId: string | null;
  dockMagnification?: boolean;
  onOpenFolder: (id: string, origin?: { x: number; y: number }) => void;
  onCloseFolder: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [folderTitle, setFolderTitle] = useState(folder.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const folderButtonRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    if (folderButtonRef.current) {
      setTriggerRect(folderButtonRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    if (!isHovered && !isColorPickerOpen) return;
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isHovered, isColorPickerOpen, updateRect]);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const updateItem = useLaunchpadStore((state) => state.updateItem);
  const deleteItem = useLaunchpadStore((state) => state.deleteItem);
  const isDragOver = useLaunchpadStore(
    (state) => state.dragOverFolderId === folder.id,
  );

  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const colorCommitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingColorRef = useRef<string | null>(null);

  const isActive = openFolderId === folder.id;
  const folderColor = previewColor ?? folder.color ?? DEFAULT_FOLDER_COLOR;
  const folderChildren = selectFolderChildren(items, folder).filter(
    (item): item is ShortcutItem => item.type === "shortcut",
  );

  const handleColorChange = useCallback(
    (newColor: string) => {
      setPreviewColor(newColor);
      pendingColorRef.current = newColor;

      if (colorCommitTimeoutRef.current) {
        clearTimeout(colorCommitTimeoutRef.current);
      }

      colorCommitTimeoutRef.current = setTimeout(() => {
        if (pendingColorRef.current) {
          updateItem(folder.id, { color: pendingColorRef.current });
          pendingColorRef.current = null;
        }
      }, 200);
    },
    [folder.id, updateItem],
  );

  useEffect(() => {
    if (!isColorPickerOpen && pendingColorRef.current) {
      if (colorCommitTimeoutRef.current) {
        clearTimeout(colorCommitTimeoutRef.current);
      }
      updateItem(folder.id, { color: pendingColorRef.current });
      pendingColorRef.current = null;
      setPreviewColor(null);
    }
  }, [isColorPickerOpen, folder.id, updateItem]);

  useEffect(() => {
    return () => {
      if (colorCommitTimeoutRef.current) {
        clearTimeout(colorCommitTimeoutRef.current);
        if (pendingColorRef.current) {
          updateItem(folder.id, { color: pendingColorRef.current });
        }
      }
    };
  }, [folder.id, updateItem]);

  useEffect(() => {
    if (pendingColorRef.current === null) {
      setPreviewColor(null);
    }
  }, [folder.color]);

  useEffect(() => {
    setFolderTitle(folder.title);
  }, [folder.title]);

  const handleTitleSubmit = () => {
    const trimmed = folderTitle.trim();
    if (trimmed && trimmed !== folder.title) {
      updateItem(folder.id, { title: trimmed });
    } else {
      setFolderTitle(folder.title);
    }
    setIsEditingTitle(false);
  };

  useEffect(() => {
    if (!isColorPickerOpen) return;
    const handleClickOutside = (e: PointerEvent | MouseEvent) => {
      if (
        (containerRef.current &&
          containerRef.current.contains(e.target as Node)) ||
        (colorPickerRef.current &&
          colorPickerRef.current.contains(e.target as Node))
      ) {
        return;
      }
      setIsColorPickerOpen(false);
    };
    const handleContextMenuOutside = (e: MouseEvent) => {
      if (
        (containerRef.current &&
          containerRef.current.contains(e.target as Node)) ||
        (colorPickerRef.current &&
          colorPickerRef.current.contains(e.target as Node))
      ) {
        return;
      }
      e.preventDefault();
      setIsColorPickerOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsColorPickerOpen(false);
    };
    window.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("contextmenu", handleContextMenuOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("contextmenu", handleContextMenuOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isColorPickerOpen]);

  const handleClick = () => {
    if (isActive) {
      onCloseFolder();
    } else {
      if (folderButtonRef.current) {
        const rect = folderButtonRef.current.getBoundingClientRect();
        onOpenFolder(folder.id, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      } else {
        onOpenFolder(folder.id);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center shrink-0"
      onMouseEnter={() => {
        if (folderButtonRef.current) {
          setTriggerRect(folderButtonRef.current.getBoundingClientRect());
        }
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => {
        if (
          colorPickerRef.current &&
          colorPickerRef.current.contains(e.target as Node)
        ) {
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (folderButtonRef.current) {
          setTriggerRect(folderButtonRef.current.getBoundingClientRect());
        }
        setIsColorPickerOpen((prev) => !prev);
      }}
    >
      {/* Portaled Tooltip on hover (hidden when color picker is open) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isHovered && !isColorPickerOpen && triggerRect && (
              <div
                style={{
                  position: "fixed",
                  left: triggerRect.left + triggerRect.width / 2,
                  bottom: window.innerHeight - triggerRect.top + 16,
                  zIndex: 9999,
                }}
                className="pointer-events-none -translate-x-1/2 flex items-center justify-center whitespace-nowrap"
              >
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 2, scale: 0.96 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-[#121215]/80 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/90 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl whitespace-nowrap select-none"
                >
                  <span>{folder.title}</span>
                  <button
                    type="button"
                    title="Change folder color"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (folderButtonRef.current) {
                        setTriggerRect(
                          folderButtonRef.current.getBoundingClientRect(),
                        );
                      }
                      setIsColorPickerOpen((prev) => !prev);
                    }}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/15 transition-all cursor-pointer"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-white/40 shadow-sm"
                      style={{ backgroundColor: folderColor }}
                    />
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Portaled Color Customizer Popover */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isColorPickerOpen && triggerRect && (
              <div
                style={{
                  position: "fixed",
                  left: Math.max(
                    148,
                    Math.min(
                      window.innerWidth - 148,
                      triggerRect.left + triggerRect.width / 2,
                    ),
                  ),
                  bottom: window.innerHeight - triggerRect.top + 16,
                  zIndex: 10000,
                }}
                className="-translate-x-1/2"
              >
                <motion.div
                  ref={colorPickerRef}
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  className="w-[276px] overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#121215]/75 p-2.5 shadow-[0_28px_80px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.09)] backdrop-blur-3xl text-white select-none"
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.stopPropagation()}
                >
                  {/* Subtle Top Specular / Ambient Rim */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                  {/* Header */}
                  <div className="flex items-center justify-between px-0.5 pb-2 mb-2 border-b border-white/[0.08] min-h-[30px]">
                    {isEditingTitle ? (
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                        <span
                          className="h-3 w-3 rounded-full border border-white/30 shadow-sm shrink-0"
                          style={{ backgroundColor: folderColor }}
                        />
                        <input
                          ref={titleInputRef}
                          type="text"
                          value={folderTitle}
                          onChange={(e) => setFolderTitle(e.target.value)}
                          onBlur={handleTitleSubmit}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleTitleSubmit();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              setFolderTitle(folder.title);
                              setIsEditingTitle(false);
                            }
                          }}
                          className="w-full bg-white/10 text-xs text-white px-1.5 py-0.5 rounded border border-white/20 outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div
                        className="group flex items-center gap-1.5 min-w-0 flex-1 mr-2 cursor-pointer"
                        onClick={() => {
                          setIsEditingTitle(true);
                          setTimeout(() => titleInputRef.current?.select(), 0);
                        }}
                        title="Click to rename folder"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-white/30 shadow-sm shrink-0"
                          style={{ backgroundColor: folderColor }}
                        />
                        <span className="text-xs font-medium text-white/90 truncate">
                          {folder.title}
                        </span>
                        <svg
                          className="w-3 h-3 text-white/40 group-hover:text-white/70 transition-colors shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsColorPickerOpen(false)}
                      aria-label="Close"
                      className="flex h-5 w-5 items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Presets & Custom Color Picker */}
                  <FolderColorPicker
                    value={folderColor}
                    onChange={handleColorChange}
                    onDelete={() => {
                      if (colorCommitTimeoutRef.current) {
                        clearTimeout(colorCommitTimeoutRef.current);
                      }
                      pendingColorRef.current = null;
                      deleteItem(folder.id);
                      setIsColorPickerOpen(false);
                    }}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Main Folder Item Button */}
      <motion.div
        ref={folderButtonRef}
        data-dock-folder-id={folder.id}
        role="button"
        tabIndex={0}
        aria-label={`Open folder ${folder.title}`}
        aria-current={isActive ? "page" : undefined}
        whileTap={{ scale: 0.94 }}
        whileHover={
          dockMagnification && !isDragOver
            ? {
                scale: 1.18,
                y: -4,
                transition: { type: "spring", stiffness: 450, damping: 25 },
              }
            : undefined
        }
        onPointerDown={(e) => {
          if (e.pointerType === "touch") {
            isLongPressTriggeredRef.current = false;
            touchStartPosRef.current = { x: e.clientX, y: e.clientY };
            clearLongPress();
            longPressTimerRef.current = setTimeout(() => {
              isLongPressTriggeredRef.current = true;
              if (folderButtonRef.current) {
                setTriggerRect(folderButtonRef.current.getBoundingClientRect());
              }
              setIsColorPickerOpen((prev) => !prev);
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try {
                  navigator.vibrate(10);
                } catch {}
              }
            }, 500);
          }
        }}
        onPointerMove={(e) => {
          if (touchStartPosRef.current) {
            const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
            const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
            if (dx > 8 || dy > 8) {
              clearLongPress();
            }
          }
        }}
        onPointerUp={() => {
          clearLongPress();
          touchStartPosRef.current = null;
        }}
        onPointerCancel={() => {
          clearLongPress();
          touchStartPosRef.current = null;
        }}
        onClick={(e) => {
          if (isLongPressTriggeredRef.current) {
            isLongPressTriggeredRef.current = false;
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (isRecentDrag(600)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          handleClick();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "relative flex h-10 w-12 shrink-0 items-center justify-center rounded-[14px] transition-all duration-200 cursor-pointer",
          isActive
            ? "text-white"
            : "text-white/70 hover:text-white hover:bg-white/[0.08] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] active:bg-white/[0.12]",
        )}
      >
        {isActive && (
          <motion.div
            layoutId="dock-active-pill"
            className="absolute inset-0 rounded-[14px] bg-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <div
          className="relative z-10 flex items-center justify-center transition-transform duration-200 ease-out pointer-events-none"
          style={{
            width: 208.65,
            height: 175.5,
            transform: "scale(0.23)",
            transformOrigin: "center center",
          }}
        >
          <Folder
            color={folderColor}
            size="sm"
            items={folderChildren}
            isHovered={isHovered || isDragOver}
            isOpen={isActive || isDragOver}
          />
        </div>
      </motion.div>
    </div>
  );
});

export function Dock() {
  const items = useLaunchpadStore((state) => state.items);
  const dockIds = useLaunchpadStore((state) => state.dockIds);
  const openFolderId = useLaunchpadStore((state) => state.openFolderId);
  const openFolder = useLaunchpadStore((state) => state.openFolder);
  const closeFolder = useLaunchpadStore((state) => state.closeFolder);
  const reorderDock = useLaunchpadStore((state) => state.reorderDock);
  const setSettingsOpen = useLaunchpadStore((state) => state.setSettingsOpen);
  const setAddModalOpen = useLaunchpadStore((state) => state.setAddModalOpen);
  const dockMagnification = useLaunchpadStore(
    (state) => state.settings?.dockMagnification ?? true,
  );
  const spaces = useLaunchpadStore((state) => state.spaces);
  const activeSpaceIndex = useLaunchpadStore((state) => state.activeSpaceIndex);
  const spacesEnabled = useLaunchpadStore(
    (state) => state.settings?.spacesEnabled ?? false,
  );
  const activeSpace = spaces[activeSpaceIndex] ??
    spaces[0] ?? { id: "space-home", name: "Home" };

  const dockFolders = useMemo(() => {
    const all = selectDockFolders(items, dockIds);
    return spacesEnabled
      ? all.filter((f) => f.spaceId === activeSpace.id)
      : all;
  }, [items, dockIds, spacesEnabled, activeSpace.id]);

  const isHomeActive = openFolderId === null;
  const isHomeDragOver = useLaunchpadStore(
    (state) => state.dragOverFolderId === "home",
  );
  const [isHomeHovered, setIsHomeHovered] = useState(false);
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);

  const homeButtonRef = useRef<HTMLButtonElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const dockRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dock = dockRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!dock || !scrollEl) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (scrollEl.scrollWidth > scrollEl.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          scrollEl.scrollLeft += e.deltaY;
        }
      }
    };

    dock.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      dock.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3.5 z-20 flex justify-center px-6">
      <div
        ref={dockRef}
        data-dock="true"
        className={cn(
          "pointer-events-auto relative flex h-[52px] max-w-[calc(100vw-48px)] items-center rounded-[20px] bg-[#121215]/75 p-1.5 shadow-[0_28px_80px_-15px_rgba(0,0,0,0.7)] backdrop-blur-3xl",
          dockFolders.length === 0 && "gap-3.5",
        )}
      >

        {/* Home Destination Button (Fixed Left) */}
        <div
          className="relative flex flex-col items-center shrink-0"
          onMouseEnter={() => setIsHomeHovered(true)}
          onMouseLeave={() => setIsHomeHovered(false)}
        >
          <DockTooltip
            label="Home"
            isOpen={isHomeHovered}
            targetRef={homeButtonRef}
          />

          <motion.button
            ref={homeButtonRef}
            type="button"
            data-dock-home="true"
            whileTap={{ scale: 0.94 }}
            onClick={(e) => {
              if (isRecentDrag(600)) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              closeFolder();
            }}
            aria-label="Home Screen"
            aria-current={isHomeActive ? "page" : undefined}
            className={cn(
              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] transition-all duration-200 cursor-pointer",
              isHomeActive
                ? "text-white"
                : "text-white/60 hover:text-white hover:bg-white/[0.08] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] active:bg-white/[0.12]",
            )}
          >
            {isHomeActive && (
              <motion.div
                layoutId="dock-active-pill"
                className="absolute inset-0 rounded-[14px] bg-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <svg
              className="relative z-10 transition-colors duration-200"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9.5 9-7 9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </motion.button>
        </div>

        {/* User Folders (Scrollable Track between Home & Settings) */}
        {dockFolders.length > 0 && (
          <div
            ref={scrollContainerRef}
            className="no-scrollbar flex min-w-0 flex-auto h-full items-center overflow-x-auto scroll-smooth py-0 px-3"
          >
            <Reorder.Group
              as="div"
              axis="x"
              values={dockFolders.map((f) => f.id)}
              onReorder={reorderDock}
              className="flex items-center gap-3.5 shrink-0"
            >
              {dockFolders.map((folder) => (
                <Reorder.Item
                  key={folder.id}
                  value={folder.id}
                  as="div"
                  className="cursor-grab active:cursor-grabbing touch-none shrink-0"
                  whileDrag={{ scale: 1.04, zIndex: 30 }}
                >
                  <DockFolderItem
                    folder={folder}
                    items={items}
                    openFolderId={openFolderId}
                    dockMagnification={dockMagnification}
                    onOpenFolder={openFolder}
                    onCloseFolder={closeFolder}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}

        {/* Action Controls: Add Shortcut and Settings (Fixed Right) */}
        <div className="flex shrink-0 items-center gap-3.5">
          {/* Add (+) Button */}
          <div
            className="relative flex flex-col items-center shrink-0"
            onMouseEnter={() => setIsAddHovered(true)}
            onMouseLeave={() => setIsAddHovered(false)}
          >
            <DockTooltip
              label="Add Shortcut"
              isOpen={isAddHovered}
              targetRef={addButtonRef}
            />

            <motion.button
              ref={addButtonRef}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setAddModalOpen(true)}
              aria-label="Add Bookmark or Folder"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-white/55 transition-all duration-200 hover:text-white hover:bg-white/[0.08] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] active:bg-white/[0.12] cursor-pointer"
            >
              <svg
                className="relative z-10 transition-colors duration-200"
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
          </div>

          {/* Settings Button */}
          <div
            className="relative flex flex-col items-center shrink-0"
            onMouseEnter={() => setIsSettingsHovered(true)}
            onMouseLeave={() => setIsSettingsHovered(false)}
          >
            <DockTooltip
              label="Settings"
              isOpen={isSettingsHovered}
              targetRef={settingsButtonRef}
            />

            <motion.button
              ref={settingsButtonRef}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setSettingsOpen(true)}
              aria-label="Launchpad Settings"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-white/55 transition-all duration-200 hover:text-white hover:bg-white/[0.08] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] active:bg-white/[0.12] cursor-pointer"
            >
              <svg
                className="relative z-10 transition-colors duration-200"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
