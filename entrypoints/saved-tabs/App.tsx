import { useEffect, useState, useMemo, useRef, useCallback, memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SavedTab, SavedTabGroup } from "@/types/savedTabs";
import {
  getSavedGroups,
  createGroup,
  createGroupWithTabs,
  renameGroup,
  deleteGroup,
  moveTabToGroup,
  moveMultipleTabsToGroup,
  deleteMultipleTabs,
  deleteTabFromGroup,
  restoreTab,
  restoreGroup,
  clearAllGroups,
  consumeDuplicateNotice,
} from "@/lib/savedTabsStorage";

function getHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getGoogleFaviconUrl(url: string): string {
  const host = getHostname(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
}

interface TabRowProps {
  tab: SavedTab;
  groupId: string;
  isSelected: boolean;
  hasSelection: boolean;
  isHovered: boolean;
  onMouseEnter: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLLIElement>, tabId: string, groupId: string) => void;
  onToggleSelect: (id: string) => void;
  onRestore: (tab: SavedTab, groupId: string) => void;
  onDelete: (tabId: string, groupId: string) => void;
}

const TabRow = memo(function TabRow({
  tab,
  groupId,
  isSelected,
  hasSelection,
  isHovered,
  onMouseEnter,
  onDragStart,
  onToggleSelect,
  onRestore,
  onDelete,
}: TabRowProps) {
  const host = useMemo(() => getHostname(tab.url), [tab.url]);
  const faviconSrc = tab.favIconUrl || getGoogleFaviconUrl(tab.url);

  return (
    <li
      draggable
      onMouseEnter={() => onMouseEnter(tab.id)}
      onDragStart={(e) => onDragStart(e, tab.id, groupId)}
      className={`relative group/tab flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg cursor-grab active:cursor-grabbing ${
        isSelected ? "bg-white/[0.06]" : ""
      }`}
    >
      {/* Smooth liquid hover surface that morphs between rows */}
      {isHovered && !isSelected && (
        <motion.div
          layoutId="saved-tabs-hover-pill"
          className="absolute inset-0 rounded-lg bg-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] pointer-events-none"
          transition={{
            type: "spring",
            stiffness: 450,
            damping: 35,
          }}
        />
      )}

      {/* Checkbox positioned in the gutter so it never shifts the favicon */}
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(tab.id)}
          onClick={(e) => e.stopPropagation()}
          className={`h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-[#FA1E76] cursor-pointer transition-opacity ${
            hasSelection || isSelected
              ? "opacity-100"
              : "opacity-0 group-hover/tab:opacity-60 hover:!opacity-100"
          }`}
        />
      </div>

      {/* Favicon + Title + Domain in one clean horizontal row */}
      <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1 pr-3">
        <img
          src={faviconSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            const fallback = getGoogleFaviconUrl(tab.url);
            if (e.currentTarget.src !== fallback) {
              e.currentTarget.src = fallback;
            }
          }}
          className="h-4 w-4 shrink-0 rounded-[3px] object-contain opacity-80"
        />

        <button
          type="button"
          onClick={() => onRestore(tab, groupId)}
          title={tab.url}
          className="text-[13px] text-white/75 hover:text-white truncate text-left cursor-pointer transition-colors"
        >
          {tab.title || host}
        </button>

        <span className="text-[11.5px] text-white/30 truncate select-none hidden sm:inline">
          {host}
        </span>
      </div>

      {/* Delete single tab: aligned to right edge */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(tab.id, groupId);
        }}
        title="Delete"
        className="relative z-10 w-6 h-6 flex items-center justify-center opacity-0 group-hover/tab:opacity-100 text-white/25 hover:text-red-400 transition-all cursor-pointer shrink-0"
      >
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
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </li>
  );
});

export default function App() {
  const [groups, setGroups] = useState<SavedTabGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [openMenuGroupId, setOpenMenuGroupId] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<SavedTabGroup | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  const [isMoveDropdownOpen, setIsMoveDropdownOpen] = useState(false);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [hoveredGroupMenuAction, setHoveredGroupMenuAction] = useState<
    string | null
  >(null);
  const [hoveredMoveMenuId, setHoveredMoveMenuId] = useState<string | null>(null);
  const [hoveredModalTabId, setHoveredModalTabId] = useState<string | null>(null);

  // New Group Modal state
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [modalSelectedTabIds, setModalSelectedTabIds] = useState<Set<string>>(
    new Set(),
  );

  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const newGroupNameInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (msg: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(msg);
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
    }, 3200);
  };

  // Keep saved-tabs tab pinned with empty title so it displays icon-only
  useEffect(() => {
    document.title = "\u200B";

    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.getCurrent?.((tab) => {
        if (tab?.id && !tab.pinned) {
          chrome.tabs.update(tab.id, { pinned: true }).catch(() => {});
        }
      });

      // Close duplicate Saved Tabs tabs across all windows
      const savedTabsPageUrl = chrome.runtime.getURL("/saved-tabs.html");
      chrome.tabs.query?.({}, (allTabs) => {
        if (!allTabs) return;
        const matching = allTabs.filter(
          (t) => t.id && t.url && t.url.startsWith(savedTabsPageUrl),
        );
        if (matching.length > 1) {
          chrome.tabs.getCurrent?.((currentTab) => {
            const duplicates = matching
              .filter((t) => t.id !== currentTab?.id)
              .map((t) => t.id!)
              .filter(Boolean);
            if (duplicates.length > 0) {
              chrome.tabs.remove(duplicates).catch(() => {});
            }
          });
        }
      });
    }

    let mounted = true;
    getSavedGroups().then((data) => {
      if (mounted) {
        setGroups(data);
        setLoading(false);
      }
    });

    consumeDuplicateNotice().then((msg) => {
      if (msg && mounted) {
        showNotice(msg);
      }
    });

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && changes["tabin-saved-tabs"]) {
        const next = changes["tabin-saved-tabs"].newValue;
        const valid = Array.isArray(next) ? next : [];
        setGroups(valid);
      }
      if (
        areaName === "local" &&
        changes["tabin-saved-tabs-notice"]?.newValue
      ) {
        consumeDuplicateNotice().then((msg) => {
          if (msg && mounted) {
            showNotice(msg);
          }
        });
      }
    };

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        mounted = false;
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }

    return () => {
      mounted = false;
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // Close menus on click outside or Escape
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuGroupId(null);
      }
      if (
        moveMenuRef.current &&
        !moveMenuRef.current.contains(e.target as Node)
      ) {
        setIsMoveDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuGroupId(null);
        setIsMoveDropdownOpen(false);
        setSelectedTabIds(new Set());
        setEditingGroupId(null);
        setIsNewGroupModalOpen(false);
      }
    };

    window.addEventListener("mousedown", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const totalTabs = useMemo(() => {
    return groups.reduce((acc, g) => acc + g.tabs.length, 0);
  }, [groups]);

  const allTabsList = useMemo(() => {
    if (!isNewGroupModalOpen) return [];
    return groups.flatMap((g) => g.tabs.map((t) => ({ ...t, groupName: g.name })));
  }, [groups, isNewGroupModalOpen]);

  // Open New Group Modal
  const handleOpenNewGroupModal = () => {
    setNewGroupName("");
    if (selectedTabIds.size > 0) {
      setModalSelectedTabIds(new Set(selectedTabIds));
    } else {
      setModalSelectedTabIds(new Set());
    }
    setIsNewGroupModalOpen(true);
    setIsMoveDropdownOpen(false);
    setTimeout(() => {
      if (newGroupNameInputRef.current) {
        newGroupNameInputRef.current.focus();
      }
    }, 50);
  };

  const handleCreateGroupWithSelectedTabs = async () => {
    const trimmed = newGroupName.trim() || "New group";
    const tabIds = Array.from(modalSelectedTabIds);

    let result: { newGroup: SavedTabGroup; updated: SavedTabGroup[] } | null = null;
    if (tabIds.length > 0) {
      result = await createGroupWithTabs(trimmed, tabIds);
    } else {
      if (!newGroupName.trim()) return;
      result = await createGroup(trimmed);
    }

    if (result) {
      setGroups(result.updated);
    }
    setSelectedTabIds(new Set());
    setIsNewGroupModalOpen(false);
  };

  // Group renaming
  const handleStartRename = (group: SavedTabGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
    setOpenMenuGroupId(null);
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 20);
  };

  const handleSaveRename = async (groupId: string) => {
    if (!editingGroupId) return;
    const trimmed = editingName.trim() || "Today";
    const updated = await renameGroup(groupId, trimmed);
    setGroups(updated);
    setEditingGroupId(null);
  };

  // Group deletion
  const handleDeleteGroup = (group: SavedTabGroup) => {
    setOpenMenuGroupId(null);
    setGroupToDelete(group);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    const updated = await deleteGroup(groupToDelete.id);
    setGroups(updated);
    setGroupToDelete(null);
  };

  // Restore group
  const handleRestoreGroup = async (group: SavedTabGroup) => {
    try {
      setOpenMenuGroupId(null);
      const result = await restoreGroup(group.id);
      if (result.focusedExistingCount > 0) {
        showNotice(
          `${result.focusedExistingCount} ${
            result.focusedExistingCount === 1 ? "tab" : "tabs"
          } already open · focused existing`,
        );
      }
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } catch (err) {
      console.error("Failed to restore group:", err);
    }
  };

  // Clear all
  const handleConfirmClearAll = async () => {
    await clearAllGroups();
    setGroups([]);
    setSelectedTabIds(new Set());
    setIsClearingAll(false);
  };

  // Restore single tab
  const handleRestoreSingleTab = useCallback(async (tab: SavedTab, groupId: string) => {
    try {
      const result = await restoreTab(tab, true, groupId);
      if (result.focusedExisting) {
        showNotice("Tab already open · focused existing tab");
      }
      if (result.updated) {
        setGroups(result.updated);
      }
      setSelectedTabIds((prev) => {
        if (!prev.has(tab.id)) return prev;
        const next = new Set(prev);
        next.delete(tab.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to restore tab:", err);
    }
  }, []);

  // Delete single tab
  const handleDeleteSingleTab = useCallback(async (tabId: string, groupId: string) => {
    const updated = await deleteTabFromGroup(groupId, tabId);
    setGroups(updated);
    setSelectedTabIds((prev) => {
      if (!prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  // Multi-select actions
  const toggleSelectTab = useCallback((tabId: string) => {
    setSelectedTabIds((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  }, []);

  const handleTabMouseEnter = useCallback((id: string) => {
    setHoveredTabId(id);
  }, []);

  const handleMoveSelectedToGroup = async (toGroupId: string) => {
    const tabIds = Array.from(selectedTabIds);
    if (tabIds.length === 0) return;

    const updated = await moveMultipleTabsToGroup(tabIds, toGroupId);
    setGroups(updated);
    setSelectedTabIds(new Set());
    setIsMoveDropdownOpen(false);
  };

  const handleDeleteSelected = async () => {
    const tabIds = Array.from(selectedTabIds);
    if (tabIds.length === 0) return;

    const updated = await deleteMultipleTabs(tabIds);
    setGroups(updated);
    setSelectedTabIds(new Set());
  };

  // Drag & drop handlers
  const handleDragStart = useCallback((
    e: React.DragEvent<HTMLLIElement>,
    tabId: string,
    fromGroupId: string,
  ) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ tabId, fromGroupId }),
    );
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLElement>, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverGroupId !== groupId) {
      setDragOverGroupId(groupId);
    }
  };

  const handleDragLeave = (groupId: string) => {
    if (dragOverGroupId === groupId) {
      setDragOverGroupId(null);
    }
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLElement>,
    toGroupId: string,
  ) => {
    e.preventDefault();
    setDragOverGroupId(null);
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const { tabId, fromGroupId } = JSON.parse(dataStr);
      if (!tabId || !fromGroupId || fromGroupId === toGroupId) return;

      const updated = await moveTabToGroup(tabId, fromGroupId, toGroupId);
      setGroups(updated);
    } catch (err) {
      console.error("Failed to drop tab:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0C0F] text-white antialiased selection:bg-[#FA1E76]/25">
      {/* Subtle top ambient glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FA1E76]/[0.04] via-transparent to-transparent" />

      {/* Main Canvas */}
      <main className="relative mx-auto max-w-2xl px-6 sm:px-8 py-12">
        {/* Header: “Saved Tabs” + “+ New group” + “Clear all” */}
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icon-128.png"
              alt="Tabin"
              className="h-7 w-7 rounded-lg object-cover opacity-90"
            />
            <h1 className="text-[17px] font-medium tracking-tight text-white/90">
              Saved Tabs
            </h1>
          </div>

          <div className="flex items-center gap-3 text-[12.5px]">
            <button
              type="button"
              onClick={handleOpenNewGroupModal}
              className="text-[#FA1E76] hover:text-[#FA1E76]/80 font-medium transition-colors cursor-pointer"
            >
              + New group
            </button>

            {groups.length > 0 && (
              <>
                <span className="text-white/20 select-none">·</span>
                <button
                  type="button"
                  onClick={() => setIsClearingAll(true)}
                  className="text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </>
            )}
          </div>
        </header>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 text-center text-[13px] text-white/35">
            Loading…
          </div>
        ) : groups.length === 0 ? (
          /* Empty State */
          <div className="py-24 text-center">
            <h2 className="text-[16px] font-medium text-white/85">
              No saved tabs yet
            </h2>
            <p className="mt-2 text-[13px] text-white/40">
              Save your open tabs here and come back to them anytime.
            </p>
          </div>
        ) : (
          /* Groups List - perfectly aligned left & right */
          <div
            className="flex flex-col gap-9"
            onMouseLeave={() => setHoveredTabId(null)}
          >
            {groups.map((group) => {
              const tabCount = group.tabs.length;
              const headerTitle = `${group.name} · ${tabCount} ${
                tabCount === 1 ? "tab" : "tabs"
              }`;
              const isDragTarget = dragOverGroupId === group.id;
              const isMenuOpen = openMenuGroupId === group.id;

              return (
                <section
                  key={group.id}
                  onDragOver={(e) => handleDragOver(e, group.id)}
                  onDragLeave={() => handleDragLeave(group.id)}
                  onDrop={(e) => handleDrop(e, group.id)}
                  className={`group/section transition-colors ${
                    isDragTarget ? "opacity-80" : ""
                  }`}
                >
                  {/* Group Header: Title at exact left edge, ⋯ menu on exact right edge */}
                  <div className="flex items-center justify-between py-1 mb-1">
                    <div className="min-w-0 flex-1">
                      {editingGroupId === group.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleSaveRename(group.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(group.id);
                            if (e.key === "Escape") setEditingGroupId(null);
                          }}
                          maxLength={50}
                          className="w-full border-b border-white/20 bg-transparent text-[14px] font-medium text-white focus:border-[#FA1E76] focus:outline-none pb-0.5"
                        />
                      ) : (
                        <h2
                          onClick={() => handleStartRename(group)}
                          title="Click to rename"
                          className="text-[14px] font-medium text-white/90 hover:text-white cursor-pointer transition-colors inline-block"
                        >
                          {headerTitle}
                        </h2>
                      )}
                    </div>

                    {/* ⋯ Menu */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuGroupId(isMenuOpen ? null : group.id);
                        }}
                        title="Group actions"
                        className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/80 transition-colors cursor-pointer rounded"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="5" cy="12" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="19" cy="12" r="2" />
                        </svg>
                      </button>

                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          onMouseLeave={() => setHoveredGroupMenuAction(null)}
                          className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-white/10 bg-[#16161A] p-1 shadow-2xl z-30 text-[12px] flex flex-col gap-0.5"
                        >
                          {group.tabs.length > 0 && (
                            <div className="relative">
                              {hoveredGroupMenuAction === "restore" && (
                                <motion.div
                                  layoutId="group-menu-highlight"
                                  className="absolute inset-0 rounded-lg bg-white/10"
                                  transition={{
                                    type: "spring",
                                    stiffness: 450,
                                    damping: 35,
                                  }}
                                />
                              )}
                              <button
                                type="button"
                                onMouseEnter={() =>
                                  setHoveredGroupMenuAction("restore")
                                }
                                onClick={() => handleRestoreGroup(group)}
                                className="relative z-10 w-full text-left px-2.5 py-1.5 rounded-lg text-white/80 transition-colors cursor-pointer"
                              >
                                Restore all
                              </button>
                            </div>
                          )}

                          <div className="relative">
                            {hoveredGroupMenuAction === "rename" && (
                              <motion.div
                                layoutId="group-menu-highlight"
                                className="absolute inset-0 rounded-lg bg-white/10"
                                transition={{
                                  type: "spring",
                                  stiffness: 450,
                                  damping: 35,
                                }}
                              />
                            )}
                            <button
                              type="button"
                              onMouseEnter={() =>
                                setHoveredGroupMenuAction("rename")
                              }
                              onClick={() => handleStartRename(group)}
                              className="relative z-10 w-full text-left px-2.5 py-1.5 rounded-lg text-white/80 transition-colors cursor-pointer"
                            >
                              Rename
                            </button>
                          </div>

                          <div className="relative">
                            {hoveredGroupMenuAction === "delete" && (
                              <motion.div
                                layoutId="group-menu-highlight"
                                className="absolute inset-0 rounded-lg bg-red-500/15"
                                transition={{
                                  type: "spring",
                                  stiffness: 450,
                                  damping: 35,
                                }}
                              />
                            )}
                            <button
                              type="button"
                              onMouseEnter={() =>
                                setHoveredGroupMenuAction("delete")
                              }
                              onClick={() => handleDeleteGroup(group)}
                              className="relative z-10 w-full text-left px-2.5 py-1.5 rounded-lg text-red-400 transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tab Rows: Favicon aligns to the exact same left edge as header title */}
                  <ul className="flex flex-col">
                    {group.tabs.map((tab) => (
                      <TabRow
                        key={tab.id}
                        tab={tab}
                        groupId={group.id}
                        isSelected={selectedTabIds.has(tab.id)}
                        hasSelection={selectedTabIds.size > 0}
                        isHovered={hoveredTabId === tab.id}
                        onMouseEnter={handleTabMouseEnter}
                        onDragStart={handleDragStart}
                        onToggleSelect={toggleSelectTab}
                        onRestore={handleRestoreSingleTab}
                        onDelete={handleDeleteSingleTab}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* When tabs are selected, show only: “1 tab selected · Move to ▾ · Delete” */}
      <AnimatePresence>
        {selectedTabIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.12 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#16161A]/95 px-4 py-2 shadow-2xl backdrop-blur-2xl text-[12.5px] text-white select-none"
          >
            <span className="text-white/80">
              {selectedTabIds.size}{" "}
              {selectedTabIds.size === 1 ? "tab" : "tabs"} selected
            </span>

            <span className="text-white/20">·</span>

            {/* Move to ▾ dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoveDropdownOpen(!isMoveDropdownOpen)}
                className="flex items-center gap-1 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                Move to
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isMoveDropdownOpen && (
                <div
                  ref={moveMenuRef}
                  onMouseLeave={() => setHoveredMoveMenuId(null)}
                  className="absolute bottom-full left-0 mb-2 min-w-36 rounded-xl border border-white/10 bg-[#16161A] p-1 shadow-2xl z-50 text-[12px] flex flex-col gap-0.5"
                >
                  {groups.map((g) => (
                    <div key={g.id} className="relative">
                      {hoveredMoveMenuId === g.id && (
                        <motion.div
                          layoutId="move-menu-highlight"
                          className="absolute inset-0 rounded-lg bg-white/10"
                          transition={{
                            type: "spring",
                            stiffness: 450,
                            damping: 35,
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredMoveMenuId(g.id)}
                        onClick={() => handleMoveSelectedToGroup(g.id)}
                        className="relative z-10 w-full text-left px-2.5 py-1.5 rounded-lg text-white/85 hover:text-white truncate transition-colors cursor-pointer"
                      >
                        {g.name}
                      </button>
                    </div>
                  ))}
                  <div className="my-0.5 border-t border-white/[0.08]" />
                  <div className="relative">
                    {hoveredMoveMenuId === "new-group" && (
                      <motion.div
                        layoutId="move-menu-highlight"
                        className="absolute inset-0 rounded-lg bg-[#FA1E76]/15"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 35,
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredMoveMenuId("new-group")}
                      onClick={handleOpenNewGroupModal}
                      className="relative z-10 w-full text-left px-2.5 py-1.5 rounded-lg text-[#FA1E76] truncate transition-colors cursor-pointer font-medium"
                    >
                      + New group…
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-white/20">·</span>

            {/* Delete */}
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="text-white/50 hover:text-red-400 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle notification when a duplicate was skipped or tab focused */}
      <AnimatePresence>
        {notice && (
          <div
            className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 transition-all duration-150 ${
              selectedTabIds.size > 0 ? "bottom-20" : "bottom-6"
            }`}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-[#16161A]/95 px-3.5 py-2 shadow-2xl backdrop-blur-2xl text-[12px] text-white/85 select-none"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#FA1E76] shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>{notice}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Group Modal */}
      <AnimatePresence>
        {isNewGroupModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsNewGroupModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.14 }}
              className="w-[340px] rounded-2xl border border-white/10 bg-[#16161A]/95 p-4 shadow-2xl backdrop-blur-2xl text-white select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/5">
                <span className="text-[13px] font-medium text-white/90">
                  New group
                </span>
                <button
                  type="button"
                  onClick={() => setIsNewGroupModalOpen(false)}
                  className="w-5 h-5 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs cursor-pointer"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>

              {/* Group Name Input */}
              <div>
                <input
                  ref={newGroupNameInputRef}
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  onKeyDown={(e) => {
                    const canSubmit =
                      allTabsList.length === 0
                        ? newGroupName.trim().length > 0
                        : newGroupName.trim().length > 0 &&
                          modalSelectedTabIds.size > 0;
                    if (e.key === "Enter" && canSubmit) {
                      handleCreateGroupWithSelectedTabs();
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none transition-all"
                />
              </div>

              {/* Tab selection area - only shown if tabs are available */}
              {allTabsList.length > 0 &&
                (selectedTabIds.size > 0 ? (
                  /* Selected tabs preview if tabs were already pre-selected from page */
                  <div className="flex items-center gap-2 mt-3 px-1 py-1 text-[12px] text-white/50">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {allTabsList
                        .filter((t) => modalSelectedTabIds.has(t.id))
                        .slice(0, 5)
                        .map((t) => (
                          <img
                            key={t.id}
                            src={t.favIconUrl || getGoogleFaviconUrl(t.url)}
                            alt=""
                            className="inline-block h-4 w-4 rounded-full bg-[#16161A] ring-1 ring-white/20 object-contain"
                          />
                        ))}
                    </div>
                    <span>
                      Moving {modalSelectedTabIds.size}{" "}
                      {modalSelectedTabIds.size === 1 ? "tab" : "tabs"} to this
                      group
                    </span>
                  </div>
                ) : (
                  /* Tab selection picker if opened from header with 0 tabs selected */
                  <div className="mt-3">
                    <div className="flex items-center justify-between px-1 mb-1.5 text-[11.5px] text-white/40">
                      <span>Select tabs to add</span>
                      <span>{modalSelectedTabIds.size} selected</span>
                    </div>

                    <div
                      onMouseLeave={() => setHoveredModalTabId(null)}
                      className="max-h-48 overflow-y-auto space-y-0.5 rounded-xl border border-white/[0.06] bg-black/20 p-1"
                    >
                      {allTabsList.map((t) => {
                        const isChecked = modalSelectedTabIds.has(t.id);
                        return (
                          <div key={t.id} className="relative">
                            {hoveredModalTabId === t.id && (
                              <motion.div
                                layoutId="modal-tab-liquid-highlight"
                                className="absolute inset-0 rounded-lg bg-white/10 pointer-events-none"
                                transition={{
                                  type: "spring",
                                  stiffness: 450,
                                  damping: 35,
                                }}
                              />
                            )}
                            <button
                              type="button"
                              onMouseEnter={() => setHoveredModalTabId(t.id)}
                              onClick={() => {
                                setModalSelectedTabIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(t.id)) {
                                    next.delete(t.id);
                                  } else {
                                    next.add(t.id);
                                  }
                                  return next;
                                });
                              }}
                              className={`relative z-10 w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                isChecked
                                  ? "text-white font-medium"
                                  : "text-white/70 hover:text-white"
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                  isChecked
                                    ? "bg-[#FA1E76] border-[#FA1E76] text-white"
                                    : "border-white/20 bg-transparent"
                                }`}
                              >
                                {isChecked && (
                                  <svg
                                    width="9"
                                    height="9"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>

                              <img
                                src={t.favIconUrl || getGoogleFaviconUrl(t.url)}
                                alt=""
                                className="w-3.5 h-3.5 object-contain rounded shrink-0 opacity-85"
                              />

                              <span className="truncate text-[12.5px] flex-1">
                                {t.title || getHostname(t.url)}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-white/5 text-[12px]">
                <button
                  type="button"
                  onClick={() => setIsNewGroupModalOpen(false)}
                  className="rounded-lg px-2.5 py-1.5 text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    allTabsList.length === 0
                      ? !newGroupName.trim()
                      : !newGroupName.trim() || modalSelectedTabIds.size === 0
                  }
                  onClick={handleCreateGroupWithSelectedTabs}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                    (allTabsList.length === 0
                      ? newGroupName.trim().length > 0
                      : newGroupName.trim().length > 0 &&
                        modalSelectedTabIds.size > 0)
                      ? "bg-[#FA1E76] text-white hover:bg-[#FA1E76]/90 shadow-sm"
                      : "bg-white/[0.06] text-white/25 cursor-not-allowed"
                  }`}
                >
                  Create group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Group Confirmation Modal */}
      <AnimatePresence>
        {groupToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setGroupToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.12 }}
              className="w-[300px] rounded-2xl border border-white/10 bg-[#16161A] p-5 shadow-2xl text-white select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[14px] font-medium text-white/95">
                Delete group?
              </h3>
              <p className="mt-1.5 text-[12px] text-white/50 leading-relaxed">
                This will delete &ldquo;{groupToDelete.name}&rdquo; and all{" "}
                {groupToDelete.tabs.length}{" "}
                {groupToDelete.tabs.length === 1 ? "tab" : "tabs"}.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2 text-[12px]">
                <button
                  type="button"
                  onClick={() => setGroupToDelete(null)}
                  className="rounded-lg px-3 py-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteGroup}
                  className="rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 font-medium transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {isClearingAll && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsClearingAll(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.12 }}
              className="w-[300px] rounded-2xl border border-white/10 bg-[#16161A] p-5 shadow-2xl text-white select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[14px] font-medium text-white/95">
                Clear all saved tabs?
              </h3>
              <p className="mt-1.5 text-[12px] text-white/50 leading-relaxed">
                This will delete all {totalTabs} saved tabs across{" "}
                {groups.length} {groups.length === 1 ? "group" : "groups"}.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2 text-[12px]">
                <button
                  type="button"
                  onClick={() => setIsClearingAll(false)}
                  className="rounded-lg px-3 py-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  className="rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 font-medium transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
