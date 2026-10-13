import { AUDIO_EVENT_DEFINITIONS, type AudioAssetKey, type AudioAssetMetadata } from '../types/audio';

const DB_NAME = 'gdg_feud_audio_assets_v1';
const DB_VERSION = 1;
const STORE_NAME = 'audio_files';
const META_STORE_NAME = 'audio_metadata';

type AudioChangeCallback = () => void;

class AudioStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private audioSyncChannel: BroadcastChannel | null = null;
  private changeListeners: Set<AudioChangeCallback> = new Set();
  private objectUrlCache: Map<AudioAssetKey, string> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.audioSyncChannel = new BroadcastChannel('gdg_feud_audio_sync');
        this.audioSyncChannel.onmessage = (event) => {
          if (event.data?.type === 'AUDIO_ASSETS_UPDATED') {
            this.clearObjectUrlCache();
            this.notifyChangeListeners();
          }
        };
      } catch (e) {
        console.warn('Audio sync BroadcastChannel error:', e);
      }
    }
  }

  private clearObjectUrlCache() {
    this.objectUrlCache.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.objectUrlCache.clear();
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(META_STORE_NAME)) {
          db.createObjectStore(META_STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  public async saveAudioAsset(key: AudioAssetKey, file: File): Promise<AudioAssetMetadata> {
    const db = await this.getDB();

    const metadata: AudioAssetMetadata = {
      key,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'audio/mpeg',
      updatedAt: Date.now(),
      isConfigured: true,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
      const fileStore = tx.objectStore(STORE_NAME);
      const metaStore = tx.objectStore(META_STORE_NAME);

      fileStore.put(file, key);
      metaStore.put(metadata, key);

      tx.oncomplete = () => {
        // Clear cached URL for this key
        const existingUrl = this.objectUrlCache.get(key);
        if (existingUrl) {
          URL.revokeObjectURL(existingUrl);
          this.objectUrlCache.delete(key);
        }

        this.broadcastUpdate();
        resolve(metadata);
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAudioBlob(key: AudioAssetKey): Promise<Blob | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  public async getAudioUrl(key: AudioAssetKey): Promise<string | null> {
    if (this.objectUrlCache.has(key)) {
      return this.objectUrlCache.get(key)!;
    }

    const blob = await this.getAudioBlob(key);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    this.objectUrlCache.set(key, url);
    return url;
  }

  public async removeAudioAsset(key: AudioAssetKey): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.objectStore(META_STORE_NAME).delete(key);

      tx.oncomplete = () => {
        const existingUrl = this.objectUrlCache.get(key);
        if (existingUrl) {
          URL.revokeObjectURL(existingUrl);
          this.objectUrlCache.delete(key);
        }

        this.broadcastUpdate();
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAllMetadata(): Promise<Record<AudioAssetKey, AudioAssetMetadata>> {
    const result: Record<AudioAssetKey, AudioAssetMetadata> = {} as Record<AudioAssetKey, AudioAssetMetadata>;

    // Initialize all as unconfigured by default
    AUDIO_EVENT_DEFINITIONS.forEach((def) => {
      result[def.key] = {
        key: def.key,
        fileName: '',
        fileSize: 0,
        mimeType: '',
        updatedAt: 0,
        isConfigured: false,
      };
    });

    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(META_STORE_NAME, 'readonly');
        const store = tx.objectStore(META_STORE_NAME);
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const key = cursor.key as AudioAssetKey;
            result[key] = cursor.value;
            cursor.continue();
          } else {
            resolve(result);
          }
        };

        request.onerror = () => resolve(result);
      });
    } catch {
      return result;
    }
  }

  public onAudioAssetsChanged(listener: AudioChangeCallback): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private broadcastUpdate() {
    this.notifyChangeListeners();
    if (this.audioSyncChannel) {
      try {
        this.audioSyncChannel.postMessage({ type: 'AUDIO_ASSETS_UPDATED', timestamp: Date.now() });
      } catch (e) {
        console.warn('Failed to broadcast audio update:', e);
      }
    }
  }

  private notifyChangeListeners() {
    this.changeListeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Audio change listener error:', e);
      }
    });
  }
}

export const audioStorage = new AudioStorage();
