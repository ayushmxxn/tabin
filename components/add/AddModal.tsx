import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLaunchpadStore, selectSpaceItems } from '@/store/useLaunchpadStore';
import { getFaviconUrl, getHostname } from '@/lib/utils';
import type { AccentToken } from '@/types';

function cleanTitleFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.replace(/^www\./, '');
    const parts = host.split('.');
    const name = parts[0] || 'Bookmark';
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return '';
  }
}

export function AddModal() {
  const isAddModalOpen = useLaunchpadStore((state) => state.isAddModalOpen);
  const setAddModalOpen = useLaunchpadStore((state) => state.setAddModalOpen);

  const spaces = useLaunchpadStore((state) => state.spaces);
  const activeSpaceIndex = useLaunchpadStore((state) => state.activeSpaceIndex);
  const items = useLaunchpadStore((state) => state.items);

  const addShortcut = useLaunchpadStore((state) => state.addShortcut);
  const addFolder = useLaunchpadStore((state) => state.addFolder);

  const [mode, setMode] = useState<'website' | 'folder'>('website');

  // Website fields
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isTitleTouched, setIsTitleTouched] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaces[activeSpaceIndex]?.id ?? 'space-home');
  const [addToDock, setAddToDock] = useState(false);
  const [accent, setAccent] = useState<AccentToken>('violet');

  // Folder fields
  const [folderTitle, setFolderTitle] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Update space selection when active space changes
  useEffect(() => {
    if (spaces[activeSpaceIndex]) {
      setSelectedSpaceId(spaces[activeSpaceIndex].id);
    }
  }, [activeSpaceIndex, spaces]);

  // Auto-capture title and favicon from URL
  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (!isTitleTouched) {
      const inferred = cleanTitleFromUrl(value);
      if (inferred) {
        setTitle(inferred);
      }
    }
  };

  const previewFavicon = url ? getFaviconUrl(url.startsWith('http') ? url : `https://${url}`, 64) : null;

  const currentSpaceShortcuts = selectSpaceItems(items, selectedSpaceId).filter(
    (item) => item.type === 'shortcut',
  );

  const handleAddWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    addShortcut({
      url: url.trim(),
      title: title.trim() || cleanTitleFromUrl(url) || 'Bookmark',
      spaceId: selectedSpaceId,
      accent,
      addToDock,
    });

    // Reset & close
    setUrl('');
    setTitle('');
    setIsTitleTouched(false);
    setAddToDock(false);
    setAddModalOpen(false);
  };

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderTitle.trim()) return;

    addFolder({
      title: folderTitle.trim(),
      spaceId: selectedSpaceId,
      itemIds: selectedItemIds,
      accent,
    });

    setFolderTitle('');
    setSelectedItemIds([]);
    setAddModalOpen(false);
  };

  const toggleFolderItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  if (!isAddModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-[440px] overflow-hidden rounded-[16px] border border-white/20 bg-[#161224]/94 shadow-[0_30px_90px_rgba(0,0,0,0.8)] backdrop-blur-3xl text-white select-none p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            {/* macOS Window Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAddModalOpen(false)}
                className="h-3 w-3 rounded-full bg-[#ff5f56] hover:brightness-90 transition-all"
                title="Close"
              />
              <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>

            <div className="flex rounded-lg border border-white/10 bg-white/[0.06] p-0.5">
              <button
                type="button"
                onClick={() => setMode('website')}
                className={`rounded-md px-3 py-1 text-[12px] font-medium transition-all ${
                  mode === 'website' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                Website
              </button>
              <button
                type="button"
                onClick={() => setMode('folder')}
                className={`rounded-md px-3 py-1 text-[12px] font-medium transition-all ${
                  mode === 'folder' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                Folder
              </button>
            </div>
          </div>

          {/* Website Form */}
          {mode === 'website' && (
            <form onSubmit={handleAddWebsite} className="mt-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-white/80 mb-1">
                  Website URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none"
                  />
                  {previewFavicon && (
                    <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.06]">
                      <img src={previewFavicon} alt="" className="h-5 w-5 object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/80 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsTitleTouched(true);
                  }}
                  placeholder="Website Name"
                  className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-white/80 mb-1">
                    Space
                  </label>
                  <select
                    value={selectedSpaceId}
                    onChange={(e) => setSelectedSpaceId(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#1e1930] px-3 py-2 text-[13px] text-white focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-white/80 mb-1">
                    Fallback Accent
                  </label>
                  <select
                    value={accent}
                    onChange={(e) => setAccent(e.target.value as AccentToken)}
                    className="w-full rounded-lg border border-white/15 bg-[#1e1930] px-3 py-2 text-[13px] text-white capitalize focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    {(['violet', 'blue', 'teal', 'amber', 'rose', 'slate'] as AccentToken[]).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dock-checkbox"
                  checked={addToDock}
                  onChange={(e) => setAddToDock(e.target.checked)}
                  className="h-4 w-4 rounded accent-blue-500 cursor-pointer"
                />
                <label htmlFor="dock-checkbox" className="text-[12px] text-white/80 cursor-pointer">
                  Also pin to Dock
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] font-medium text-white shadow hover:bg-blue-500"
                >
                  Add Bookmark
                </button>
              </div>
            </form>
          )}

          {/* Folder Form */}
          {mode === 'folder' && (
            <form onSubmit={handleAddFolder} className="mt-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-white/80 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={folderTitle}
                  onChange={(e) => setFolderTitle(e.target.value)}
                  placeholder="e.g. Design Tools, Social, Work"
                  className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/80 mb-1">
                  Space
                </label>
                <select
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#1e1930] px-3 py-2 text-[13px] text-white focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/80 mb-1">
                  Include Shortcuts
                </label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-white/15 bg-white/[0.04] p-1.5 space-y-1">
                  {currentSpaceShortcuts.length === 0 ? (
                    <p className="p-2 text-center text-[11px] text-white/40">
                      No shortcuts in this space yet.
                    </p>
                  ) : (
                    currentSpaceShortcuts.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleFolderItem(item.id)}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] transition-colors ${
                            isSelected ? 'bg-blue-600/30 text-white' : 'text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {isSelected && <span className="text-blue-400 font-bold">✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] font-medium text-white shadow hover:bg-blue-500"
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
