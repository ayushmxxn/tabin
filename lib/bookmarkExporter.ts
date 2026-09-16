import type { LaunchpadItem, FolderItem, ShortcutItem } from '@/types';

export interface ExportData {
  items: LaunchpadItem[];
  dockIds: string[];
  settings?: unknown;
  wallpaper?: unknown;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

/**
 * Generates standard Netscape Bookmark File (HTML) format compatible with
 * Chrome, Firefox, Safari, Edge, Arc, and other bookmark managers.
 * Faithfully exports full nested folder trees.
 */
export function exportToHtml(items: LaunchpadItem[]): string {
  const now = Math.floor(Date.now() / 1000);
  const shortcutsMap = new Map(
    items.filter((item): item is ShortcutItem => item.type === 'shortcut').map((s) => [s.id, s]),
  );
  const foldersMap = new Map(
    items.filter((item): item is FolderItem => item.type === 'folder').map((f) => [f.id, f]),
  );

  function renderFolder(folder: FolderItem, indent: string, visited = new Set<string>()): string {
    if (visited.has(folder.id)) return '';
    visited.add(folder.id);
    let out = `${indent}<DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHtml(folder.title)}</H3>\n`;
    out += `${indent}<DL><p>\n`;
    for (const childId of folder.itemIds) {
      const childShortcut = shortcutsMap.get(childId);
      if (childShortcut && childShortcut.url) {
        out += `${indent}    <DT><A HREF="${escapeHtml(childShortcut.url)}" ADD_DATE="${now}">${escapeHtml(childShortcut.title)}</A>\n`;
      } else {
        const childFolder = foldersMap.get(childId);
        if (childFolder && !visited.has(childFolder.id)) {
          out += renderFolder(childFolder, `${indent}    `, visited);
        }
      }
    }
    out += `${indent}</DL><p>\n`;
    return out;
  }

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  // Render top-level folders (folderId === null)
  const rootFolders = items.filter(
    (item): item is FolderItem => item.type === 'folder' && item.folderId === null,
  );
  for (const folder of rootFolders) {
    html += renderFolder(folder, '    ');
  }

  // Render top-level shortcuts (folderId === null)
  const rootShortcuts = items.filter(
    (item): item is ShortcutItem => item.type === 'shortcut' && item.folderId === null,
  );
  for (const shortcut of rootShortcuts) {
    if (shortcut.url) {
      html += `    <DT><A HREF="${escapeHtml(shortcut.url)}" ADD_DATE="${now}">${escapeHtml(shortcut.title)}</A>\n`;
    }
  }

  html += `</DL><p>\n`;
  return html;
}

/**
 * Generates full Tabin backup in JSON format.
 */
export function exportToJson(data: ExportData): string {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: data.items,
    dockIds: data.dockIds,
    settings: data.settings,
    wallpaper: data.wallpaper,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Generates RFC 4180 compliant CSV (Title, URL, Folder),
 * preserving nested folder paths as "Work/Design".
 */
export function exportToCsv(items: LaunchpadItem[]): string {
  const foldersMap = new Map(
    items.filter((i): i is FolderItem => i.type === 'folder').map((f) => [f.id, f]),
  );
  const shortcuts = items.filter((i): i is ShortcutItem => i.type === 'shortcut');

  function getFolderHierarchy(folderId: string | null): string {
    if (!folderId) return '';
    const path: string[] = [];
    let cur: string | null = folderId;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const folder = foldersMap.get(cur);
      if (!folder) break;
      path.unshift(folder.title);
      cur = folder.folderId;
    }
    return path.join('/');
  }

  const lines = ['Title,URL,Folder'];
  for (const s of shortcuts) {
    const folderPath = getFolderHierarchy(s.folderId);
    lines.push(`${escapeCsvCell(s.title)},${escapeCsvCell(s.url)},${escapeCsvCell(folderPath)}`);
  }

  return lines.join('\r\n');
}

/**
 * Generates clean plain-text list of URLs, organized by folders and nested folders.
 */
export function exportToText(items: LaunchpadItem[]): string {
  const foldersMap = new Map(
    items.filter((item): item is FolderItem => item.type === 'folder').map((f) => [f.id, f]),
  );
  const shortcutsMap = new Map(
    items.filter((item): item is ShortcutItem => item.type === 'shortcut').map((s) => [s.id, s]),
  );

  const lines: string[] = [];

  // Top-level bookmarks
  const topLevelShortcuts = items.filter(
    (item): item is ShortcutItem => item.type === 'shortcut' && item.folderId === null,
  );
  for (const s of topLevelShortcuts) {
    if (s.url) {
      lines.push(`${s.title}: ${s.url}`);
    }
  }

  function getPath(folder: FolderItem): string {
    const parts: string[] = [folder.title];
    let cur: string | null = folder.folderId;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const parent = foldersMap.get(cur);
      if (!parent) break;
      parts.unshift(parent.title);
      cur = parent.folderId;
    }
    return parts.join(' / ');
  }

  // Folders
  const allFolders = items.filter((item): item is FolderItem => item.type === 'folder');
  for (const folder of allFolders) {
    const directShortcuts = folder.itemIds
      .map((id) => shortcutsMap.get(id))
      .filter((s): s is ShortcutItem => Boolean(s && s.url));

    if (directShortcuts.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push(`[${getPath(folder)}]`);
      for (const child of directShortcuts) {
        lines.push(`  ${child.title}: ${child.url}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Triggers a client-side file download.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
