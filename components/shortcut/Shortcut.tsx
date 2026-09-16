import { useState, useRef, useEffect, type RefObject } from 'react';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { Tile } from './Tile';
import { useCanvasDrag } from '@/hooks/useCanvasDrag';
import { useLaunchpadStore } from '@/store/useLaunchpadStore';
import { cn, getHostname } from '@/lib/utils';
import type { ShortcutItem } from '@/types';

interface ShortcutProps {
  item: ShortcutItem;
  position: { x: number; y: number };
  canvasRef: RefObject<HTMLDivElement | null>;
  columns?: number;
  index?: number;
  globalIndex?: number;
  isFolderView?: boolean;
  folderOrigin?: { x: number; y: number } | null;
}

export function Shortcut({
  item,
  position,
  canvasRef,
  columns,
  index = 0,
  globalIndex,
  isFolderView = false,
  folderOrigin,
}: ShortcutProps) {
  const reorderCanvasItems = useLaunchpadStore((state) => state.reorderCanvasItems);
  const updateItem = useLaunchpadStore((state) => state.updateItem);
  const deleteItem = useLaunchpadStore((state) => state.deleteItem);
  const activeShortcutMenuId = useLaunchpadStore((state) => state.activeShortcutMenuId);
  const setActiveShortcutMenuId = useLaunchpadStore((state) => state.setActiveShortcutMenuId);
  const hoveredShortcutId = useLaunchpadStore((state) => state.hoveredShortcutId);
  const setHoveredShortcutId = useLaunchpadStore((state) => state.setHoveredShortcutId);

  const isMenuOpen = activeShortcutMenuId === item.id;
  const isHovered = hoveredShortcutId === item.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [isPressed, setIsPressed] = useState(false);
  const [hoveredMenuIndex, setHoveredMenuIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const lastContextMenuTime = useRef(0);
  const dragControls = useDragControls();

  const pageOffset = globalIndex !== undefined && index !== undefined ? globalIndex - index : 0;

  const { dragHandlers, handleActivate, isDragging, x, y } = useCanvasDrag({
    id: item.id,
    canvasRef,
    columns,
    pageOffset,
    onReorder: (targetIndex) => reorderCanvasItems(item.id, targetIndex),
    onActivate: () => window.open(item.url, '_blank', 'noopener,noreferrer'),
  });

  useEffect(() => {
    setEditTitle(item.title);
  }, [item.title]);

  useEffect(() => {
    if (!isMenuOpen) {
      setIsEditing(false);
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (Date.now() - lastContextMenuTime.current < 400) return;
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        return;
      }
      setActiveShortcutMenuId(null);
      setIsEditing(false);
    };
    const handleContextMenuOutside = (e: MouseEvent) => {
      if (Date.now() - lastContextMenuTime.current < 400) return;
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        return;
      }
      // Do not e.preventDefault() here so other shortcuts can immediately receive contextmenu on 1st click
      setActiveShortcutMenuId(null);
      setIsEditing(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveShortcutMenuId(null);
        setIsEditing(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('contextmenu', handleContextMenuOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('contextmenu', handleContextMenuOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen, setActiveShortcutMenuId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        updateItem(item.id, { customIcon: dataUrl });
      }
      setActiveShortcutMenuId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRenameSubmit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== item.title) {
      updateItem(item.id, { title: trimmed });
    } else {
      setEditTitle(item.title);
    }
    setIsEditing(false);
    setActiveShortcutMenuId(null);
  };

  const handleDelete = () => {
    deleteItem(item.id);
    setActiveShortcutMenuId(null);
  };

  const handleResetFavicon = () => {
    updateItem(item.id, { customIcon: null });
    setActiveShortcutMenuId(null);
  };

  // Calculate physical trajectory offset from dock folder to resting position
  const canvasRect = canvasRef.current?.getBoundingClientRect();
  const canvasWidth =
    canvasRect?.width ||
    (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const canvasHeight =
    canvasRect?.height ||
    (typeof window !== 'undefined' ? window.innerHeight : 800);
  const canvasLeft = canvasRect?.left || 0;
  const canvasTop = canvasRect?.top || 0;

  const targetPxX = position.x * canvasWidth;
  const targetPxY = position.y * canvasHeight;

  const originPxX = folderOrigin
    ? folderOrigin.x - canvasLeft
    : canvasWidth / 2;
  const originPxY = folderOrigin
    ? folderOrigin.y - canvasTop
    : canvasHeight - 24;

  const deltaX = originPxX - targetPxX;
  const deltaY = originPxY - targetPxY;

  const isNearBottom = position.y > 0.72;
  const isNearRight = position.x > 0.82;
  const isNearLeft = position.x < 0.18;

  return (
    <motion.div
      ref={containerRef}
      layout
      onMouseEnter={() => setHoveredShortcutId(item.id)}
      onMouseLeave={() => {
        if (hoveredShortcutId === item.id) {
          setHoveredShortcutId(null);
        }
        setIsPressed(false);
      }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2",
        isMenuOpen ? "z-50" : "z-0"
      )}
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        zIndex: isMenuOpen ? 50 : undefined,
      }}
      initial={
        isFolderView
          ? {
              x: deltaX,
              y: deltaY,
              scale: 0.12,
              opacity: 0,
            }
          : {
              x: 0,
              y: 0,
              scale: 0.95,
              opacity: 0,
            }
      }
      animate={{
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
      }}
      exit={
        isFolderView
          ? {
              x: deltaX,
              y: deltaY,
              scale: 0.12,
              opacity: 0,
              transition: {
                duration: 0.22,
                ease: [0.32, 0, 0.67, 0],
                delay: index * 0.02,
              },
            }
          : {
              x: 0,
              y: 0,
              scale: 0.95,
              opacity: 0,
              transition: { duration: 0.16 },
            }
      }
      transition={
        isFolderView
          ? {
              type: 'spring',
              stiffness: 220,
              damping: 20,
              mass: 0.85,
              delay: index * 0.045,
            }
          : {
              duration: 0.2,
              ease: 'easeOut',
            }
      }
      onContextMenu={(e) => {
        if (menuRef.current && menuRef.current.contains(e.target as Node)) {
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        lastContextMenuTime.current = Date.now();
        setActiveShortcutMenuId(isMenuOpen ? null : item.id);
      }}
    >
      {/* Hover Edit Tooltip */}
      <AnimatePresence>
        {isHovered && !isDragging && !isPressed && !activeShortcutMenuId && (
          <motion.div
            initial={{ opacity: 0, y: 3, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.94 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center pointer-events-auto"
          >
            <button
              type="button"
              aria-label={`Edit ${item.title}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                lastContextMenuTime.current = Date.now();
                setHoveredShortcutId(null);
                setActiveShortcutMenuId(item.id);
              }}
              className="group/edit-tooltip flex items-center gap-1.5 rounded-lg border border-white/20 bg-[#141414]/95 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-2xl hover:bg-white/20 hover:text-white hover:border-white/35 transition-all cursor-pointer whitespace-nowrap select-none"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/60 group-hover/edit-tooltip:text-white transition-colors"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              <span>Edit</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        role="link"
        tabIndex={0}
        aria-label={`Open ${item.title}`}
        data-tile-id={item.id}
        className={cn(
          "flex w-16 flex-col items-center gap-1.5 relative select-none",
          isDragging ? "cursor-grabbing" : "cursor-pointer active:cursor-grabbing"
        )}
        style={{ x, y }}
        drag={!isMenuOpen}
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0.05}
        whileHover={isMenuOpen ? undefined : { scale: 1.05 }}
        whileTap={isMenuOpen ? undefined : { scale: 0.96 }}
        whileDrag={{ scale: 1.08, zIndex: 50 }}
        {...dragHandlers}
        onPointerDown={(e) => {
          setIsPressed(true);
          if (e.button === 0) {
            dragControls.start(e);
          }
        }}
        onPointerUp={() => setIsPressed(false)}
        onPointerCancel={() => setIsPressed(false)}
        onClick={() => {
          if (Date.now() - lastContextMenuTime.current < 400) {
            return;
          }
          if (isMenuOpen) {
            setActiveShortcutMenuId(null);
            return;
          }
          handleActivate();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            if (isMenuOpen) {
              setActiveShortcutMenuId(null);
              return;
            }
            handleActivate();
          }
        }}
      >
        <Tile
          title={item.title}
          url={item.url}
          customIcon={item.customIcon}
          accent={item.accent}
          size="lg"
        />
        <span className="max-w-[4.75rem] truncate text-center text-[11px] font-normal tracking-tight text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">
          {item.title}
        </span>
        <span className="sr-only">{getHostname(item.url)}</span>
      </motion.div>

      {/* Context Menu Popover */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.94, y: isNearBottom ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: isNearBottom ? 4 : -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
            className={cn(
              "absolute z-50 w-44 overflow-hidden rounded-xl border border-white/15 bg-[#141414]/96 p-1 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.75)] backdrop-blur-2xl select-none",
              isNearBottom ? "bottom-full mb-2" : "top-full mt-2",
              isNearRight ? "right-0" : isNearLeft ? "left-0" : "left-1/2 -translate-x-1/2",
            )}
          >
            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRenameSubmit();
                }}
                className="flex flex-col gap-2 p-1.5"
              >
                <span className="text-[11px] font-medium text-white/50 px-0.5">Edit Name</span>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditTitle(item.title);
                      setIsEditing(false);
                    }
                  }}
                  className="w-full rounded-md border border-white/20 bg-white/[0.08] px-2 py-1 text-[12px] font-medium text-white focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20"
                  autoFocus
                  maxLength={32}
                />
                <div className="flex justify-end gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTitle(item.title);
                      setIsEditing(false);
                    }}
                    className="px-2 py-1 rounded text-[11px] text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-md bg-[#FA1E76] hover:bg-[#ff3086] active:bg-[#e01666] text-[11px] font-medium text-white shadow-[0_2px_10px_rgba(250,30,118,0.35)] transition-all cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-0.5" onMouseLeave={() => setHoveredMenuIndex(null)}>
                {/* Edit Name */}
                <div className="relative">
                  {hoveredMenuIndex === 0 && (
                    <motion.div
                      layoutId="ctx-menu-highlight"
                      className="absolute inset-0 rounded-lg bg-white/10"
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredMenuIndex(0)}
                    onClick={() => {
                      setIsEditing(true);
                      setTimeout(() => titleInputRef.current?.focus(), 15);
                    }}
                    className="relative flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-white/90 text-left cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60 shrink-0">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                    <span>Edit Name</span>
                  </button>
                </div>

                {/* Upload Favicon */}
                <div className="relative">
                  {hoveredMenuIndex === 1 && (
                    <motion.div
                      layoutId="ctx-menu-highlight"
                      className="absolute inset-0 rounded-lg bg-white/10"
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredMenuIndex(1)}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-white/90 text-left cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60 shrink-0">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Upload Favicon</span>
                  </button>
                </div>

                {/* Reset Favicon (if custom icon exists) */}
                {item.customIcon && (
                  <div className="relative">
                    {hoveredMenuIndex === 2 && (
                      <motion.div
                        layoutId="ctx-menu-highlight"
                        className="absolute inset-0 rounded-lg bg-white/10"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredMenuIndex(2)}
                      onClick={handleResetFavicon}
                      className="relative flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[11px] text-white/60 text-left cursor-pointer"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                      <span>Reset Favicon</span>
                    </button>
                  </div>
                )}

                {/* Divider */}
                <div className="my-1 border-t border-white/10" />

                {/* Delete */}
                <div className="relative">
                  {hoveredMenuIndex === 3 && (
                    <motion.div
                      layoutId="ctx-menu-highlight"
                      className="absolute inset-0 rounded-lg bg-red-500/15"
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredMenuIndex(3)}
                    onClick={handleDelete}
                    className="relative flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-red-400 text-left cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input for custom favicon upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        aria-hidden="true"
      />
    </motion.div>
  );
}
