import { DEFAULT_FOLDER_COLOR } from "@/lib/folderColors";
import { cn } from "@/lib/utils";
import {
  selectDockFolders,
  selectFolderChildren,
  useLaunchpadStore,
} from "@/store/useLaunchpadStore";
import type { FolderItem, LaunchpadItem, ShortcutItem } from "@/types";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { useEffect, useRef, useState, memo, useMemo } from "react";
import { Folder } from "../folder/Folder";
import { FolderColorPicker } from "../folder/FolderColorPicker";

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
  const updateItem = useLaunchpadStore((state) => state.updateItem);
  const isDragOver = useLaunchpadStore(
    (state) => state.dragOverFolderId === folder.id,
  );

  const isActive = openFolderId === folder.id;
  const folderColor = folder.color || DEFAULT_FOLDER_COLOR;
  const folderChildren = selectFolderChildren(items, folder).filter(
    (item): item is ShortcutItem => item.type === "shortcut",
  );

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
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        containerRef.current.contains(e.target as Node)
      ) {
        return;
      }
      setIsColorPickerOpen(false);
    };
    const handleContextMenuOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        containerRef.current.contains(e.target as Node)
      ) {
        return;
      }
      e.preventDefault();
      setIsColorPickerOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsColorPickerOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("contextmenu", handleContextMenuOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
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
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
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
        setIsColorPickerOpen((prev) => !prev);
      }}
    >
      {/* Tooltip on hover (hidden when color picker is open) */}
      <AnimatePresence>
        {isHovered && !isColorPickerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.96 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute -top-9.5 z-40 flex items-center justify-center pointer-events-auto"
          >
            <div className="flex items-center gap-1.5 rounded-lg bg-[#141414]/98 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/90 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl whitespace-nowrap select-none">
              <span>{folder.title}</span>
              <button
                type="button"
                title="Change folder color"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsColorPickerOpen((prev) => !prev);
                }}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/15 transition-all cursor-pointer"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: folderColor }}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color Customizer Popover */}
      <AnimatePresence>
        {isColorPickerOpen && (
          <motion.div
            ref={colorPickerRef}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute bottom-13 z-50 w-[276px] overflow-hidden rounded-xl border border-white/10 bg-[#141414]/98 p-2.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl select-none"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-0.5 pb-2 mb-2 border-b border-white/10 min-h-[30px]">
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
                    className="w-full bg-white/[0.10] border border-white/20 rounded px-1.5 py-0.5 text-[12px] font-medium text-white focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20"
                    autoFocus
                    maxLength={32}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 mr-2">
                  <span
                    className="h-3 w-3 rounded-full border border-white/30 shadow-sm shrink-0"
                    style={{ backgroundColor: folderColor }}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setIsEditingTitle(true);
                      setTimeout(() => titleInputRef.current?.focus(), 10);
                    }}
                    title="Click to rename"
                    className="group inline-flex items-center gap-1.5 max-w-[190px] px-1.5 py-0.5 rounded-md hover:bg-white/[0.08] cursor-pointer transition-colors"
                  >
                    <span className="text-[12px] font-medium text-white/90 truncate">
                      {folder.title}
                    </span>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/45 group-hover:text-white/85 transition-colors shrink-0"
                    >
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsColorPickerOpen(false)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            {/* Presets & Custom Color Picker */}
            <FolderColorPicker
              value={folderColor}
              onChange={(newColor) =>
                updateItem(folder.id, { color: newColor })
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={folderButtonRef}
        role="button"
        tabIndex={0}
        data-dock-folder-id={folder.id}
        aria-label={`${folder.title} folder`}
        aria-current={isActive ? "page" : undefined}
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          if (isColorPickerOpen) {
            setIsColorPickerOpen(false);
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
            isOpen={isActive}
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
  const spacesEnabled = useLaunchpadStore((state) => state.settings?.spacesEnabled ?? false);
  const activeSpace = spaces[activeSpaceIndex] ?? spaces[0] ?? { id: 'space-home', name: 'Home' };

  const dockFolders = useMemo(() => {
    const all = selectDockFolders(items, dockIds);
    return spacesEnabled ? all.filter((f) => f.spaceId === activeSpace.id) : all;
  }, [items, dockIds, spacesEnabled, activeSpace.id]);
  const isHomeActive = openFolderId === null;
  const [isHomeHovered, setIsHomeHovered] = useState(false);
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3.5 z-20 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-[20px] border border-white/10 bg-[#141414]/94 px-3 py-1.5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        {/* Home Destination Button */}
        <div
          className="relative flex flex-col items-center"
          onMouseEnter={() => setIsHomeHovered(true)}
          onMouseLeave={() => setIsHomeHovered(false)}
        >
          <AnimatePresence>
            {isHomeHovered && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 2, scale: 0.96 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="pointer-events-none absolute -top-9.5 z-40 flex items-center justify-center whitespace-nowrap"
              >
                <div className="rounded-lg bg-[#141414]/98 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/90 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl select-none">
                  Home
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            data-dock-home="true"
            whileTap={{ scale: 0.94 }}
            onClick={() => closeFolder()}
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

        {/* User Folders (Reorderable) */}
        <Reorder.Group
          as="div"
          axis="x"
          values={dockFolders.map((f) => f.id)}
          onReorder={reorderDock}
          className="flex items-center gap-3"
        >
          {dockFolders.map((folder) => (
            <Reorder.Item
              key={folder.id}
              value={folder.id}
              as="div"
              className="cursor-grab active:cursor-grabbing"
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

        {/* Add (+) Button */}
        <div
          className="relative flex flex-col items-center"
          onMouseEnter={() => setIsAddHovered(true)}
          onMouseLeave={() => setIsAddHovered(false)}
        >
          <AnimatePresence>
            {isAddHovered && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 2, scale: 0.96 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="pointer-events-none absolute -top-9.5 z-40 flex items-center justify-center whitespace-nowrap"
              >
                <div className="rounded-lg bg-[#141414]/98 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/90 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl select-none">
                  Add Shortcut
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
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

        {/* Settings Button (Grid/Dots icon) */}
        <div
          className="relative flex flex-col items-center"
          onMouseEnter={() => setIsSettingsHovered(true)}
          onMouseLeave={() => setIsSettingsHovered(false)}
        >
          <AnimatePresence>
            {isSettingsHovered && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 2, scale: 0.96 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="pointer-events-none absolute -top-9.5 z-40 flex items-center justify-center whitespace-nowrap"
              >
                <div className="rounded-lg bg-[#141414]/98 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/90 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl select-none">
                  Settings
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
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
  );
}
