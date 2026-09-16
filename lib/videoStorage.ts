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
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putRequest = store.put(blob, WALLPAPER_KEY);

    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getLiveWallpaperBlob(): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(WALLPAPER_KEY);

      getRequest.onsuccess = () => {
        resolve((getRequest.result as Blob) || null);
      };
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = () => db.close();
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
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delRequest = store.delete(WALLPAPER_KEY);

      delRequest.onsuccess = () => resolve();
      delRequest.onerror = () => reject(delRequest.error);
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Failed to delete live wallpaper from IndexedDB:', error);
  }
}
