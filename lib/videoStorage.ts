const DB_NAME = 'tabin_media_db';
const STORE_NAME = 'live_wallpaper';
const DB_VERSION = 1;
const WALLPAPER_KEY = 'active_video';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLiveWallpaperBlob(blob: Blob | File): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      try {
        db.close();
      } catch {}
    };

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putRequest = store.put(blob, WALLPAPER_KEY);

    putRequest.onsuccess = () => {};
    putRequest.onerror = () => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(putRequest.error);
      }
    };

    tx.oncomplete = () => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve();
      }
    };

    tx.onerror = () => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(tx.error);
      }
    };

    tx.onabort = () => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(tx.error || new Error('IndexedDB transaction aborted'));
      }
    };
  });
}

export async function getLiveWallpaperBlob(): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        try {
          db.close();
        } catch {}
      };

      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(WALLPAPER_KEY);

      getRequest.onsuccess = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve((getRequest.result as Blob) || null);
        }
      };

      getRequest.onerror = () => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(getRequest.error);
        }
      };

      tx.oncomplete = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(null);
        }
      };

      tx.onerror = () => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(tx.error);
        }
      };

      tx.onabort = () => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(tx.error || new Error('IndexedDB transaction aborted'));
        }
      };
    });
  } catch (error) {
    console.error('Failed to get live wallpaper from IndexedDB:', error);
    return null;
  }
}

export async function deleteLiveWallpaperBlob(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        try {
          db.close();
        } catch {}
      };

      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delRequest = store.delete(WALLPAPER_KEY);

      delRequest.onsuccess = () => {};
      delRequest.onerror = () => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(delRequest.error);
        }
      };

      tx.oncomplete = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve();
        }
      };

      tx.onerror = () => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(tx.error);
        }
      };

      tx.onabort = () => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(tx.error || new Error('IndexedDB transaction aborted'));
        }
      };
    });
  } catch (error) {
    console.error('Failed to delete live wallpaper from IndexedDB:', error);
  }
}
