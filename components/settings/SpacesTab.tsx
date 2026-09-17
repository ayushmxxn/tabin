import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLaunchpadStore } from "@/store/useLaunchpadStore";
import type { Space } from "@/types";

export function SpacesTab() {
  const spaces = useLaunchpadStore((state) => state.spaces);
  const activeSpaceIndex = useLaunchpadStore((state) => state.activeSpaceIndex);
  const items = useLaunchpadStore((state) => state.items);
  const settings = useLaunchpadStore((state) => state.settings);
  const updateSettings = useLaunchpadStore((state) => state.updateSettings);
  const createSpace = useLaunchpadStore((state) => state.createSpace);
  const renameSpace = useLaunchpadStore((state) => state.renameSpace);
  const deleteSpace = useLaunchpadStore((state) => state.deleteSpace);
  const reorderSpaces = useLaunchpadStore((state) => state.reorderSpaces);
  const setDefaultSpace = useLaunchpadStore((state) => state.setDefaultSpace);
  const switchSpace = useLaunchpadStore((state) => state.switchSpace);

  const spacesEnabled = settings?.spacesEnabled ?? false;
  const defaultSpaceId = settings?.defaultSpaceId ?? "space-home";

  const [newSpaceName, setNewSpaceName] = useState("");
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [spaceToDelete, setSpaceToDelete] = useState<Space | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSpaceName.trim();
    if (!trimmed) return;

    if (spaces.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(false, "A space with this name already exists.");
      return;
    }

    createSpace(trimmed);
    setNewSpaceName("");
    showToast(true, `Space "${trimmed}" created.`);
  };

  const handleStartRename = (space: Space) => {
    setEditingSpaceId(space.id);
    setEditingName(space.name);
    setTimeout(() => editInputRef.current?.focus(), 30);
  };

  const handleSaveRename = () => {
    if (!editingSpaceId) return;
    const trimmed = editingName.trim();
    if (trimmed) {
      renameSpace(editingSpaceId, trimmed);
    }
    setEditingSpaceId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const current = spaces[index];
    const prev = spaces[index - 1];
    if (!current || !prev) return;
    const next = [...spaces];
    next[index - 1] = current;
    next[index] = prev;
    reorderSpaces(next);
  };

  const handleMoveDown = (index: number) => {
    if (index >= spaces.length - 1) return;
    const current = spaces[index];
    const nextItem = spaces[index + 1];
    if (!current || !nextItem) return;
    const next = [...spaces];
    next[index + 1] = current;
    next[index] = nextItem;
    reorderSpaces(next);
  };

  const handleConfirmDelete = () => {
    if (!spaceToDelete || spaceToDelete.id === "space-home") return;
    deleteSpace(spaceToDelete.id);
    showToast(true, `Space "${spaceToDelete.name}" deleted.`);
    setSpaceToDelete(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`inline-flex w-fit max-w-[calc(100%-2.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-[11.5px] font-medium leading-none ${
              toast.ok
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                : "bg-red-500/[0.09] border border-red-500/20 text-red-300/90"
            }`}
          >
            <span className="shrink-0 text-[13px]">{toast.ok ? "✓" : "✕"}</span>
            <span className="truncate">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-medium text-white/90 tracking-tight">
            Spaces
          </h3>
          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] font-medium text-white/50">
            {spaces.length}
          </span>
        </div>
        <p className="text-[12px] text-white/45 mt-0.5">
          Organize your shortcuts and folders into independent workspaces.
        </p>
      </div>

      {/* Feature Enable/Disable Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
        <div>
          <h4 className="text-[12.5px] font-medium text-white/90">
            Enable Multiple Spaces
          </h4>
          <p className="text-[11px] text-white/40 mt-0.5">
            Keep shortcuts and folders organized across distinct workspaces.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={spacesEnabled}
          onClick={() =>
            updateSettings({ spacesEnabled: !spacesEnabled })
          }
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            spacesEnabled ? "bg-[#FA1E76]" : "bg-white/15 hover:bg-white/20"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              spacesEnabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Spaces Configuration - shown when enabled */}
      {spacesEnabled && (
        <div className="flex flex-col gap-4">
          {/* Add New Space Row */}
          <form onSubmit={handleCreateSpace} className="flex gap-2">
            <input
              type="text"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="New space name (e.g. Work, Personal, Dev)"
              maxLength={24}
              className="flex-1 h-8 rounded-[9px] border border-white/10 bg-white/[0.04] px-3 text-[12px] text-white placeholder-white/30 focus:border-[#FA1E76]/60 focus:bg-white/[0.06] focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!newSpaceName.trim()}
              className="shrink-0 h-8 rounded-[9px] border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 disabled:hover:bg-white/[0.06] px-3.5 text-[12px] font-medium text-white transition-all cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] inline-flex items-center justify-center"
            >
              + Add Space
            </button>
          </form>

          {/* Spaces List */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-medium text-white/45">
                Your Spaces
              </span>
              <span className="text-[11px] text-white/35">
                Switch anytime using the top switcher or Alt+1..9
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015] divide-y divide-white/[0.04]">
              {spaces.map((space, index) => {
                const isHome = space.id === "space-home";
                const isCurrentActive = activeSpaceIndex === index;
                const isDefault = defaultSpaceId === space.id;
                const spaceItemsCount = items.filter(
                  (item) => item.spaceId === space.id,
                ).length;

                return (
                  <div
                    key={space.id}
                    className="group flex items-center justify-between p-2.5 px-3 hover:bg-white/[0.025] transition-colors"
                  >
                    {/* Left: Icon + Name / Edit input + Item Count */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.07] text-white/50 shrink-0">
                        {isHome ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m3 9.5 9-7 9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        ) : (
                          <svg
                            width="12"
                            height="12"
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

                      {editingSpaceId === space.id ? (
                        <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={handleSaveRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename();
                              if (e.key === "Escape") setEditingSpaceId(null);
                            }}
                            maxLength={24}
                            className="w-full rounded-md border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[12px] text-white focus:border-[#FA1E76] focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => switchSpace(index)}
                            title="Click to switch to this space"
                            className="text-[12.5px] font-medium text-white/90 hover:text-white truncate cursor-pointer text-left"
                          >
                            {space.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartRename(space)}
                            title="Rename space"
                            className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-opacity p-0.5 cursor-pointer"
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </button>
                          <span className="text-[10.5px] text-white/30 font-normal">
                            {spaceItemsCount} {spaceItemsCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {isCurrentActive && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 leading-none">
                            Active
                          </span>
                        )}
                        {isDefault && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#FA1E76]/15 text-[#FA1E76] border border-[#FA1E76]/25 leading-none">
                            Default
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {/* Set as default button */}
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => {
                            setDefaultSpace(space.id);
                            showToast(true, `"${space.name}" set as default space.`);
                          }}
                          className="rounded px-2 py-0.5 text-[11px] font-normal text-white/35 hover:text-white/80 hover:bg-white/[0.05] transition-colors cursor-pointer"
                        >
                          Set default
                        </button>
                      )}

                      {/* Reorder Up / Down */}
                      <div className="flex items-center">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          title="Move up"
                          className="p-1 rounded text-white/30 hover:text-white/80 disabled:opacity-20 disabled:hover:text-white/30 hover:bg-white/[0.06] transition-colors cursor-pointer disabled:cursor-default"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={index === spaces.length - 1}
                          onClick={() => handleMoveDown(index)}
                          title="Move down"
                          className="p-1 rounded text-white/30 hover:text-white/80 disabled:opacity-20 disabled:hover:text-white/30 hover:bg-white/[0.06] transition-colors cursor-pointer disabled:cursor-default"
                        >
                          <svg
                            width="11"
                            height="11"
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
                      </div>

                      {/* Delete button (Home space cannot be deleted) */}
                      {!isHome ? (
                        <button
                          type="button"
                          onClick={() => setSpaceToDelete(space)}
                          title="Delete space"
                          className="rounded p-1 text-white/30 hover:text-red-400 hover:bg-red-500/[0.1] transition-all cursor-pointer ml-0.5"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      ) : (
                        <div
                          className="p-1 text-white/20 select-none ml-0.5"
                          title="The Home Space cannot be deleted"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Space Warning Dialog */}
      <AnimatePresence>
        {spaceToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSpaceToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="w-[340px] rounded-2xl border border-white/10 bg-[#121215]/90 p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-semibold text-white/95">
                    Delete Space
                  </h4>
                  <p className="mt-1 text-[12px] text-white/60 leading-relaxed">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-white">
                      "{spaceToDelete.name}"
                    </span>
                    ? All shortcuts and folders in this space will be deleted.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSpaceToDelete(null)}
                  className="h-8 px-3.5 rounded-[9px] border border-white/10 bg-white/[0.04] text-[12px] font-medium text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="h-8 px-3.5 rounded-[9px] bg-red-500 text-[12px] font-medium text-white shadow-md shadow-red-500/25 hover:bg-red-600 active:bg-red-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                >
                  Delete Space
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
