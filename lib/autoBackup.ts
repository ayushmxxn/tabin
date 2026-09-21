import { useLaunchpadStore } from "@/store/useLaunchpadStore";
import { getSavedGroups } from "@/lib/savedTabsStorage";
import type {
  LaunchpadItem,
  LaunchpadSettings,
  Space,
  WallpaperConfig,
} from "@/types";
import type { SavedTabGroup } from "@/types/savedTabs";
import type { NotchNote } from "@/components/notch/TopLeftNotch";

export interface NotchTodo {
  id: string;
  title: string;
  time?: string;
  duration?: string;
  completed: boolean;
}

export interface TabinCanonicalBackup {
  version: number;
  exportedAt: string;
  items: LaunchpadItem[];
  dockIds: string[];
  spaces: Space[];
  settings: LaunchpadSettings;
  wallpaper: WallpaperConfig;
  savedTabGroups: SavedTabGroup[];
  notes: NotchNote[];
  todos: NotchTodo[];
}

export interface AutoBackupInfo {
  enabled: boolean;
  fileName: string | null;
  lastBackupTime: number | null;
  lastError: string | null;
  lastHash?: string | null;
}

export interface AutoBackupStatus {
  isSupported: boolean;
  enabled: boolean;
  hasFile: boolean;
  isWritable: boolean;
  needsReconnect: boolean;
  fileName: string | null;
  lastBackupTime: number | null;
  lastError: string | null;
}

const BACKUP_INFO_KEY = "tabin-auto-backup-info";
const DB_NAME = "tabin_backup_db";
const STORE_NAME = "handles";
const HANDLE_KEY = "active_backup_file";
const DEBOUNCE_DELAY_MS = 3000;
const PAUSE_COOLDOWN_MS = 5000;

// Module-level operational state
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;
let isBackingUp = false;
let hasPendingFollowUp = false;
let isDirty = false;
let isPaused = false;
let lastBackedUpHash = "";

// Lifecycle tracking
let initRefCount = 0;
let unsubscribeStore: (() => void) | null = null;
let storageListener:
  | ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void)
  | null = null;
let initialTimer: ReturnType<typeof setTimeout> | null = null;

// Status subscribers for real-time UI updates
const statusSubscribers = new Set<(status: AutoBackupStatus) => void>();

export function subscribeAutoBackupStatus(
  callback: (status: AutoBackupStatus) => void,
): () => void {
  statusSubscribers.add(callback);
  getAutoBackupStatus()
    .then((s) => callback(s))
    .catch(() => {});
  return () => {
    statusSubscribers.delete(callback);
  };
}

export function notifyStatusChange(): void {
  getAutoBackupStatus()
    .then((status) => {
      statusSubscribers.forEach((cb) => {
        try {
          cb(status);
        } catch {}
      });
    })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Helpers: Non-blocking yield & lightweight hash
// ---------------------------------------------------------------------------

function yieldToMainThread(): Promise<void> {
  if (typeof requestIdleCallback === "function") {
    return new Promise((resolve) => {
      requestIdleCallback(() => resolve(), { timeout: 80 });
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function computeComparableHash(data: {
  items: unknown;
  dockIds: unknown;
  spaces: unknown;
  settings: unknown;
  wallpaper: unknown;
  savedTabGroups: unknown;
  notes: unknown;
  todos: unknown;
}): string {
  const str = JSON.stringify(data);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16) + `_${str.length}`;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

// ---------------------------------------------------------------------------
// IndexedDB handle persistence & in-memory handle cache
// ---------------------------------------------------------------------------

let cachedFileHandle: FileSystemFileHandle | null = null;

function openBackupDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredFileHandle(): Promise<FileSystemFileHandle | null> {
  if (cachedFileHandle) {
    return cachedFileHandle;
  }
  try {
    const db = await openBackupDb();
    const handle = await new Promise<FileSystemFileHandle | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) || null);
      req.onerror = () => resolve(null);
    });
    if (handle) {
      cachedFileHandle = handle;
    }
    return handle;
  } catch {
    return null;
  }
}

export async function setStoredFileHandle(
  handle: FileSystemFileHandle,
): Promise<void> {
  cachedFileHandle = handle;
  const db = await openBackupDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(handle, HANDLE_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStoredFileHandle(): Promise<void> {
  cachedFileHandle = null;
  try {
    const db = await openBackupDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// Permission checks & requests
// ---------------------------------------------------------------------------

interface PermissionCapableHandle {
  queryPermission?: (descriptor?: {
    mode?: "read" | "readwrite";
  }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: {
    mode?: "read" | "readwrite";
  }) => Promise<PermissionState>;
}

export async function checkFilePermission(
  handle: FileSystemFileHandle,
): Promise<"granted" | "prompt" | "denied"> {
  try {
    const capable = handle as unknown as PermissionCapableHandle;
    if (typeof capable.queryPermission === "function") {
      return (await capable.queryPermission({
        mode: "readwrite",
      })) as "granted" | "prompt" | "denied";
    }
    return "granted";
  } catch {
    return "prompt";
  }
}

export async function requestFilePermission(
  handle: FileSystemFileHandle,
): Promise<boolean> {
  try {
    const capable = handle as unknown as PermissionCapableHandle;
    if (typeof capable.requestPermission === "function") {
      const status = await capable.requestPermission({ mode: "readwrite" });
      return status === "granted";
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Metadata storage
// ---------------------------------------------------------------------------

export async function getAutoBackupInfo(): Promise<AutoBackupInfo> {
  const defaultInfo: AutoBackupInfo = {
    enabled: true,
    fileName: null,
    lastBackupTime: null,
    lastError: null,
    lastHash: null,
  };

  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      const res = await chrome.storage.local.get(BACKUP_INFO_KEY);
      if (res && res[BACKUP_INFO_KEY]) {
        return { ...defaultInfo, ...res[BACKUP_INFO_KEY] };
      }
    } catch {}
  }

  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(BACKUP_INFO_KEY);
      if (raw) {
        return { ...defaultInfo, ...JSON.parse(raw) };
      }
    } catch {}
  }

  return defaultInfo;
}

export async function persistAutoBackupInfo(
  info: AutoBackupInfo,
): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ [BACKUP_INFO_KEY]: info });
    } catch {}
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(BACKUP_INFO_KEY, JSON.stringify(info));
    } catch {}
  }
}

export async function getAutoBackupStatus(): Promise<AutoBackupStatus> {
  const supported = isFileSystemAccessSupported();
  const info = await getAutoBackupInfo();
  const handle = await getStoredFileHandle();

  if (!supported || !handle) {
    return {
      isSupported: supported,
      enabled: info.enabled,
      hasFile: false,
      isWritable: false,
      needsReconnect: false,
      fileName: null,
      lastBackupTime: info.lastBackupTime,
      lastError: info.lastError,
    };
  }

  const permission = await checkFilePermission(handle);
  if (permission === "prompt") {
    return {
      isSupported: true,
      enabled: info.enabled,
      hasFile: true,
      isWritable: false,
      needsReconnect: true,
      fileName: handle.name || info.fileName,
      lastBackupTime: info.lastBackupTime,
      lastError: info.lastError,
    };
  }

  if (permission === "denied") {
    return {
      isSupported: true,
      enabled: info.enabled,
      hasFile: true,
      isWritable: false,
      needsReconnect: true,
      fileName: handle.name || info.fileName,
      lastBackupTime: info.lastBackupTime,
      lastError: "Write permission was denied.",
    };
  }

  // Permission is granted; verify the file was not deleted or moved externally
  try {
    await handle.getFile();
    return {
      isSupported: true,
      enabled: info.enabled,
      hasFile: true,
      isWritable: true,
      needsReconnect: false,
      fileName: handle.name || info.fileName,
      lastBackupTime: info.lastBackupTime,
      lastError: info.lastError,
    };
  } catch (err: unknown) {
    const isNotFound =
      err instanceof DOMException && err.name === "NotFoundError";
    return {
      isSupported: true,
      enabled: info.enabled,
      hasFile: false,
      isWritable: false,
      needsReconnect: false,
      fileName: handle.name || info.fileName,
      lastBackupTime: info.lastBackupTime,
      lastError: isNotFound
        ? "Backup file not found (it may have been moved or deleted)."
        : "Cannot access the backup file.",
    };
  }
}

// ---------------------------------------------------------------------------
// Canonical serialization
// ---------------------------------------------------------------------------

async function fetchNotchNotes(): Promise<NotchNote[]> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      const res = await chrome.storage.local.get("tabin-notch-notes");
      if (Array.isArray(res["tabin-notch-notes"])) {
        return res["tabin-notch-notes"];
      }
    } catch {}
  }
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem("tabin-notch-notes");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
}

async function fetchNotchTodos(): Promise<NotchTodo[]> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      const res = await chrome.storage.local.get("tabin-notch-todos");
      if (Array.isArray(res["tabin-notch-todos"])) {
        return res["tabin-notch-todos"];
      }
    } catch {}
  }
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem("tabin-notch-todos");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
}

export async function buildCanonicalBackupPayload(): Promise<TabinCanonicalBackup> {
  const storeState = useLaunchpadStore.getState();

  const [savedTabGroups, notes, todos] = await Promise.all([
    getSavedGroups().catch(() => []),
    fetchNotchNotes(),
    fetchNotchTodos(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: storeState.items,
    dockIds: storeState.dockIds,
    spaces: storeState.spaces,
    settings: storeState.settings,
    wallpaper: storeState.wallpaper,
    savedTabGroups,
    notes,
    todos,
  };
}

/**
 * Atomically writes valid JSON to the file handle using File System Access API.
 * Uses atomic swap semantics: if writing fails before close(), abort() discards
 * the temporary file, ensuring the existing file on disk is never corrupted.
 */
async function writePayloadToFile(
  handle: FileSystemFileHandle,
  payload: TabinCanonicalBackup,
): Promise<{ success: boolean; error?: string }> {
  let writable: FileSystemWritableFileStream | null = null;
  try {
    if (!payload || !Array.isArray(payload.items)) {
      return { success: false, error: "Invalid backup payload format." };
    }

    const jsonString = JSON.stringify(payload, null, 2);
    if (!jsonString || jsonString.length < 10) {
      return { success: false, error: "Empty JSON content." };
    }

    writable = await handle.createWritable({ keepExistingData: false });
    await writable.write(jsonString);
    await writable.close();
    writable = null;

    return { success: true };
  } catch (err: unknown) {
    if (writable) {
      try {
        await writable.abort();
      } catch {}
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Error classification & status recording
// ---------------------------------------------------------------------------

async function handleBackupWriteError(
  err: unknown,
  fileName: string | null,
): Promise<void> {
  let errorMsg = "Failed to write backup file.";

  if (err instanceof DOMException) {
    if (err.name === "NotFoundError") {
      errorMsg = "Backup file not found (it may have been moved or deleted).";
    } else if (err.name === "NotAllowedError") {
      errorMsg = "Write permission expired or was revoked.";
    } else if (err.name === "QuotaExceededError") {
      errorMsg = "Disk full or storage quota exceeded.";
    } else {
      errorMsg = err.message || errorMsg;
    }
  } else if (err instanceof Error) {
    errorMsg = err.message || errorMsg;
  }

  const info = await getAutoBackupInfo();
  await persistAutoBackupInfo({
    ...info,
    fileName: fileName || info.fileName,
    lastError: errorMsg,
  });

  notifyStatusChange();
}

// ---------------------------------------------------------------------------
// File picking & reconnecting
// ---------------------------------------------------------------------------

export async function pickAndConnectBackupFile(): Promise<{
  success: boolean;
  fileName?: string;
  error?: string;
}> {
  if (!isFileSystemAccessSupported()) {
    return {
      success: false,
      error: "File System Access API is not supported in this browser.",
    };
  }

  try {
    const picker = (
      window as unknown as {
        showSaveFilePicker: (options: {
          suggestedName?: string;
          types?: Array<{
            description?: string;
            accept: Record<string, string[]>;
          }>;
        }) => Promise<FileSystemFileHandle>;
      }
    ).showSaveFilePicker;

    const handle = await picker({
      suggestedName: "tabin-backup.json",
      types: [
        {
          description: "Tabin JSON Backup",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    });

    if (!handle) {
      return { success: false, error: "No file selected." };
    }

    await setStoredFileHandle(handle);

    // Initial write immediately
    const payload = await buildCanonicalBackupPayload();
    const writeResult = await writePayloadToFile(handle, payload);

    const now = Date.now();
    const currentInfo = await getAutoBackupInfo();

    if (writeResult.success) {
      const hash = computeComparableHash({
        items: payload.items,
        dockIds: payload.dockIds,
        spaces: payload.spaces,
        settings: payload.settings,
        wallpaper: payload.wallpaper,
        savedTabGroups: payload.savedTabGroups,
        notes: payload.notes,
        todos: payload.todos,
      });

      lastBackedUpHash = hash;
      isDirty = false;

      await persistAutoBackupInfo({
        ...currentInfo,
        enabled: true,
        fileName: handle.name,
        lastBackupTime: now,
        lastError: null,
        lastHash: hash,
      });

      notifyStatusChange();
      return { success: true, fileName: handle.name };
    } else {
      await persistAutoBackupInfo({
        ...currentInfo,
        enabled: true,
        fileName: handle.name,
        lastError: writeResult.error || "Failed to write initial backup data.",
      });

      notifyStatusChange();
      return {
        success: false,
        error: writeResult.error || "Selected file could not be written to.",
      };
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: "File selection was cancelled." };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function reconnectBackupFile(): Promise<boolean> {
  const handle = await getStoredFileHandle();
  if (!handle) return false;

  const granted = await requestFilePermission(handle);
  if (granted) {
    const backupResult = await performManualBackup();
    return backupResult.success;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Execution & Concurrency Management
// ---------------------------------------------------------------------------

export async function performManualBackup(): Promise<{
  success: boolean;
  error?: string;
  fileName?: string;
}> {
  const handle = await getStoredFileHandle();
  if (!handle) {
    return {
      success: false,
      error: "No backup file is connected. Click 'Choose backup file' first.",
    };
  }

  const permission = await checkFilePermission(handle);
  if (permission !== "granted") {
    const granted = await requestFilePermission(handle);
    if (!granted) {
      return {
        success: false,
        error: "Write permission was not granted for the backup file.",
      };
    }
  }

  isBackingUp = true;
  try {
    await yieldToMainThread();
    const payload = await buildCanonicalBackupPayload();
    const writeResult = await writePayloadToFile(handle, payload);

    if (writeResult.success) {
      const hash = computeComparableHash({
        items: payload.items,
        dockIds: payload.dockIds,
        spaces: payload.spaces,
        settings: payload.settings,
        wallpaper: payload.wallpaper,
        savedTabGroups: payload.savedTabGroups,
        notes: payload.notes,
        todos: payload.todos,
      });

      lastBackedUpHash = hash;
      isDirty = false;

      const info = await getAutoBackupInfo();
      await persistAutoBackupInfo({
        ...info,
        fileName: handle.name,
        lastBackupTime: Date.now(),
        lastError: null,
        lastHash: hash,
      });

      notifyStatusChange();
      return { success: true, fileName: handle.name };
    } else {
      await handleBackupWriteError(writeResult.error, handle.name);
      return {
        success: false,
        error: writeResult.error || "Failed to write to the backup file.",
      };
    }
  } catch (err: unknown) {
    await handleBackupWriteError(err, handle.name);
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  } finally {
    isBackingUp = false;
  }
}

/**
 * Performs atomic background write with cross-tab lock coordination.
 */
async function performBackupWrite(
  handle: FileSystemFileHandle,
): Promise<void> {
  await yieldToMainThread();

  // Re-check external stored hash to see if another tab already completed this exact backup
  const storedInfo = await getAutoBackupInfo();
  const payload = await buildCanonicalBackupPayload();

  const contentHash = computeComparableHash({
    items: payload.items,
    dockIds: payload.dockIds,
    spaces: payload.spaces,
    settings: payload.settings,
    wallpaper: payload.wallpaper,
    savedTabGroups: payload.savedTabGroups,
    notes: payload.notes,
    todos: payload.todos,
  });

  if (contentHash === lastBackedUpHash || contentHash === storedInfo.lastHash) {
    lastBackedUpHash = contentHash;
    isDirty = false;
    return;
  }

  const writeResult = await writePayloadToFile(handle, payload);

  if (writeResult.success) {
    lastBackedUpHash = contentHash;
    isDirty = false;

    await persistAutoBackupInfo({
      ...storedInfo,
      fileName: handle.name,
      lastBackupTime: Date.now(),
      lastError: null,
      lastHash: contentHash,
    });

    notifyStatusChange();
  } else {
    await handleBackupWriteError(writeResult.error, handle.name);
  }
}

async function executeAutoBackup(): Promise<void> {
  if (isPaused || !isDirty) {
    return;
  }

  const handle = await getStoredFileHandle();
  if (!handle) {
    return;
  }

  const permission = await checkFilePermission(handle);
  if (permission === "denied") {
    notifyStatusChange();
    return;
  }

  isBackingUp = true;
  try {
    if (typeof navigator !== "undefined" && navigator.locks) {
      await navigator.locks.request("tabin_backup_file_lock", async () => {
        await performBackupWrite(handle);
      });
    } else {
      await performBackupWrite(handle);
    }
  } catch (err: unknown) {
    await handleBackupWriteError(err, handle.name);
  } finally {
    isBackingUp = false;
    if (hasPendingFollowUp) {
      hasPendingFollowUp = false;
      triggerAutoBackup(false);
    }
  }
}

/**
 * Triggers a debounced or immediate automatic backup.
 * Rapid calls coalesce into a single execution after DEBOUNCE_DELAY_MS of quiescence.
 */
export function triggerAutoBackup(immediate = false): void {
  isDirty = true;
  if (isPaused) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (immediate) {
    if (isBackingUp) {
      hasPendingFollowUp = true;
    } else {
      executeAutoBackup().catch(() => {});
    }
    return;
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (isBackingUp) {
      hasPendingFollowUp = true;
    } else {
      executeAutoBackup().catch(() => {});
    }
  }, DEBOUNCE_DELAY_MS);
}

/**
 * Temporarily pauses auto-backup (e.g. during a workspace restore or bulk import)
 * to prevent circular write loops.
 */
export function pauseAutoBackup(durationMs = PAUSE_COOLDOWN_MS): void {
  isPaused = true;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pauseTimer) {
    clearTimeout(pauseTimer);
  }
  pauseTimer = setTimeout(() => {
    isPaused = false;
    pauseTimer = null;
  }, durationMs);
}

/**
 * Informs the auto-backup system that data was just restored from a backup.
 * Sets the last backed-up hash to match the restored content and clears dirty flag.
 */
export function markBackupRestored(rawBackup: unknown): void {
  pauseAutoBackup(PAUSE_COOLDOWN_MS);
  isDirty = false;

  if (rawBackup && typeof rawBackup === "object") {
    try {
      const b = rawBackup as Record<string, unknown>;
      const hash = computeComparableHash({
        items: b.items || [],
        dockIds: b.dockIds || [],
        spaces: b.spaces || [],
        settings: b.settings || {},
        wallpaper: b.wallpaper || {},
        savedTabGroups: b.savedTabGroups || [],
        notes: b.notes || [],
        todos: b.todos || [],
      });
      lastBackedUpHash = hash;
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Lifecycle & Subscription Management
// ---------------------------------------------------------------------------

function setupAutoBackupListeners(): void {
  // 1. Subscribe to store: filter out ALL transient UI mutations
  unsubscribeStore = useLaunchpadStore.subscribe((state, prevState) => {
    if (isPaused) return;
    if (!prevState) return;

    const isSameItems = state.items === prevState.items;
    const isSameDock = state.dockIds === prevState.dockIds;
    const isSameSpaces = state.spaces === prevState.spaces;
    const isSameSettings = state.settings === prevState.settings;
    const isSameWallpaper = state.wallpaper === prevState.wallpaper;

    if (
      isSameItems &&
      isSameDock &&
      isSameSpaces &&
      isSameSettings &&
      isSameWallpaper
    ) {
      return;
    }

    triggerAutoBackup(false);
  });

  // 2. Storage listener for external entities only
  const relevantExternalKeys = new Set([
    "tabin-saved-tabs",
    "tabin-notch-notes",
    "tabin-notch-todos",
  ]);

  storageListener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "local") return;

    if (changes[BACKUP_INFO_KEY]) {
      notifyStatusChange();
    }

    const hasExternalChange = Object.keys(changes).some((k) =>
      relevantExternalKeys.has(k),
    );
    if (hasExternalChange) {
      triggerAutoBackup(false);
    }
  };

  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener(storageListener);
  }

  // 3. One-shot initial check after startup quiescence
  initialTimer = setTimeout(() => {
    initialTimer = null;
    triggerAutoBackup(false);
  }, 2500);
}

function cleanupAutoBackupListeners(): void {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pauseTimer) {
    clearTimeout(pauseTimer);
    pauseTimer = null;
  }
  if (storageListener && typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.removeListener(storageListener);
    storageListener = null;
  }
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
}

/**
 * Initializes automatic local backup lifecycle with ref-counting.
 * Safe for React StrictMode, multiple components, and clean unmounting.
 */
export function initAutoBackup(): () => void {
  initRefCount++;
  if (initRefCount === 1) {
    setupAutoBackupListeners();
  }

  return () => {
    initRefCount = Math.max(0, initRefCount - 1);
    if (initRefCount === 0) {
      cleanupAutoBackupListeners();
    }
  };
}
