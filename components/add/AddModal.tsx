import { fetchWebsiteMetadata } from "@/lib/fetchMetadata";
import { DEFAULT_FOLDER_COLOR } from "@/lib/folderColors";
import { cn, getFaviconUrl, getHostname } from "@/lib/utils";
import { selectSpaceItems, useLaunchpadStore } from "@/store/useLaunchpadStore";
import type { FolderItem } from "@/types";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Tile } from "../shortcut/Tile";

const KNOWN_DOMAINS: Record<string, string> = {
  github: "GitHub",
  youtube: "YouTube",
  google: "Google",
  twitter: "X",
  x: "X",
  reddit: "Reddit",
  notion: "Notion",
  figma: "Figma",
  spotify: "Spotify",
  linear: "Linear",
  slack: "Slack",
  discord: "Discord",
  twitch: "Twitch",
  netflix: "Netflix",
  amazon: "Amazon",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  raycast: "Raycast",
  flipkart: "Flipkart",
  myntra: "Myntra",
  zomato: "Zomato",
  primevideo: "Prime Video",
  disneyplus: "Disney+",
  "serenity-ui": "Serenity UI",
  obsidian: "Obsidian",
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  openclaw: "OpenClaw",
  "hermes-agent": "Hermes Agent",
  granola: "Granola",
  midjourney: "Midjourney",
  spline: "Spline",
  rive: "Rive",
  wisprflow: "Wispr Flow",
  framer: "Framer",
  webflow: "Webflow",
  beehiiv: "Beehiiv",
  cal: "Cal.com",
  cap: "Cap",
  runable: "Runable",
  viktor: "Viktor",
  elevenlabs: "ElevenLabs",
  cursor: "Cursor",
  manus: "Manus",
  recraft: "Recraft",
  typesafe: "TypeSafe AI",
};

function cleanTitleFromUrl(rawUrl: string): string {
  try {
    const formatted = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(formatted);
    const host = parsed.hostname.replace(/^(www|web|open|app)\./, "");
    const parts = host.split(".");
    const name = parts[0]?.toLowerCase() || "Website";
    if (KNOWN_DOMAINS[name]) return KNOWN_DOMAINS[name];
    if (host.includes("ayushmxxn.com")) return "ayushmxxn.com";
    if (host.includes("serenity-ui.com")) return "Serenity UI";
    if (host.includes("hermes-agent")) return "Hermes Agent";
    if (host.includes("openclaw")) return "OpenClaw";
    if (host.includes("wisprflow")) return "Wispr Flow";
    if (host.includes("beehiiv")) return "Beehiiv";
    if (host.includes("cal.com")) return "Cal.com";
    if (host.includes("cap.so")) return "Cap";
    if (host.includes("runable")) return "Runable";
    if (host.includes("viktor")) return "Viktor";
    if (host.includes("superlist") || host.includes("superli.st")) return "Superlist";
    if (host.includes("stacklist")) return "Stacklist";
    if (host.includes("mira.tg")) return "Mira";
    if (host.includes("kolo")) return "Kolo";
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "";
  }
}

export function AddModal() {
  const isAddModalOpen = useLaunchpadStore((state) => state.isAddModalOpen);
  const setAddModalOpen = useLaunchpadStore((state) => state.setAddModalOpen);

  const spaces = useLaunchpadStore((state) => state.spaces);
  const activeSpaceIndex = useLaunchpadStore((state) => state.activeSpaceIndex);
  const currentSpaceId = spaces[activeSpaceIndex]?.id ?? "space-home";
  const items = useLaunchpadStore((state) => state.items);

  const addShortcut = useLaunchpadStore((state) => state.addShortcut);
  const addFolder = useLaunchpadStore((state) => state.addFolder);
  const openFolder = useLaunchpadStore((state) => state.openFolder);
  const openFolderId = useLaunchpadStore((state) => state.openFolderId);
  const updateItem = useLaunchpadStore((state) => state.updateItem);

  const [mode, setMode] = useState<"website" | "folder">("website");

  // Website form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isTitleTouched, setIsTitleTouched] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Folder form state
  const [folderTitle, setFolderTitle] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [hoveredShortcutIdx, setHoveredShortcutIdx] = useState<number | null>(
    null,
  );

  // Close on Escape key
  useEffect(() => {
    if (!isAddModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddModalOpen, setAddModalOpen]);

  // Reset states whenever modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      setUrl("");
      setTitle("");
      setIsTitleTouched(false);
      setShowDetails(false);
      setFolderTitle("");
      setSelectedItemIds([]);
    }
  }, [isAddModalOpen]);

  // Handle typing URL: auto-infer title and preview favicon
  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (!isTitleTouched) {
      const inferred = cleanTitleFromUrl(value);
      if (inferred) {
        setTitle(inferred);
      }
    }
  };

  const previewFavicon = url.trim()
    ? getFaviconUrl(url.startsWith("http") ? url : `https://${url}`, 64)
    : null;

  // Available shortcuts in current space (not inside any folder)
  const availableShortcuts = selectSpaceItems(items, currentSpaceId).filter(
    (item) => item.type === "shortcut",
  );

  const activeFolder = openFolderId
    ? items.find(
        (item): item is FolderItem =>
          item.type === "folder" && item.id === openFolderId,
      )
    : null;

  const handleAddWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    const finalUrl =
      cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")
        ? cleanUrl
        : `https://${cleanUrl}`;

    const id = addShortcut({
      url: finalUrl,
      title: title.trim() || cleanTitleFromUrl(cleanUrl) || "Bookmark",
      spaceId: currentSpaceId,
      folderId: openFolderId,
      accent: "violet",
    });

    setAddModalOpen(false);

    fetchWebsiteMetadata(finalUrl)
      .then((meta) => {
        if (meta.ogImage) {
          updateItem(id, { ogImage: meta.ogImage });
        }
      })
      .catch(() => {});
  };

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = folderTitle.trim();
    if (!name) return;

    const newFolderId = addFolder({
      title: name,
      spaceId: currentSpaceId,
      itemIds: selectedItemIds,
      accent: "blue",
      color: DEFAULT_FOLDER_COLOR,
    });

    // Open immediately
    openFolder(newFolderId);
    setAddModalOpen(false);
  };

  const toggleShortcutSelection = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  if (!isAddModalOpen) return null;

  const displayInferredTitle = title || cleanTitleFromUrl(url);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setAddModalOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -4 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          className="relative w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#141414]/98 p-3 text-white shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5">
            {/* Segmented Mode Switcher */}
            <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
              <button
                type="button"
                onClick={() => setMode("website")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer",
                  mode === "website"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/50 hover:text-white",
                )}
              >
                Website
              </button>
              <button
                type="button"
                onClick={() => setMode("folder")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer",
                  mode === "folder"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/50 hover:text-white",
                )}
              >
                Folder
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs cursor-pointer"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>{" "}
          {/* Add Website Form */}
          {mode === "website" && (
            <form onSubmit={handleAddWebsite} className="space-y-2.5">
              <div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="Website URL"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.06] pl-3 pr-8 py-2 text-[12px] text-white placeholder:text-white/40 focus:outline-none focus:bg-white/[0.08] transition-all"
                  />
                  {previewFavicon ? (
                    <div className="absolute right-2 flex h-5 w-5 items-center justify-center rounded overflow-hidden">
                      <img
                        src={previewFavicon}
                        alt=""
                        className="h-3.5 w-3.5 object-contain"
                      />
                    </div>
                  ) : null}
                </div>

                {url.trim() ? (
                  <p className="mt-1 px-1 text-[11px] text-white/40 truncate">
                    Adding as{" "}
                    <span className="text-white/80 font-medium">
                      {displayInferredTitle || "Bookmark"}
                    </span>
                    {activeFolder ? (
                      <>
                        {" "}
                        to{" "}
                        <span className="text-[#FA1E76] font-medium">
                          {activeFolder.title}
                        </span>
                      </>
                    ) : (
                      <>
                        {" "}
                        to{" "}
                        <span className="text-white/70 font-medium">Home</span>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="mt-1 px-1 text-[11px] text-white/35 truncate">
                    Adding to{" "}
                    {activeFolder ? (
                      <span className="text-[#FA1E76] font-medium">
                        {activeFolder.title}
                      </span>
                    ) : (
                      <span className="text-white/70 font-medium">Home</span>
                    )}
                  </p>
                )}
              </div>

              {/* Optional Title Details */}
              <div>
                {!showDetails ? (
                  <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="px-1 text-[11px] text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    + Edit title (optional)
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1"
                  >
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setIsTitleTouched(true);
                      }}
                      placeholder="Title"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-[12px] text-white placeholder:text-white/40 focus:outline-none focus:bg-white/[0.08] transition-all"
                    />
                  </motion.div>
                )}
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-lg px-2.5 py-1.5 text-[12px] text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!url.trim()}
                  className="rounded-lg bg-[#FA1E76] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-[0_2px_12px_rgba(250,30,118,0.35)] hover:bg-[#ff3086] active:bg-[#e01666] disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none transition-all cursor-pointer"
                >
                  {activeFolder
                    ? `Add to ${activeFolder.title}`
                    : "Add Website"}
                </button>
              </div>
            </form>
          )}
          {/* New Folder Form */}
          {mode === "folder" && (
            <form onSubmit={handleAddFolder} className="space-y-2.5">
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={folderTitle}
                  onChange={(e) => setFolderTitle(e.target.value)}
                  placeholder="Folder Name"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-[12px] text-white placeholder:text-white/40 focus:outline-none focus:bg-white/[0.08] transition-all"
                />
              </div>

              {/* Multi-select Existing Shortcuts matching search dropdown style */}
              {availableShortcuts.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] text-white/40">
                      Add existing shortcuts
                    </span>
                    {selectedItemIds.length > 0 && (
                      <span className="text-[10px] text-[#FA1E76] font-medium">
                        {selectedItemIds.length} selected
                      </span>
                    )}
                  </div>
                  <div
                    className="max-h-44 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-1 space-y-0.5 scrollbar-thin"
                    onMouseLeave={() => setHoveredShortcutIdx(null)}
                  >
                    {availableShortcuts.map((item, idx) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      const isHov = hoveredShortcutIdx === idx;
                      return (
                        <div key={item.id} className="relative">
                          {isHov && (
                            <motion.div
                              layoutId="folder-shortcut-highlight"
                              className={cn(
                                "absolute inset-0 rounded-lg",
                                isSelected ? "bg-[#FA1E76]/25" : "bg-white/10",
                              )}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 35,
                              }}
                            />
                          )}
                          {isSelected && !isHov && (
                            <div className="absolute inset-0 rounded-lg bg-[#FA1E76]/15 pointer-events-none" />
                          )}
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredShortcutIdx(idx)}
                            onClick={() => toggleShortcutSelection(item.id)}
                            className="relative group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left cursor-pointer border-0 outline-none focus:outline-none focus:ring-0 text-white/70 hover:text-white"
                          >
                            <Tile
                              title={item.title}
                              url={item.url}
                              accent={item.accent}
                              size="sm"
                            />
                            <span className="flex min-w-0 flex-col flex-1">
                              <span className="truncate text-caption font-medium text-white/90">
                                {item.title}
                              </span>
                              <span className="truncate text-[11px] text-white/40">
                                {getHostname(item.url)}
                              </span>
                            </span>
                            {isSelected ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#FA1E76] text-white shrink-0 shadow-sm">
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            ) : (
                              <span className="flex h-5 w-5 items-center justify-center rounded-md text-white/40 group-hover:text-white/75 shrink-0 transition-colors">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                >
                                  <line x1="12" y1="5" x2="12" y2="19" />
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-lg px-2.5 py-1.5 text-[12px] text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!folderTitle.trim()}
                  className="rounded-lg bg-[#FA1E76] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-[0_2px_12px_rgba(250,30,118,0.35)] hover:bg-[#ff3086] active:bg-[#e01666] disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none transition-all cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
