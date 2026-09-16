import type { FolderItem, LaunchpadItem } from '@/types';

export interface ParsedItem {
  title: string;
  url: string;
  folderPath: string[]; // e.g. ['Work'] or ['Work', 'Design']
  folderName: string | null; // leaf folder or null
  isDuplicate: boolean;
}

export interface ParsedImportResult {
  format: 'html' | 'json' | 'csv' | 'text' | 'chrome';
  items: ParsedItem[];
  totalCount: number;
  duplicateCount: number;
  invalidCount: number;
  folderNames: string[];
  folderPaths: string[][];
  rawTabinBackup?: {
    version?: number;
    items: LaunchpadItem[];
    dockIds?: string[];
    settings?: unknown;
    wallpaper?: unknown;
  };
}

export interface RawParsedEntry {
  title: string;
  url: string;
  folderPath: string[];
}

const GENERIC_ROOT_FOLDERS = new Set([
  'bookmarks bar',
  'bookmarks toolbar',
  'other bookmarks',
  'mobile bookmarks',
  'imported',
  'favorites',
  'favorites bar',
  'synced bookmarks',
]);

export function normalizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Disallow non-web / unsafe protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('about:') ||
    lower.startsWith('chrome:')
  ) {
    return null;
  }

  let fullUrl = trimmed;
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = `https://${fullUrl}`;
  }

  try {
    const parsed = new URL(fullUrl);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      // allow localhost
      if (parsed.hostname !== 'localhost') return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function inferTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const parts = host.split('.');
    const name = parts[0] || 'Bookmark';
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Bookmark';
  }
}

export function detectBookmarkFormat(
  content: string,
  filename?: string,
): 'html' | 'json' | 'csv' | 'text' {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'json') return 'json';
  if (ext === 'csv') return 'csv';

  const trimmed = content.trim();

  // HTML Netscape signature
  if (
    /<!DOCTYPE\s+NETSCAPE-Bookmark-file-1/i.test(trimmed) ||
    (/<DL/i.test(trimmed) && /<A\s+HREF=/i.test(trimmed)) ||
    (/<H3/i.test(trimmed) && /<A\s+HREF=/i.test(trimmed))
  ) {
    return 'html';
  }

  // JSON signature
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON, continue detection
    }
  }

  // CSV signature: checks first few lines for comma separation and URL presence
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length > 0 && lines[0]) {
    const firstLine = lines[0].toLowerCase();
    if (
      (firstLine.includes('url') || firstLine.includes('link') || firstLine.includes('href')) &&
      firstLine.includes(',')
    ) {
      return 'csv';
    }
    const sample = lines.slice(0, 5);
    const commaCount = sample.filter((l) => l.includes(',')).length;
    const urlCount = sample.filter((l) => /https?:\/\//i.test(l)).length;
    if (commaCount >= 2 && urlCount >= 2) {
      return 'csv';
    }
  }

  return 'text';
}

/**
 * Parses Netscape bookmark HTML files (Chrome, Firefox, Safari, Edge, Arc exports),
 * accurately preserving nested folder hierarchies (<DL><DT><H3>...).
 */
export function parseHtmlBookmarks(html: string): RawParsedEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const results: RawParsedEntry[] = [];

  function traverse(element: Element, currentFolderPath: string[]) {
    const children = Array.from(element.children);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) continue;

      const tag = child.tagName.toUpperCase();

      if (tag === 'DT') {
        const firstEl = child.firstElementChild;
        if (!firstEl) continue;

        const firstTag = firstEl.tagName.toUpperCase();

        if (firstTag === 'H3') {
          const folderName = (firstEl.textContent || '').trim();
          const lower = folderName.toLowerCase();
          const isGeneric = GENERIC_ROOT_FOLDERS.has(lower);
          const nextPath = isGeneric || !folderName ? currentFolderPath : [...currentFolderPath, folderName];

          // Look for adjacent or nested <DL>
          const dlChild = child.querySelector(':scope > dl, :scope > DL');
          if (dlChild) {
            traverse(dlChild, nextPath);
          } else {
            // Check next siblings for DD or DL
            const nextSibling = child.nextElementSibling;
            if (nextSibling && nextSibling.tagName.toUpperCase() === 'DD') {
              const dlInsideDd = nextSibling.querySelector(':scope > dl, :scope > DL');
              if (dlInsideDd) traverse(dlInsideDd, nextPath);
            } else if (nextSibling && (nextSibling.tagName.toUpperCase() === 'DL' || nextSibling.tagName.toUpperCase() === 'P')) {
              traverse(nextSibling, nextPath);
            }
          }
        } else if (firstTag === 'A') {
          const href = firstEl.getAttribute('HREF') || firstEl.getAttribute('href') || '';
          const title = (firstEl.textContent || '').trim();
          results.push({
            title,
            url: href,
            folderPath: [...currentFolderPath],
          });
        }
      } else if (tag === 'A') {
        const href = child.getAttribute('HREF') || child.getAttribute('href') || '';
        const title = (child.textContent || '').trim();
        results.push({
          title,
          url: href,
          folderPath: [...currentFolderPath],
        });
      } else if (tag === 'DL' || tag === 'P') {
        traverse(child, currentFolderPath);
      }
    }
  }

  traverse(doc.body, []);
  return results;
}

// ---------------------------------------------------------------------------
// Resilient & Format-Agnostic JSON Bookmark Parser
// ---------------------------------------------------------------------------

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_\s]/g, '');
}

const URL_FIELD_KEYS = [
  'url',
  'link',
  'href',
  'uri',
  'address',
  'target',
  'website',
  'site',
  'pageurl',
  'page',
  'bookmarkurl',
  'bookmark',
  'web',
  'location',
  'source',
];

const TITLE_FIELD_KEYS = [
  'title',
  'name',
  'label',
  'text',
  'caption',
  'heading',
  'displayname',
  'bookmarkname',
  'header',
  'cardtitle',
  'itemtitle',
  'description',
];

const GROUP_FIELD_KEYS = [
  'groupname',
  'group',
  'groups',
  'foldername',
  'folder',
  'folders',
  'categoryname',
  'category',
  'categories',
  'collectionname',
  'collection',
  'collections',
  'sectionname',
  'section',
  'sections',
  'directoryname',
  'directory',
  'directories',
  'folderpath',
  'path',
  'listname',
  'list',
  'lists',
  'parentfolder',
  'parent',
];

const CHILDREN_FIELD_KEYS = [
  'items',
  'item',
  'children',
  'child',
  'links',
  'link',
  'bookmarks',
  'bookmark',
  'cards',
  'card',
  'tabs',
  'tab',
  'urls',
  'url',
  'entries',
  'entry',
  'nodes',
  'node',
  'shortcuts',
  'elements',
  'sites',
  'pages',
];

const CONTAINER_KEYS_TO_IGNORE = new Set([
  'sections',
  'groups',
  'folders',
  'categories',
  'collections',
  'lists',
  'items',
  'children',
  'links',
  'bookmarks',
  'cards',
  'tabs',
  'urls',
  'entries',
  'shortcuts',
  'elements',
  'data',
  'result',
  'results',
  'content',
  'contents',
  'root',
  'roots',
  'nodes',
  'sites',
  'pages',
  'spaces',
  'space',
  'workspaces',
  'workspace',
  'tags',
  'tag',
  'labels',
  'label',
  'metadata',
  'meta',
  'details',
  'properties',
  'props',
  'attributes',
]);

const METADATA_KEYS_TO_SKIP = new Set([
  'id',
  '_id',
  'uuid',
  'version',
  'date',
  'created',
  'createdat',
  'updated',
  'updatedat',
  'timestamp',
  'time',
  'datetime',
  'modified',
  'published',
  'added',
  'deleted',
  'icon',
  'favicon',
  'color',
  'order',
  'position',
  'settings',
  'theme',
  'author',
  'owner',
  'creator',
  'user',
  'username',
  'userid',
  'profile',
  'checksum',
  'sync',
  'synced',
  'dockids',
  'wallpaper',
  'tags',
  'tag',
  'labels',
  'label',
  'keywords',
  'keyword',
  'spaces',
  'space',
  'workspaces',
  'workspace',
  'description',
  'descriptions',
  'details',
  'summary',
  'notes',
  'note',
  'comment',
  'comments',
  'metadata',
  'meta',
  'props',
  'properties',
  'attributes',
  'config',
  'options',
  'params',
  'parameters',
  'stats',
  'analytics',
  'count',
  'total',
  'index',
  'seq',
  'rank',
  'score',
  'image',
  'thumbnail',
  'cover',
  'preview',
  'badge',
  'avatar',
  'hash',
  'token',
  'auth',
  'etag',
  'signature',
  'type',
  'status',
  'state',
  'code',
  'message',
  'error',
  'success',
]);

function extractUrlFromObject(obj: Record<string, unknown>): string | null {
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      const norm = normalizeKey(key);
      if (URL_FIELD_KEYS.includes(norm)) {
        const trimmed = val.trim();
        if (
          trimmed &&
          (trimmed.startsWith('http://') ||
            trimmed.startsWith('https://') ||
            trimmed.startsWith('www.') ||
            trimmed.includes('.'))
        ) {
          return trimmed;
        }
      }
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      const norm = normalizeKey(key);
      if (URL_FIELD_KEYS.includes(norm)) {
        const inner = extractUrlFromObject(val as Record<string, unknown>);
        if (inner) return inner;
      }
    }
  }
  return null;
}

function extractUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) {
      return trimmed;
    }
    return null;
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return extractUrlFromObject(value as Record<string, unknown>);
  }
  return null;
}

function extractTitleFromObject(obj: Record<string, unknown>): string | null {
  // First pass: look for explicit high-priority title fields
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      const norm = normalizeKey(key);
      if (TITLE_FIELD_KEYS.includes(norm) && norm !== 'description') {
        const trimmed = val.trim();
        if (trimmed) return trimmed;
      }
    }
  }
  // Fallback pass: allow short description as title
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      const norm = normalizeKey(key);
      if (norm === 'description') {
        const trimmed = val.trim();
        if (trimmed && trimmed.length <= 100 && !trimmed.includes('\n')) return trimmed;
      }
    }
  }
  return null;
}

function extractTitle(value: unknown): string | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return extractTitleFromObject(value as Record<string, unknown>);
  }
  return null;
}

function parseFolderPathString(raw: string): string[] {
  return raw
    .replace(/->/g, '/')
    .split(/[\/>\\|]/)
    .map((s) => s.trim())
    .filter((seg) => {
      if (!seg || seg.length > 60 || seg.includes('\n')) return false;
      const lower = seg.toLowerCase().replace(/[-_\s]/g, '');
      return !GENERIC_ROOT_FOLDERS.has(lower) && !CONTAINER_KEYS_TO_IGNORE.has(lower) && !METADATA_KEYS_TO_SKIP.has(lower);
    });
}

function extractFolderPathFromObject(obj: Record<string, unknown>): string[] {
  for (const [key, val] of Object.entries(obj)) {
    const norm = normalizeKey(key);
    if (GROUP_FIELD_KEYS.includes(norm)) {
      if (typeof val === 'string') {
        const parsed = parseFolderPathString(val);
        if (parsed.length > 0) return parsed;
      } else if (Array.isArray(val)) {
        const segments = val
          .map((item) => {
            if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
            if (typeof item === 'object' && item !== null) {
              return extractGroupTitle(item as Record<string, unknown>) || '';
            }
            return '';
          })
          .filter((s) => s && s.length <= 60 && !GENERIC_ROOT_FOLDERS.has(s.toLowerCase()));
        if (segments.length > 0) return segments;
      } else if (typeof val === 'object' && val !== null) {
        const groupTitle = extractGroupTitle(val as Record<string, unknown>);
        if (groupTitle) {
          const parsed = parseFolderPathString(groupTitle);
          if (parsed.length > 0) return parsed;
        }
      }
    }
  }
  return [];
}

function extractChildrenArray(obj: Record<string, unknown>): unknown[] | null {
  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val)) {
      const norm = normalizeKey(key);
      if (CHILDREN_FIELD_KEYS.includes(norm)) {
        return val;
      }
    }
  }
  return null;
}

function extractGroupTitle(obj: Record<string, unknown>): string | null {
  const title = extractTitle(obj);
  if (title) return title;
  const folderPath = extractFolderPathFromObject(obj);
  if (folderPath.length > 0) return folderPath.join(' / ');
  return null;
}

function isGroupLikeObject(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const rec = obj as Record<string, unknown>;
  const title = extractGroupTitle(rec);
  const children = extractChildrenArray(rec);
  return Boolean(title && Array.isArray(children));
}

export interface JsonPresetResult {
  entries: RawParsedEntry[];
  tabinBackup?: ParsedImportResult['rawTabinBackup'];
}

export interface BookmarkJsonPreset {
  id: string;
  name: string;
  matches: (data: unknown) => boolean;
  parse: (data: unknown) => JsonPresetResult | null;
}

/**
 * Preset 1: Tabin Backup Format
 */
const tabinBackupPreset: BookmarkJsonPreset = {
  id: 'tabin-backup',
  name: 'Tabin Backup',
  matches: (data) => {
    if (!data || typeof data !== 'object') return false;
    const rec = data as Record<string, unknown>;
    if (!Array.isArray(rec.items)) return false;
    const hasTabinItems = rec.items.some((item) => {
      if (!item || typeof item !== 'object') return false;
      const i = item as Record<string, unknown>;
      return i.type === 'shortcut' || i.type === 'folder';
    });
    if (hasTabinItems) return true;
    return rec.items.length === 0 && 'version' in rec && ('dockIds' in rec || 'wallpaper' in rec);
  },
  parse: (data) => {
    const rec = data as {
      version?: number;
      items: LaunchpadItem[];
      dockIds?: string[];
      settings?: unknown;
      wallpaper?: unknown;
    };
    const entries: RawParsedEntry[] = [];
    const foldersMap = new Map<string, FolderItem>();

    for (const item of rec.items) {
      if (item.type === 'folder') {
        foldersMap.set(item.id, item as FolderItem);
      }
    }

    const getFolderPath = (folderId: string | null): string[] => {
      const path: string[] = [];
      let cur = folderId;
      const seen = new Set<string>();
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        const folder = foldersMap.get(cur);
        if (!folder) break;
        path.unshift(folder.title);
        cur = folder.folderId;
      }
      return path;
    };

    for (const item of rec.items) {
      if (item.type === 'shortcut' && item.url) {
        entries.push({
          title: item.title || '',
          url: item.url,
          folderPath: getFolderPath(item.folderId),
        });
      }
    }

    return {
      entries,
      tabinBackup: {
        version: rec.version,
        items: rec.items,
        dockIds: rec.dockIds,
        settings: rec.settings,
        wallpaper: rec.wallpaper,
      },
    };
  },
};

/**
 * Preset 2: Grouped Collections (Minimal.so, Toby, Startpages, Dashboards)
 */
const groupedCollectionsPreset: BookmarkJsonPreset = {
  id: 'grouped-collections',
  name: 'Grouped Collections',
  matches: (data) => {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data)) {
      return data.length > 0 && data.some(isGroupLikeObject);
    }
    const rec = data as Record<string, unknown>;
    for (const [key, val] of Object.entries(rec)) {
      const norm = normalizeKey(key);
      if (
        (GROUP_FIELD_KEYS.includes(norm) || CHILDREN_FIELD_KEYS.includes(norm)) &&
        Array.isArray(val) &&
        val.length > 0 &&
        val.some(isGroupLikeObject)
      ) {
        return true;
      }
    }
    return false;
  },
  parse: (data) => {
    const entries: RawParsedEntry[] = [];

    const processGroup = (groupObj: Record<string, unknown>, parentPath: string[]) => {
      const rawTitle = extractGroupTitle(groupObj) || '';
      const groupPathSegments = rawTitle ? parseFolderPathString(rawTitle) : [];
      const currentPath = [...parentPath, ...groupPathSegments];

      const children = extractChildrenArray(groupObj);
      if (!Array.isArray(children)) return;

      for (const child of children) {
        if (!child || typeof child !== 'object') {
          if (typeof child === 'string') {
            const url = extractUrl(child);
            if (url) {
              entries.push({
                title: '',
                url,
                folderPath: currentPath,
              });
            }
          }
          continue;
        }

        if (isGroupLikeObject(child)) {
          processGroup(child as Record<string, unknown>, currentPath);
          continue;
        }

        const childRec = child as Record<string, unknown>;
        const url = extractUrl(childRec);
        if (url) {
          const itemTitle = extractTitle(childRec) || '';
          const itemFolder = extractFolderPathFromObject(childRec);
          const finalFolder = itemFolder.length > 0 ? itemFolder : currentPath;

          entries.push({
            title: itemTitle,
            url,
            folderPath: finalFolder,
          });
        }
      }
    };

    if (Array.isArray(data)) {
      for (const item of data) {
        if (isGroupLikeObject(item)) {
          processGroup(item as Record<string, unknown>, []);
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      const rec = data as Record<string, unknown>;
      for (const [key, val] of Object.entries(rec)) {
        const norm = normalizeKey(key);
        if (
          (GROUP_FIELD_KEYS.includes(norm) || CHILDREN_FIELD_KEYS.includes(norm)) &&
          Array.isArray(val)
        ) {
          for (const item of val) {
            if (isGroupLikeObject(item)) {
              processGroup(item as Record<string, unknown>, []);
            }
          }
        }
      }
    }

    return entries.length > 0 ? { entries } : null;
  },
};

/**
 * Preset 3: Chrome Bookmarks JSON Tree Format
 */
const chromeBookmarksJsonPreset: BookmarkJsonPreset = {
  id: 'chrome-bookmarks-tree',
  name: 'Chrome Bookmarks JSON',
  matches: (data) => {
    if (!data || typeof data !== 'object') return false;
    const rec = data as Record<string, unknown>;
    if (rec.roots && typeof rec.roots === 'object') return true;
    if (rec.type === 'folder' && Array.isArray(rec.children)) return true;
    return false;
  },
  parse: (data) => {
    const entries: RawParsedEntry[] = [];

    const traverseNode = (node: unknown, currentPath: string[]) => {
      if (!node || typeof node !== 'object') return;
      const rec = node as Record<string, unknown>;
      const isFolder = rec.type === 'folder' || (!rec.url && Array.isArray(rec.children));

      if (isFolder) {
        const folderName = (extractTitle(rec) || '').trim();
        const lower = folderName.toLowerCase();
        const isGeneric = GENERIC_ROOT_FOLDERS.has(lower) || !folderName;
        const nextPath = isGeneric ? currentPath : [...currentPath, folderName];

        if (Array.isArray(rec.children)) {
          for (const child of rec.children) {
            traverseNode(child, nextPath);
          }
        }
      } else {
        const url = extractUrl(rec);
        if (url) {
          const title = extractTitle(rec) || '';
          entries.push({
            title,
            url,
            folderPath: currentPath,
          });
        }
      }
    };

    const rec = data as Record<string, unknown>;
    if (rec.roots && typeof rec.roots === 'object') {
      const roots = rec.roots as Record<string, unknown>;
      for (const rootNode of Object.values(roots)) {
        traverseNode(rootNode, []);
      }
    } else {
      traverseNode(rec, []);
    }

    return entries.length > 0 ? { entries } : null;
  },
};

/**
 * Preset 4: Key-Value Dictionary Format ({ "Work": [...], "Design": [...] })
 */
const keyValueDictionaryPreset: BookmarkJsonPreset = {
  id: 'key-value-dictionary',
  name: 'Key-Value Dictionary',
  matches: (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const rec = data as Record<string, unknown>;
    const keys = Object.keys(rec);
    if (keys.length === 0) return false;

    let validGroupCount = 0;
    for (const key of keys) {
      const norm = normalizeKey(key);
      if (METADATA_KEYS_TO_SKIP.has(norm) || CONTAINER_KEYS_TO_IGNORE.has(norm)) continue;
      const val = rec[key];
      if (
        Array.isArray(val) &&
        val.length > 0 &&
        val.some((v) => extractUrl(v) !== null)
      ) {
        validGroupCount++;
      }
    }
    return validGroupCount > 0;
  },
  parse: (data) => {
    const entries: RawParsedEntry[] = [];
    const rec = data as Record<string, unknown>;

    for (const [key, val] of Object.entries(rec)) {
      const norm = normalizeKey(key);
      if (METADATA_KEYS_TO_SKIP.has(norm) || CONTAINER_KEYS_TO_IGNORE.has(norm)) continue;
      if (!Array.isArray(val)) continue;

      const folderPath = parseFolderPathString(key);

      for (const item of val) {
        const url = extractUrl(item);
        if (url) {
          let title = '';
          let itemFolderPath = folderPath;

          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            const itemRec = item as Record<string, unknown>;
            title = extractTitle(itemRec) || '';
            const explicitFolder = extractFolderPathFromObject(itemRec);
            if (explicitFolder.length > 0) {
              itemFolderPath = explicitFolder;
            }
          }

          entries.push({
            title,
            url,
            folderPath: itemFolderPath,
          });
        }
      }
    }

    return entries.length > 0 ? { entries } : null;
  },
};

/**
 * Preset 5: Flat Array of Bookmark Objects
 */
const flatBookmarkArrayPreset: BookmarkJsonPreset = {
  id: 'flat-bookmark-array',
  name: 'Flat Bookmark Array',
  matches: (data) => {
    if (Array.isArray(data)) {
      return data.some((item) => extractUrl(item) !== null);
    }
    if (data && typeof data === 'object') {
      const rec = data as Record<string, unknown>;
      const list = extractChildrenArray(rec);
      return Array.isArray(list) && list.some((item) => extractUrl(item) !== null);
    }
    return false;
  },
  parse: (data) => {
    const entries: RawParsedEntry[] = [];
    const list: unknown[] = Array.isArray(data)
      ? data
      : extractChildrenArray(data as Record<string, unknown>) || [];

    for (const item of list) {
      const url = extractUrl(item);
      if (url) {
        let title = '';
        let folderPath: string[] = [];

        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const rec = item as Record<string, unknown>;
          title = extractTitle(rec) || '';
          folderPath = extractFolderPathFromObject(rec);
        }

        entries.push({
          title,
          url,
          folderPath,
        });
      }
    }

    return entries.length > 0 ? { entries } : null;
  },
};

export const JSON_BOOKMARK_PRESETS: BookmarkJsonPreset[] = [
  tabinBackupPreset,
  groupedCollectionsPreset,
  chromeBookmarksJsonPreset,
  keyValueDictionaryPreset,
  flatBookmarkArrayPreset,
];

/**
 * Generic recursive crawler for unfamiliar or deeply nested JSON structures.
 */
function crawlUnknownJson(data: unknown): RawParsedEntry[] {
  const entries: RawParsedEntry[] = [];
  const seenObjects = new WeakSet<object>();

  const crawl = (current: unknown, currentPath: string[], depth: number) => {
    if (depth > 15 || current === null || current === undefined) return;

    if (typeof current === 'string') {
      const url = extractUrl(current);
      if (url) {
        entries.push({
          title: '',
          url,
          folderPath: currentPath,
        });
      }
      return;
    }

    if (Array.isArray(current)) {
      for (const element of current) {
        crawl(element, currentPath, depth + 1);
      }
      return;
    }

    if (typeof current === 'object') {
      const obj = current as Record<string, unknown>;
      if (seenObjects.has(obj)) return;
      seenObjects.add(obj);

      // Check if this object itself represents a bookmark
      const directUrl = extractUrl(obj);
      if (directUrl) {
        const title = extractTitle(obj) || '';
        const itemFolder = extractFolderPathFromObject(obj);
        const folderPath = itemFolder.length > 0 ? itemFolder : currentPath;

        entries.push({
          title,
          url: directUrl,
          folderPath,
        });
        return;
      }

      // Check if this object represents a folder or section
      const explicitFolder = extractFolderPathFromObject(obj);
      let nextPath = currentPath;

      if (explicitFolder.length > 0) {
        nextPath = [...currentPath, ...explicitFolder];
      } else if (isGroupLikeObject(obj)) {
        const groupTitle = extractGroupTitle(obj);
        if (groupTitle) {
          const parsed = parseFolderPathString(groupTitle);
          if (parsed.length > 0) {
            nextPath = [...currentPath, ...parsed];
          }
        }
      }

      // Traverse children/items first if present
      const explicitChildren = extractChildrenArray(obj);
      if (explicitChildren) {
        crawl(explicitChildren, nextPath, depth + 1);
        return;
      }

      // Otherwise traverse properties
      for (const [key, val] of Object.entries(obj)) {
        const norm = normalizeKey(key);
        if (METADATA_KEYS_TO_SKIP.has(norm)) continue;

        let propertyPath = nextPath;
        if (
          !isGroupLikeObject(obj) &&
          explicitFolder.length === 0 &&
          (Array.isArray(val) || (typeof val === 'object' && val !== null))
        ) {
          const parsedKey = parseFolderPathString(key);
          if (parsedKey.length > 0) {
            propertyPath = [...nextPath, ...parsedKey];
          }
        }

        crawl(val, propertyPath, depth + 1);
      }
    }
  };

  crawl(data, [], 0);
  return entries;
}

/**
 * Parses JSON bookmarks (format-agnostic, resilient, with presets & recursive fallback).
 */
export function parseJsonBookmarks(jsonStr: string): {
  entries: RawParsedEntry[];
  tabinBackup?: ParsedImportResult['rawTabinBackup'];
} {
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return { entries: [] };
  }

  if (!data || (typeof data !== 'object' && !Array.isArray(data))) {
    return { entries: [] };
  }

  // 1. Try registered presets
  for (const preset of JSON_BOOKMARK_PRESETS) {
    try {
      if (preset.matches(data)) {
        const result = preset.parse(data);
        if (result && (result.entries.length > 0 || result.tabinBackup)) {
          return result;
        }
      }
    } catch {
      // Safe fallback to next preset
    }
  }

  // 2. Generic fallback crawler for unfamiliar JSON structures
  try {
    const crawled = crawlUnknownJson(data);
    // Deduplicate entries with exact same (url, folderPath)
    const seen = new Set<string>();
    const deduplicated: RawParsedEntry[] = [];

    for (const entry of crawled) {
      const key = `${entry.url}:::${entry.folderPath.join('/')}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(entry);
      }
    }

    return { entries: deduplicated };
  } catch {
    return { entries: [] };
  }
}

/**
 * Parses CSV lines, auto-detecting column indices and preserving folder hierarchies.
 */
export function parseCsvBookmarks(csvStr: string): RawParsedEntry[] {
  const results: RawParsedEntry[] = [];

  function splitCsvRow(row: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  const lines = csvStr.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0 || !lines[0]) return results;

  let urlCol = -1;
  let titleCol = -1;
  let folderCol = -1;

  const headerCells = splitCsvRow(lines[0]).map((c) => c.toLowerCase());
  headerCells.forEach((c, idx) => {
    if (c === 'url' || c === 'link' || c === 'href') urlCol = idx;
    if (c === 'title' || c === 'name') titleCol = idx;
    if (c === 'folder' || c === 'category' || c === 'group' || c === 'tags') folderCol = idx;
  });

  const hasHeader = urlCol !== -1 || titleCol !== -1;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const cells = splitCsvRow(line);
    let url = '';
    let title = '';
    let folderStr: string | null = null;

    if (hasHeader) {
      if (urlCol !== -1) url = cells[urlCol] || '';
      if (titleCol !== -1) title = cells[titleCol] || '';
      if (folderCol !== -1) folderStr = cells[folderCol] || null;
    } else {
      const c0 = cells[0] || '';
      const c1 = cells[1] || '';
      const c2 = cells[2] || '';
      if (/https?:\/\//i.test(c0)) {
        url = c0;
        title = c1;
        folderStr = c2 || null;
      } else if (c1 && /https?:\/\//i.test(c1)) {
        title = c0;
        url = c1;
        folderStr = c2 || null;
      } else {
        url = c0;
      }
    }

    if (url) {
      const folderPath = folderStr
        ? folderStr
            .split(/[\/>]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      results.push({
        title,
        url,
        folderPath,
      });
    }
  }

  return results;
}

/**
 * Parses plain-text URL lists, including section headers (e.g. `[Work/Design]`).
 */
export function parseTextBookmarks(textStr: string): RawParsedEntry[] {
  const results: RawParsedEntry[] = [];
  const lines = textStr.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let currentFolderPath: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Section header: [Work] or [Work / Design] or # Work
    const headerMatch = trimmed.match(/^\[([^\]]+)\]$|^#+\s+(.+)$/);
    if (headerMatch) {
      const headerContent = (headerMatch[1] || headerMatch[2] || '').trim();
      currentFolderPath = headerContent
        .split(/[\/>]/)
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }

    // Match URL inside line
    const match = trimmed.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
    if (match && match[1]) {
      const url = match[1];
      const matchIndex = match.index ?? 0;
      const prefix = trimmed.slice(0, matchIndex).trim();
      const cleanedTitle = prefix.replace(/[-|:]+$/, '').trim();

      results.push({
        title: cleanedTitle || '',
        url,
        folderPath: [...currentFolderPath],
      });
    }
  }

  return results;
}

/**
 * Walks chrome.bookmarks.BookmarkTreeNode tree and flattens into bookmarks and folders,
 * preserving exact nested folder paths.
 */
export function parseChromeBookmarksTree(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
): RawParsedEntry[] {
  const results: RawParsedEntry[] = [];

  function traverse(node: chrome.bookmarks.BookmarkTreeNode, currentFolderPath: string[]) {
    const isFolder = !node.url && Boolean(node.children);

    if (isFolder) {
      const folderTitle = (node.title || '').trim();
      const lower = folderTitle.toLowerCase();
      const isGeneric = GENERIC_ROOT_FOLDERS.has(lower) || folderTitle === '';
      const nextPath = isGeneric ? currentFolderPath : [...currentFolderPath, folderTitle];

      if (node.children) {
        for (const child of node.children) {
          traverse(child, nextPath);
        }
      }
    } else if (node.url) {
      results.push({
        title: (node.title || '').trim(),
        url: node.url,
        folderPath: [...currentFolderPath],
      });
    }
  }

  for (const root of nodes) {
    traverse(root, []);
  }

  return results;
}

/**
 * Unified pipeline that parses any bookmark source, deduplicates, validates, and prepares preview statistics.
 */
export function processImportSource(
  content: string | chrome.bookmarks.BookmarkTreeNode[],
  existingItems: LaunchpadItem[],
  filename?: string,
  forcedFormat?: 'html' | 'json' | 'csv' | 'text' | 'chrome',
): ParsedImportResult {
  let rawEntries: RawParsedEntry[] = [];
  let format: 'html' | 'json' | 'csv' | 'text' | 'chrome' = 'text';
  let rawTabinBackup: ParsedImportResult['rawTabinBackup'] = undefined;

  if (Array.isArray(content) && typeof content[0] === 'object' && 'id' in content[0] && ('children' in content[0] || 'url' in content[0])) {
    format = 'chrome';
    rawEntries = parseChromeBookmarksTree(content as chrome.bookmarks.BookmarkTreeNode[]);
  } else if (typeof content === 'string') {
    format = forcedFormat || detectBookmarkFormat(content, filename);
    switch (format) {
      case 'html':
        rawEntries = parseHtmlBookmarks(content);
        break;
      case 'json': {
        const res = parseJsonBookmarks(content);
        rawEntries = res.entries;
        rawTabinBackup = res.tabinBackup;
        break;
      }
      case 'csv':
        rawEntries = parseCsvBookmarks(content);
        break;
      case 'text':
      default:
        rawEntries = parseTextBookmarks(content);
        break;
    }
  }

  // Build lookup of existing URLs (normalized)
  const existingUrlSet = new Set<string>();
  for (const item of existingItems) {
    if (item.type === 'shortcut' && item.url) {
      const norm = normalizeUrl(item.url);
      if (norm) existingUrlSet.add(norm.toLowerCase());
    }
  }

  const items: ParsedItem[] = [];
  const folderNamesSet = new Set<string>();
  const folderPathsMap = new Map<string, string[]>();
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const entry of rawEntries) {
    const validUrl = normalizeUrl(entry.url);
    if (!validUrl) {
      invalidCount++;
      continue;
    }

    const title = entry.title.trim() || inferTitleFromUrl(validUrl);
    const isDuplicate = existingUrlSet.has(validUrl.toLowerCase());
    if (isDuplicate) duplicateCount++;

    const folderPath = entry.folderPath || [];
    const leafFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] ?? null : null;

    if (folderPath.length > 0) {
      const pathKey = folderPath.join(' / ');
      folderPathsMap.set(pathKey, folderPath);
      for (const seg of folderPath) {
        folderNamesSet.add(seg);
      }
    }

    items.push({
      title,
      url: validUrl,
      folderPath,
      folderName: leafFolder,
      isDuplicate,
    });
  }

  return {
    format,
    items,
    totalCount: items.length,
    duplicateCount,
    invalidCount,
    folderNames: Array.from(folderNamesSet),
    folderPaths: Array.from(folderPathsMap.values()),
    rawTabinBackup,
  };
}
