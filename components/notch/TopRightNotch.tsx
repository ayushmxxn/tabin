"use client";

import { useEffect, useState, useRef, useMemo, memo } from "react";
import { AnimatePresence, motion } from "motion/react";

interface NotchTodo {
  id: string;
  title: string;
  time?: string;
  duration?: string;
  completed: boolean;
}

const STORAGE_KEY = "tabin-notch-todos";

const INITIAL_TODOS: NotchTodo[] = [
  {
    id: "todo-1",
    title: "Sunday Meditation",
    time: "3:00 pm - 3:30 pm",
    duration: "30 min",
    completed: false,
  },
  {
    id: "todo-2",
    title: "Meeting with Sara",
    time: "4:00 pm - 6:00 pm",
    duration: "2 hours",
    completed: false,
  },
];

function calculateTimeRangeAndDuration(startStr: string, endStr: string) {
  if (!startStr || !endStr) return null;
  const startParts = startStr.split(":");
  const endParts = endStr.split(":");
  if (startParts.length < 2 || endParts.length < 2) return null;

  const startH = Number(startParts[0]);
  const startM = Number(startParts[1]);
  const endH = Number(endParts[0]);
  const endM = Number(endParts[1]);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;

  let startTotalMins = startH * 60 + startM;
  let endTotalMins = endH * 60 + endM;

  if (endTotalMins < startTotalMins) {
    endTotalMins += 24 * 60;
  }

  const diffMins = endTotalMins - startTotalMins;
  if (diffMins <= 0) return null;

  let durationStr = "";
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0 && mins > 0) {
    durationStr = `${hours}h ${mins}m`;
  } else if (hours > 0) {
    durationStr = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  } else {
    durationStr = `${mins} min`;
  }

  const format12h = (h: number, m: number) => {
    const normH = h % 24;
    const period = normH >= 12 ? "pm" : "am";
    const displayH = normH % 12 || 12;
    const displayM = m.toString().padStart(2, "0");
    return `${displayH}:${displayM} ${period}`;
  };

  const rangeStr = `${format12h(startH, startM)} - ${format12h(endH, endM)}`;

  return { durationStr, rangeStr };
}

function parseTimeString(time24: string) {
  const parts = time24.split(":");
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { h12, minute: m, period };
}

function toTimeString(h12: number, minute: number, period: "AM" | "PM"): string {
  let h24 = h12 % 12;
  if (period === "PM") {
    h24 += 12;
  }
  const hStr = h24.toString().padStart(2, "0");
  const mStr = minute.toString().padStart(2, "0");
  return `${hStr}:${mStr}`;
}

function formatDisplayTime(time24: string): string {
  const { h12, minute, period } = parseTimeString(time24);
  const mStr = minute.toString().padStart(2, "0");
  return `${h12}:${mStr} ${period.toLowerCase()}`;
}

const TIME_SLOTS: { time24: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const h24Str = h.toString().padStart(2, "0");
    const mStr = m.toString().padStart(2, "0");
    const time24 = `${h24Str}:${mStr}`;
    const period = h >= 12 ? "pm" : "am";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${h12}:${mStr} ${period}`;
    TIME_SLOTS.push({ time24, label });
  }
}

interface SimpleTimeDropdownProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  showDurationFor?: string;
  align?: "left" | "right";
}

const SimpleTimeDropdown = memo(function SimpleTimeDropdown({
  value,
  onChange,
  onClose,
  showDurationFor,
  align = "left",
}: SimpleTimeDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector<HTMLElement>(
      "[data-selected='true']"
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      onClick={(e) => e.stopPropagation()}
      className={`absolute top-[calc(100%+6px)] ${
        align === "right" ? "right-0" : "left-0"
      } z-50 w-44 rounded-2xl bg-[#121214]/98 border border-white/12 p-1.5 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-3xl`}
    >
      <div
        ref={listRef}
        className="max-h-48 overflow-y-auto space-y-0.5 no-scrollbar [scrollbar-width:none] pr-0.5"
      >
        {TIME_SLOTS.map((slot) => {
          const isSelected = slot.time24 === value;
          const durationInfo = showDurationFor
            ? calculateTimeRangeAndDuration(showDurationFor, slot.time24)
            : null;

          return (
            <button
              key={slot.time24}
              type="button"
              data-selected={isSelected}
              onClick={() => {
                onChange(slot.time24);
                onClose();
              }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#FA1E76] text-white font-semibold shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <span>{slot.label}</span>
              {durationInfo && (
                <span
                  className={`text-[10px] font-normal ${
                    isSelected ? "text-white/90" : "text-white/35"
                  }`}
                >
                  {durationInfo.durationStr}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
});

export const TopRightNotch = memo(function TopRightNotch() {
  const [isHovered, setIsHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [todos, setTodos] = useState<NotchTodo[]>(INITIAL_TODOS);
  const [newTitle, setNewTitle] = useState("");
  const [hasTimeRange, setHasTimeRange] = useState(false);
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("15:30");
  const [activeTimePicker, setActiveTimePicker] = useState<"start" | "end" | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const startParts = newStart.split(":");
    const endParts = endTime.split(":");
    const startH = Number(startParts[0] ?? 0);
    const startM = Number(startParts[1] ?? 0);
    const endH = Number(endParts[0] ?? 0);
    const endM = Number(endParts[1] ?? 0);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (endMins <= startMins) {
      const nextTotal = (startMins + 30) % (24 * 60);
      const nextH = Math.floor(nextTotal / 60).toString().padStart(2, "0");
      const nextM = (nextTotal % 60).toString().padStart(2, "0");
      setEndTime(`${nextH}:${nextM}`);
    }
  };

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeTimePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-time-picker]")) {
        setActiveTimePicker(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTimePicker]);

  const computedTime = useMemo(() => {
    if (!hasTimeRange) return null;
    return calculateTimeRangeAndDuration(startTime, endTime);
  }, [hasTimeRange, startTime, endTime]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load todos from chrome.storage.local or localStorage
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        if (Array.isArray(res[STORAGE_KEY]) && res[STORAGE_KEY].length > 0) {
          setTodos(res[STORAGE_KEY]);
        }
      });
    } else {
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTodos(parsed);
          }
        }
      } catch {}
    }
  }, []);

  // Save todos whenever they change
  const persistTodos = (updated: NotchTodo[]) => {
    setTodos(updated);
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
    if (isInputFocused || activeTimePicker !== null) return;
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setIsAdding(false);
      setActiveTimePicker(null);
    }, 280);
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    );
    persistTodos(updated);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    persistTodos(updated);
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const timeInfo = hasTimeRange
      ? calculateTimeRangeAndDuration(startTime, endTime)
      : null;

    const newTodo: NotchTodo = {
      id: "todo-" + Date.now(),
      title: trimmed,
      time: timeInfo?.rangeStr,
      duration: timeInfo?.durationStr,
      completed: false,
    };

    persistTodos([...todos, newTodo]);
    setNewTitle("");
    setHasTimeRange(false);
    setActiveTimePicker(null);
    setIsAdding(false);
  };

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const formattedDateShort = currentTime.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    weekday: "short",
  });


  const showExpanded = isHovered || isInputFocused || activeTimePicker !== null;

  return (
    <aside
      aria-label="Tabin Dynamic Status Notch"
      className="fixed top-0 right-10 z-40 select-none"
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
        className="relative bg-[#121214]/95 border-b border-x border-white/12 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.1)] rounded-b-[24px] backdrop-blur-3xl"
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
          <path
            d="M0 0 C6.627 0 12 5.373 12 12"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
        </svg>

        {/* Right concave fillet ear */}
        <svg
          className="absolute -right-3 top-0 w-3 h-3 text-[#121214] pointer-events-none overflow-visible"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M0 0 H12 C5.373 0 0 5.373 0 12 V0 Z" fill="currentColor" />
          <path
            d="M12 0 C5.373 0 0 5.373 0 12"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
        </svg>

        {/* Collapsed State: Time and Date only */}
        {!showExpanded && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 whitespace-nowrap cursor-pointer">
            <span className="text-[12.5px] font-semibold text-white/90 tracking-tight">
              {formattedTime}
            </span>
            <span className="text-white/25 text-[10px]">•</span>
            <span className="text-[11.5px] font-medium text-white/60 tracking-tight">
              {formattedDateShort}
            </span>
          </div>
        )}

        {/* Expanded State: Reference Image Layout with Tabin Branding */}
        {showExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="p-3 pb-4"
          >
            {/* Header: Title & Action */}
            <div className="flex items-center justify-between px-1 pb-2.5 border-b border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-white/95 tracking-tight">
                Today's To Do
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAdding((prev) => !prev);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                title={isAdding ? "Close form" : "Add task"}
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
                  className={`transition-transform duration-150 ${isAdding ? "rotate-45" : ""}`}
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* To-Do Items List */}
            <div className="pt-2 space-y-0.5 max-h-[280px] overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {todos.length === 0 ? (
                <div className="py-6 text-center text-white/35 text-[12px]">
                  No tasks yet today. Tap + to add one.
                </div>
              ) : (
                todos.map((todo) => {
                  return (
                    <div
                      key={todo.id}
                      className="group flex items-center justify-between gap-2.5 min-h-[38px] py-1.5 px-2 rounded-xl hover:bg-white/[0.06] active:bg-white/[0.10] transition-colors cursor-pointer"
                      onClick={() => toggleTodo(todo.id)}
                    >
                      {/* Left: Squircle Checkbox Indicator */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTodo(todo.id);
                        }}
                        className={`relative h-4 w-4 shrink-0 rounded-[5px] border transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
                          todo.completed
                            ? "bg-[#FA1E76] border-[#FA1E76] text-white shadow-[0_0_8px_rgba(250,30,118,0.4)]"
                            : "border-white/25 hover:border-[#FA1E76]/80 bg-white/[0.04]"
                        }`}
                        title={todo.completed ? "Mark as active" : "Mark as completed"}
                      >
                        {todo.completed && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>

                      {/* Middle: Title & Time Subtitle */}
                      <div className="flex-1 min-w-0 py-0.5">
                        <p
                          className={`text-[12.5px] font-medium tracking-tight truncate leading-snug transition-all ${
                            todo.completed
                              ? "line-through text-white/35"
                              : "text-white/95"
                          }`}
                        >
                          {todo.title}
                        </p>
                        {todo.time && todo.time.includes(" - ") && !todo.time.includes("Later") && (
                          <p className="text-[10.5px] text-white/40 tracking-tight mt-0.5 truncate leading-snug">
                            {todo.time}
                          </p>
                        )}
                      </div>

                      {/* Right: Squircle Duration badge & delete action */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="inline-flex items-center rounded-md border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-colors"
                        >
                          {todo.duration || "Anytime"}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTodo(todo.id);
                          }}
                          title="Delete"
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

            {/* Inline Quick Add Form */}
            <AnimatePresence>
              {isAdding && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleAddTodo}
                  className="pt-2.5 mt-2 border-t border-white/[0.08] space-y-2.5 relative pb-0.5"
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      placeholder="What's next? (e.g. Design review)"
                      className="min-w-0 flex-1 h-[34px] rounded-[9px] bg-white/[0.06] border border-white/12 px-3 text-[12px] text-white placeholder-white/35 focus:border-[#FA1E76]/70 focus:ring-1 focus:ring-[#FA1E76]/30 focus:outline-none transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    />
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className="h-[34px] rounded-[9px] bg-[#FA1E76] hover:bg-[#ff3086] active:scale-95 px-3.5 text-[11.5px] font-medium text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 shadow-[0_2px_8px_rgba(250,30,118,0.3)]"
                    >
                      Add
                    </button>
                  </div>

                  {/* Schedule Time Selection */}
                  {!hasTimeRange ? (
                    <div className="flex items-center px-0.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setHasTimeRange(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/20 px-2.5 py-1 text-[11px] font-medium text-white/75 hover:text-white transition-all cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] active:scale-95"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white/50"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Set time</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1.5 pt-1 px-0.5 text-[11px] relative">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="relative" data-time-picker="start">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTimePicker(
                                activeTimePicker === "start" ? null : "start"
                              )
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium border whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                              activeTimePicker === "start"
                                ? "bg-[#FA1E76]/20 border-[#FA1E76]/60 text-white shadow-sm ring-1 ring-[#FA1E76]/40"
                                : "bg-white/[0.06] border-white/12 text-white/90 hover:border-white/25 hover:bg-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                            }`}
                          >
                            <span>{formatDisplayTime(startTime)}</span>
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              className={`text-white/40 transition-transform duration-150 ${
                                activeTimePicker === "start"
                                  ? "rotate-180 text-[#FA1E76]"
                                  : ""
                              }`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>

                          <AnimatePresence>
                            {activeTimePicker === "start" && (
                              <SimpleTimeDropdown
                                value={startTime}
                                onChange={handleStartTimeChange}
                                onClose={() => setActiveTimePicker(null)}
                                align="left"
                              />
                            )}
                          </AnimatePresence>
                        </div>

                        <span className="text-white/35 text-[11px] font-medium select-none px-0.5">to</span>

                        <div className="relative" data-time-picker="end">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTimePicker(
                                activeTimePicker === "end" ? null : "end"
                              )
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium border whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                              activeTimePicker === "end"
                                ? "bg-[#FA1E76]/20 border-[#FA1E76]/60 text-white shadow-sm ring-1 ring-[#FA1E76]/40"
                                : "bg-white/[0.06] border-white/12 text-white/90 hover:border-white/25 hover:bg-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                            }`}
                          >
                            <span>{formatDisplayTime(endTime)}</span>
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              className={`text-white/40 transition-transform duration-150 ${
                                activeTimePicker === "end"
                                  ? "rotate-180 text-[#FA1E76]"
                                  : ""
                              }`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>

                          <AnimatePresence>
                            {activeTimePicker === "end" && (
                              <SimpleTimeDropdown
                                value={endTime}
                                onChange={setEndTime}
                                onClose={() => setActiveTimePicker(null)}
                                showDurationFor={startTime}
                                align="left"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {computedTime && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/15 text-white/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] text-[10.5px] font-medium whitespace-nowrap">
                            {computedTime.durationStr}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setHasTimeRange(false);
                            setActiveTimePicker(null);
                          }}
                          title="Remove time"
                          className="h-5 w-5 rounded-md flex items-center justify-center text-white/35 hover:text-rose-400 hover:bg-white/[0.08] transition-all cursor-pointer shrink-0"
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </aside>
  );
});
