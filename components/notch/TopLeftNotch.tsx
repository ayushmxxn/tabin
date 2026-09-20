"use client";

import { motion } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

export interface NotchNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const STORAGE_KEY = "tabin-notch-notes";

const INITIAL_NOTES: NotchNote[] = [];

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "";
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const TopLeftNotch = memo(function TopLeftNotch() {
  const [isHovered, setIsHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [notes, setNotes] = useState<NotchNote[]>(INITIAL_NOTES);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notchRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes from chrome.storage.local or localStorage
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        if (Array.isArray(res[STORAGE_KEY])) {
          setNotes(res[STORAGE_KEY]);
        }
      });
    } else {
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            setNotes(parsed);
          }
        }
      } catch {}
    }
  }, []);

  const persistNotes = (updated: NotchNote[]) => {
    setNotes(updated);
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: updated });
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setHoveredNoteId(null);
    if (isInputFocused) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 280);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    if (!notchRef.current?.matches(":hover")) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 150);
    }
  };

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  );

  const handleCreateNote = () => {
    const newNote: NotchNote = {
      id: "note-" + Date.now(),
      title: "",
      content: "",
      updatedAt: Date.now(),
    };
    const updated = [newNote, ...notes];
    persistNotes(updated);
    setActiveNoteId(newNote.id);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleBackToList = () => {
    if (activeNote && !activeNote.title.trim() && !activeNote.content.trim()) {
      const filtered = notes.filter((n) => n.id !== activeNote.id);
      persistNotes(filtered);
    }
    setActiveNoteId(null);
  };

  const handleDeleteNote = (id: string) => {
    if (hoveredNoteId === id) {
      setHoveredNoteId(null);
    }
    const updated = notes.filter((n) => n.id !== id);
    persistNotes(updated);
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
  };

  const handleUpdateActiveNote = (
    updates: Partial<Pick<NotchNote, "title" | "content">>,
  ) => {
    if (!activeNoteId) return;
    const now = Date.now();
    const updated = notes.map((n) =>
      n.id === activeNoteId ? { ...n, ...updates, updatedAt: now } : n,
    );
    persistNotes(updated);
  };

  const wordCount = useMemo(() => {
    if (!activeNote?.content.trim()) return 0;
    return activeNote.content.trim().split(/\s+/).length;
  }, [activeNote?.content]);

  const charCount = activeNote?.content.length ?? 0;

  const showExpanded = isHovered || isInputFocused;

  // Close notch, save, and blur inputs when clicking outside
  useEffect(() => {
    if (!showExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (notchRef.current && !notchRef.current.contains(e.target as Node)) {
        titleInputRef.current?.blur();
        textareaRef.current?.blur();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsInputFocused(false);
        setIsHovered(false);

        // Clean up empty note if left blank, or return to list view
        if (
          activeNote &&
          !activeNote.title.trim() &&
          !activeNote.content.trim()
        ) {
          const filtered = notes.filter((n) => n.id !== activeNote.id);
          persistNotes(filtered);
        }
        setActiveNoteId(null);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside, true);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside, true);
    };
  }, [showExpanded, activeNote, notes]);

  return (
    <aside
      ref={notchRef}
      aria-label="Tabin Quick Notes Notch"
      className="fixed top-0 left-10 z-40 select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        layout
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 32,
        }}
        className="relative bg-[#121214]/95 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.75)] rounded-b-[24px] backdrop-blur-3xl"
        style={{
          width: showExpanded ? 360 : "auto",
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        {/* Left concave fillet ear */}
        <svg
          className="absolute -left-3 top-0 w-3 h-3 text-[#121214] pointer-events-none overflow-visible"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M12 0 H0 C6.627 0 12 5.373 12 12 V0 Z" fill="currentColor" />
        </svg>

        {/* Right concave fillet ear */}
        <svg
          className="absolute -right-3 top-0 w-3 h-3 text-[#121214] pointer-events-none overflow-visible"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M0 0 H12 C5.373 0 0 5.373 0 12 V0 Z" fill="currentColor" />
        </svg>

        {/* Collapsed State: Apple Notes Icon + "Notes" • Note Count */}
        {!showExpanded && (
          <div
            onClick={() => setIsHovered(true)}
            className="flex items-center justify-between gap-2 px-3.5 py-1.5 whitespace-nowrap cursor-pointer min-w-[155px]"
          >
            <div className="flex items-center gap-1.5">
              <img
                src="/apple-notes.png"
                alt="Notes"
                className="w-4 h-4 object-contain shrink-0 select-none pointer-events-none drop-shadow-sm"
              />
              <span className="text-[12.5px] font-semibold text-white/90 tracking-tight">
                Notes
              </span>
            </div>
            <span className="text-white/25 text-[10px]">•</span>
            <span className="text-[11.5px] font-medium text-white/60 tracking-tight">
              {notes.length === 0
                ? "No notes"
                : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
            </span>
          </div>
        )}

        {/* Expanded State: Compact Notes Panel */}
        {showExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="p-3 pb-4"
          >
            {activeNote ? (
              /* Editor View */
              <div>
                {/* Header */}
                <div className="flex items-center justify-between px-1 pb-2.5 border-b border-white/[0.08]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={handleBackToList}
                      title="Back to all notes"
                      className="flex items-center justify-center h-6 w-6 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0"
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
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span className="text-[13px] font-medium text-white/80 tracking-tight truncate max-w-[170px]">
                      {activeNote.title.trim() || "Untitled Note"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCreateNote}
                      title="New note"
                      className="flex items-center justify-center h-6 w-6 rounded-lg bg-white/[0.08] hover:bg-[#FA1E76] border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer text-[13px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] active:scale-95"
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
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(activeNote.id)}
                      title="Delete note"
                      className="flex items-center justify-center h-6 w-6 rounded-lg bg-white/[0.08] hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400 border border-white/10 text-white/40 transition-all cursor-pointer active:scale-95"
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
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Body: Title & Content */}
                <div className="pt-2.5 space-y-2">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={activeNote.title}
                    onChange={(e) =>
                      handleUpdateActiveNote({ title: e.target.value })
                    }
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={handleInputBlur}
                    placeholder="Title (optional)"
                    className="w-full bg-white/[0.04] rounded-lg border border-white/10 px-2.5 py-1.5 text-[12.5px] font-medium text-white placeholder-white/35 focus:outline-none focus:border-white/20 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                  />

                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) =>
                      handleUpdateActiveNote({ content: e.target.value })
                    }
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={handleInputBlur}
                    placeholder="Jot down quick thoughts..."
                    rows={6}
                    className="w-full bg-white/[0.04] rounded-xl border border-white/10 p-2.5 text-[12px] text-white/90 placeholder-white/35 focus:outline-none focus:border-white/20 resize-none leading-relaxed transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  />

                  {/* Footer status */}
                  <div className="flex items-center justify-between px-1 text-[10.5px] text-white/40 pt-0.5">
                    <span>
                      {charCount} chars • {wordCount} words
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400/80 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      Auto-saved
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* List View */
              <div>
                {/* Header: Title & Action */}
                <div className="flex items-center justify-between px-1.5 pb-2.5 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <img
                      src="/apple-notes.png"
                      alt="Notes"
                      className="w-4 h-4 object-contain shrink-0 select-none pointer-events-none drop-shadow-sm"
                    />
                    <h3 className="text-[14px] font-semibold text-white/95 tracking-tight">
                      Notes
                    </h3>
                    {notes.length > 0 && (
                      <span className="inline-flex items-center rounded-md border border-white/12 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/60">
                        {notes.length}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNote}
                    title="Add new note"
                    className="flex items-center justify-center h-6 w-6 rounded-lg bg-white/[0.08] hover:bg-[#FA1E76] border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer text-[13px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] active:scale-95"
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
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>

                {/* Notes List */}
                <div
                  onMouseLeave={() => setHoveredNoteId(null)}
                  className="pt-2 px-1 space-y-1 max-h-[280px] overflow-y-auto touch-pan-y no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {notes.length === 0 ? (
                    <div className="py-7 text-center text-white/35 text-[12px] flex flex-col items-center gap-2">
                      <img
                        src="/apple-notes.png"
                        alt="Notes"
                        className="w-8 h-8 object-contain opacity-60 select-none pointer-events-none drop-shadow-md"
                      />
                      <span>No notes yet. Tap + to write one.</span>
                    </div>
                  ) : (
                    notes.map((note) => {
                      const displayTitle =
                        note.title.trim() ||
                        note.content.trim().split("\n")[0] ||
                        "Untitled Note";
                      const displaySnippet =
                        note.content.trim() || "Empty note";

                      return (
                        <div
                          key={note.id}
                          onMouseEnter={() => setHoveredNoteId(note.id)}
                          onClick={() => setActiveNoteId(note.id)}
                          className="group relative flex items-center justify-between gap-2.5 min-h-[42px] py-1.5 px-2.5 rounded-xl cursor-pointer"
                        >
                          {hoveredNoteId === note.id && (
                            <motion.div
                              layoutId="notch-notes-liquid-highlight"
                              className="absolute inset-0 rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] pointer-events-none"
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 35,
                              }}
                            />
                          )}

                          {/* Note icon indicator */}
                          <img
                            src="/apple-notes.png"
                            alt=""
                            className="relative z-10 w-4 h-4 object-contain shrink-0 opacity-80 group-hover:opacity-100 transition-opacity select-none pointer-events-none"
                          />

                          {/* Middle: Title & Snippet */}
                          <div className="relative z-10 flex-1 min-w-0 py-0.5">
                            <p className="text-[12.5px] font-medium text-white/90 tracking-tight truncate leading-snug">
                              {displayTitle}
                            </p>
                            <p className="text-[10.5px] text-white/40 tracking-tight mt-0.5 truncate leading-snug">
                              {displaySnippet}
                            </p>
                          </div>

                          {/* Right: Relative time & delete action */}
                          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
                            <span className="inline-flex items-center rounded-md border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                              {formatRelativeTime(note.updatedAt)}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(note.id);
                              }}
                              title="Delete note"
                              className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded-md flex items-center justify-center text-white/35 hover:text-rose-400 hover:bg-white/[0.08] transition-all cursor-pointer"
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </aside>
  );
});
