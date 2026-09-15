import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Tile } from '../shortcut/Tile';
import { useLaunchpadStore, selectAllShortcuts } from '@/store/useLaunchpadStore';
import { getHostname } from '@/lib/utils';

export function Search() {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useLaunchpadStore((state) => state.items);
  const isSearchOpen = useLaunchpadStore((state) => state.isSearchOpen);
  const searchQuery = useLaunchpadStore((state) => state.searchQuery);
  const searchEngine = useLaunchpadStore((state) => state.settings?.searchEngine ?? 'google');
  const setSearchOpen = useLaunchpadStore((state) => state.setSearchOpen);
  const setSearchQuery = useLaunchpadStore((state) => state.setSearchQuery);

  const allShortcuts = selectAllShortcuts(items);
  const query = searchQuery.trim().toLowerCase();
  const results = query
    ? allShortcuts.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          getHostname(item.url).toLowerCase().includes(query),
      )
    : allShortcuts.slice(0, 6);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement !== inputRef.current) {
        event.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        inputRef.current?.blur();
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [isSearchOpen, setSearchOpen]);

  const openAndClose = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setSearchOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (results.length > 0 && query && results[0]?.url) {
        openAndClose(results[0].url);
      } else if (searchQuery.trim()) {
        const queryTerm = encodeURIComponent(searchQuery.trim());
        let engineUrl = `https://www.google.com/search?q=${queryTerm}`;
        if (searchEngine === 'duckduckgo') engineUrl = `https://duckduckgo.com/?q=${queryTerm}`;
        if (searchEngine === 'bing') engineUrl = `https://www.bing.com/search?q=${queryTerm}`;
        openAndClose(engineUrl);
      }
    }
  };

  const isCenteredPlaceholder = !isSearchOpen && !searchQuery;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-30 flex flex-col items-center px-4">
      <div
        ref={containerRef}
        className={isSearchOpen ? 'pointer-events-auto w-[280px] transition-all duration-200' : 'pointer-events-auto w-[240px] transition-all duration-200'}
      >
        <div
          className={`relative flex h-[28px] items-center rounded-[6px] border px-2.5 backdrop-blur-xl transition-all ${
            isSearchOpen
              ? 'border-white/25 bg-white/15 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)]'
              : 'border-white/10 bg-white/[0.12] hover:border-white/20 hover:bg-white/15'
          }`}
          onClick={() => {
            setSearchOpen(true);
            inputRef.current?.focus();
          }}
        >
          {/* Centered idle state indicator matching macOS Launchpad */}
          {isCenteredPlaceholder && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-white/50">
              <svg
                aria-hidden
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0 text-white/50"
              >
                <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[12px] font-normal tracking-tight">Search</span>
            </div>
          )}

          {/* Active left-aligned input */}
          <div className={`flex w-full items-center gap-2 ${isCenteredPlaceholder ? 'opacity-0' : 'opacity-100'}`}>
            <svg
              aria-hidden
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              className="shrink-0 text-white/50"
            >
              <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search"
              className="w-full bg-transparent text-[12px] text-white placeholder:text-white/40 focus:outline-none"
            />
            {isSearchOpen && (
              <kbd className="shrink-0 rounded border border-white/15 px-1 py-0.2 text-[10px] text-white/40">
                esc
              </kbd>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-[#140f20]/92 p-1.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            >
              {results.length === 0 ? (
                <div className="px-3 py-3 text-center">
                  <p className="text-caption text-white/40">
                    No shortcuts match &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="mt-1 text-[11px] text-white/30">
                    Press <kbd className="text-white/60">Enter</kbd> to search on {searchEngine}
                  </p>
                </div>
              ) : (
                <ul>
                  {results.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => openAndClose(item.url)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/10"
                      >
                        <Tile title={item.title} url={item.url} accent={item.accent} size="sm" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-caption font-medium text-white/90">
                            {item.title}
                          </span>
                          <span className="truncate text-[11px] text-white/40">
                            {getHostname(item.url)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
