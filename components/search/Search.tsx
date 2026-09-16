import { getHostname, openShortcutUrl } from "@/lib/utils";
import { useLaunchpadStore, selectFolderChildren } from "@/store/useLaunchpadStore";
import { useColumns, PAGE_ROWS } from "@/lib/layout";
import type { FolderItem, LaunchpadItem, ShortcutItem } from "@/types";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useMemo } from "react";
import { Tile } from "../shortcut/Tile";
import { Folder } from "../folder/Folder";
import { DEFAULT_FOLDER_COLOR } from "@/lib/folderColors";

function getItemMatchScore(item: LaunchpadItem, q: string): number {
  const title = item.title.toLowerCase();

  if (item.type === "folder") {
    if (title === q) return 1000;
    if (title.startsWith(q)) return 850 - title.length;
    const words = title.split(/\s+/);
    const wordMatchIdx = words.findIndex((w) => w.startsWith(q));
    if (wordMatchIdx !== -1) return 750 - wordMatchIdx * 10;
    const idxInTitle = title.indexOf(q);
    if (idxInTitle !== -1) return 450 - idxInTitle;
    return 0;
  }

  const host = getHostname(item.url).toLowerCase();

  // Exact match
  if (title === q) return 1000;
  if (host === q) return 900;

  // Title starts with query
  if (title.startsWith(q)) return 800 - title.length;

  // Word in title starts with query
  const words = title.split(/\s+/);
  const wordMatchIdx = words.findIndex((w) => w.startsWith(q));
  if (wordMatchIdx !== -1) return 700 - wordMatchIdx * 10;

  // Hostname domain starts with query
  if (host.startsWith(q)) return 600;
  const hostParts = host.split(".");
  if (hostParts.some((p) => p.startsWith(q))) return 500;

  // Substring match in title
  const idxInTitle = title.indexOf(q);
  if (idxInTitle !== -1) return 400 - idxInTitle;

  // Substring match in hostname
  const idxInHost = host.indexOf(q);
  if (idxInHost !== -1) return 200 - idxInHost;

  return 0;
}

export function Search() {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLLIElement>(null);

  const items = useLaunchpadStore((state) => state.items);
  const isSearchOpen = useLaunchpadStore((state) => state.isSearchOpen);
  const searchQuery = useLaunchpadStore((state) => state.searchQuery);
  const setSearchOpen = useLaunchpadStore((state) => state.setSearchOpen);
  const setSearchQuery = useLaunchpadStore((state) => state.setSearchQuery);
  const openFolder = useLaunchpadStore((state) => state.openFolder);
  const openFolderId = useLaunchpadStore((state) => state.openFolderId);
  const activePageIndex = useLaunchpadStore((state) => state.activePageIndex);
  const gridColumns = useLaunchpadStore((state) => state.settings?.gridColumns ?? 'auto');
  const openLinks = useLaunchpadStore((state) => state.settings?.openLinks ?? 'newTab');

  const columns = useColumns(gridColumns);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Searchable items: both shortcuts and folders
  const searchableItems = useMemo(() => {
    return items.filter(
      (item): item is ShortcutItem | FolderItem =>
        item.type === "shortcut" || item.type === "folder",
    );
  }, [items]);

  const query = searchQuery.trim().toLowerCase();

  const results = useMemo(() => {
    if (!isSearchOpen && !query) {
      return [];
    }
    if (!query) {
      return searchableItems.slice(0, 8);
    }
    return searchableItems
      .map((item) => ({ item, score: getItemMatchScore(item, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [searchableItems, query, isSearchOpen]);

  // Reset selected index whenever search opens or query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [isSearchOpen, searchQuery]);

  // Auto-scroll selected item into view when navigating with arrow keys
  useEffect(() => {
    if (isSearchOpen && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isSearchOpen]);

  const openAndClose = (url: string) => {
    openShortcutUrl(url, openLinks);
    setSearchOpen(false);
    setSearchQuery("");
    inputRef.current?.blur();
  };

  const handleItemSelect = (item: LaunchpadItem) => {
    if (item.type === "folder") {
      openFolder(item.id);
      setSearchOpen(false);
      setSearchQuery("");
      inputRef.current?.blur();
    } else {
      openAndClose(item.url);
    }
  };

  // Global keyboard shortcuts (Ctrl/Cmd+K, "/", Escape, Alt+1-9)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      // Never hijack shortcuts while the user is typing in another input (e.g. rename, modals)
      if (isTyping && target !== inputRef.current) {
        return;
      }

      // Ctrl/Cmd + K -> focus the search bar
      const isCtrlOrCmdK =
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey;

      if (isCtrlOrCmdK) {
        event.preventDefault();
        setSearchOpen(true);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 20);
        return;
      }

      // "/" -> focus search when not already typing in an input
      if (
        event.key === "/" &&
        !isTyping &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setSearchOpen(true);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 20);
        return;
      }

      // Escape -> clear/close search and return focus to Home screen
      if (event.key === "Escape" && isSearchOpen) {
        event.preventDefault();
        setSearchQuery("");
        setSearchOpen(false);
        inputRef.current?.blur();
        return;
      }

      // Alt + 1–9: open corresponding visible shortcut on current Home screen
      // (Uses Alt modifier to avoid conflict with native browser tab switching Ctrl+1-9)
      const num = parseInt(event.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9 && !isTyping) {
        if (event.altKey) {
          const targetIndex = num - 1;
          const activeFolder = openFolderId
            ? items.find(
                (i): i is FolderItem => i.type === "folder" && i.id === openFolderId,
              )
            : null;
          const displayItems: LaunchpadItem[] = activeFolder
            ? selectFolderChildren(items, activeFolder)
            : items.filter(
                (i): i is ShortcutItem => i.type === "shortcut" && i.folderId === null,
              );
          const pageSize = columns * PAGE_ROWS;
          const pageItems = activeFolder
            ? displayItems
            : displayItems.slice(
                activePageIndex * pageSize,
                (activePageIndex + 1) * pageSize,
              );

          const item = pageItems[targetIndex];
          if (item) {
            event.preventDefault();
            if (item.type === "folder") {
              openFolder(item.id);
            } else if (item.type === "shortcut") {
              openShortcutUrl(item.url, openLinks);
            }
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isSearchOpen,
    setSearchOpen,
    setSearchQuery,
    items,
    openFolderId,
    activePageIndex,
    columns,
    openFolder,
  ]);

  // Click outside to close search
  useEffect(() => {
    if (!isSearchOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isSearchOpen, setSearchOpen]);

  // Search input keydown handler
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length > 0) {
        setSelectedIndex(
          (prev) => (prev - 1 + results.length) % results.length,
        );
      }
    } else if (event.key === "Tab") {
      event.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) =>
          event.shiftKey
            ? (prev - 1 + results.length) % results.length
            : (prev + 1) % results.length,
        );
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        handleItemSelect(results[selectedIndex]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSearchQuery("");
      setSearchOpen(false);
      inputRef.current?.blur();
    } else {
      // Ctrl/Cmd + 1–9 or Alt + 1–9 while searching opens the corresponding result item
      const num = parseInt(event.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        if (event.altKey || event.ctrlKey || event.metaKey) {
          const targetIndex = num - 1;
          if (results[targetIndex]) {
            event.preventDefault();
            handleItemSelect(results[targetIndex]);
          }
        }
      }
    }
  };

  // Notch path dimensions
  // W_total = 280, H = 36, R_ear = 10, R_corner = 12
  const notchClipPath =
    "M 0 0 A 10 10 0 0 1 10 10 V 24 A 12 12 0 0 0 22 36 H 258 A 12 12 0 0 0 270 24 V 10 A 10 10 0 0 1 280 0 Z";

  return (
    <div
      ref={containerRef}
      className="fixed top-0 inset-x-0 z-50 flex flex-col items-center pointer-events-none"
    >
      {/* Hidden SVG def for notch clipping */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <clipPath id="macbook-notch-clip">
            <path d={notchClipPath} />
          </clipPath>
        </defs>
      </svg>

      {/* MacBook Hardware Notch */}
      <div
        className="pointer-events-auto group relative cursor-text select-none"
        onClick={() => {
          setSearchOpen(true);
          inputRef.current?.focus();
        }}
      >
        {/* Clipped Glassmorphism Notch Background */}
        <div
          style={{ clipPath: "url(#macbook-notch-clip)" }}
          className={`h-[36px] w-[280px] backdrop-blur-2xl transition-colors duration-200 ${
            isSearchOpen
              ? "bg-white/[0.15]"
              : "bg-white/[0.09] hover:bg-white/[0.13]"
          }`}
        />

        {/* Interior Content */}
        <div className="absolute inset-0 flex items-center px-4.5 gap-2">
          {/* Search Lens Icon */}
          <svg
            aria-hidden
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-white/50 transition-colors group-hover:text-white/75"
          >
            <circle
              cx="7"
              cy="7"
              r="4.75"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M10.5 10.5L14 14"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>

          {/* Search Input */}
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-normal tracking-[-0.01em] text-white placeholder:text-white/40 focus:outline-none"
          />

          {/* Shortcut / Clear Button */}
          {searchQuery ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/15 text-[9px] text-white/60 hover:bg-white/25 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          ) : isSearchOpen ? (
            <kbd className="shrink-0 rounded-md border border-white/15 bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-white/45 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
              esc
            </kbd>
          ) : (
            <kbd className="shrink-0 rounded-md border border-white/12 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-medium text-white/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* SEPARATE Floating Dropdown Card */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="pointer-events-auto mt-2 w-[320px] max-w-[calc(100vw-32px)] max-h-[350px] overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-white/12 bg-[#121214]/95 p-1.5 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-3xl select-none"
          >
            {results.length === 0 ? (
              <div className="px-3 py-3.5 text-center">
                <p className="text-[12px] text-white/40">
                  No shortcuts or folders match &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {results.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <li
                      key={item.id}
                      ref={isSelected ? selectedItemRef : null}
                      className="relative"
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="search-highlight"
                          className="absolute inset-0 rounded-xl bg-white/[0.12] ring-1 ring-white/[0.18] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]"
                          transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleItemSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left cursor-pointer ${
                          isSelected ? "text-white" : "text-white/80"
                        }`}
                      >
                        {item.type === "folder" ? (
                          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center pointer-events-none select-none">
                            <div
                              className="relative flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out"
                              style={{
                                width: 208.65,
                                height: 175.5,
                                transform: "scale(0.145)",
                                transformOrigin: "center center",
                              }}
                            >
                              <Folder
                                color={item.color || DEFAULT_FOLDER_COLOR}
                                size="sm"
                                items={selectFolderChildren(items, item).filter(
                                  (i): i is ShortcutItem => i.type === "shortcut",
                                )}
                                isHovered={isSelected}
                              />
                            </div>
                          </div>
                        ) : (
                          <Tile
                            title={item.title}
                            url={item.url}
                            customIcon={item.customIcon}
                            accent={item.accent}
                            size="sm"
                          />
                        )}

                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[12px] font-medium text-white/95 leading-snug">
                            {item.title}
                          </span>
                          <span className="truncate text-[10.5px] text-white/40 leading-snug">
                            {item.type === "folder"
                              ? `Folder · ${item.itemIds.length} ${item.itemIds.length === 1 ? 'shortcut' : 'shortcuts'}`
                              : getHostname(item.url)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

