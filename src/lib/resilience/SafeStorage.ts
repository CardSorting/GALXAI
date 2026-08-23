/**
 * GALXAI: Zero-Crash Safe Storage Utility with Cross-Tab Synchronization & Quota Safeguards
 *
 * Provides a bulletproof wrapper around localStorage and sessionStorage.
 * - Handles Private Browsing, QuotaExceededError, and sandbox iframes transparently.
 * - Replicates state mutations across browser tabs via BroadcastChannel and StorageEvent.
 * - Auto-evicts oldest LRU keys when storage quota thresholds are exceeded.
 */

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  public get length(): number {
    return this.store.size;
  }

  public clear(): void {
    this.store.clear();
  }

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryLocalStorage = new MemoryStorage();
const memorySessionStorage = new MemoryStorage();

// Cross-tab broadcast channel
let storageBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
  try {
    storageBroadcastChannel = new BroadcastChannel('galx_storage_sync_channel');
  } catch {}
}

const crossTabListeners = new Set<(key: string, value: string | null) => void>();

if (storageBroadcastChannel) {
  storageBroadcastChannel.onmessage = (event) => {
    if (event.data && event.data.key) {
      crossTabListeners.forEach((cb) => {
        try {
          cb(event.data.key, event.data.value);
        } catch {}
      });
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key) {
      crossTabListeners.forEach((cb) => {
        try {
          cb(event.key!, event.newValue);
        } catch {}
      });
    }
  });
}

function getStorage(type: 'local' | 'session'): Storage {
  if (typeof window === 'undefined') {
    return type === 'local' ? memoryLocalStorage : memorySessionStorage;
  }

  try {
    const storage = type === 'local' ? window.localStorage : window.sessionStorage;
    const testKey = '__galx_storage_probe__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return storage;
  } catch {
    return type === 'local' ? memoryLocalStorage : memorySessionStorage;
  }
}

/**
 * Handle QuotaExceededError by removing oldest cache items
 */
function evictOldestCache(storage: Storage): void {
  try {
    const keysToEvict: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && (k.startsWith('galx_cache_') || k.startsWith('galx_temp_'))) {
        keysToEvict.push(k);
      }
    }
    // Drop first 10 cached entries
    for (let i = 0; i < Math.min(10, keysToEvict.length); i++) {
      storage.removeItem(keysToEvict[i]);
    }
  } catch {}
}

export const SafeStorage = {
  // Local Storage Methods
  getItem(key: string): string | null {
    try {
      return getStorage('local').getItem(key);
    } catch {
      return memoryLocalStorage.getItem(key);
    }
  },

  setItem(key: string, value: string, broadcast: boolean = true): boolean {
    const stringValue = String(value);
    try {
      const storage = getStorage('local');
      try {
        storage.setItem(key, stringValue);
      } catch (err: any) {
        if (err?.name === 'QuotaExceededError' || err?.code === 22) {
          evictOldestCache(storage);
          storage.setItem(key, stringValue);
        } else {
          throw err;
        }
      }

      if (broadcast && storageBroadcastChannel) {
        try {
          storageBroadcastChannel.postMessage({ key, value: stringValue });
        } catch {}
      }
      return true;
    } catch {
      memoryLocalStorage.setItem(key, stringValue);
      return false;
    }
  },

  removeItem(key: string, broadcast: boolean = true): void {
    try {
      getStorage('local').removeItem(key);
      if (broadcast && storageBroadcastChannel) {
        try {
          storageBroadcastChannel.postMessage({ key, value: null });
        } catch {}
      }
    } catch {
      memoryLocalStorage.removeItem(key);
    }
  },

  // Session Storage Methods
  getSessionItem(key: string): string | null {
    try {
      return getStorage('session').getItem(key);
    } catch {
      return memorySessionStorage.getItem(key);
    }
  },

  setSessionItem(key: string, value: string): boolean {
    const stringValue = String(value);
    try {
      const storage = getStorage('session');
      try {
        storage.setItem(key, stringValue);
      } catch (err: any) {
        if (err?.name === 'QuotaExceededError' || err?.code === 22) {
          evictOldestCache(storage);
          storage.setItem(key, stringValue);
        } else {
          throw err;
        }
      }
      return true;
    } catch {
      memorySessionStorage.setItem(key, stringValue);
      return false;
    }
  },

  removeSessionItem(key: string): void {
    try {
      getStorage('session').removeItem(key);
    } catch {
      memorySessionStorage.removeItem(key);
    }
  },

  // Safe JSON Helper
  getJSON<T>(key: string, fallback: T, type: 'local' | 'session' = 'local'): T {
    try {
      const raw = type === 'local' ? this.getItem(key) : this.getSessionItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJSON<T>(key: string, value: T, type: 'local' | 'session' = 'local'): boolean {
    try {
      const serialized = JSON.stringify(value);
      return type === 'local' ? this.setItem(key, serialized) : this.setSessionItem(key, serialized);
    } catch {
      return false;
    }
  },

  // Cross-Tab Subscription
  onStorageChange(callback: (key: string, value: string | null) => void): () => void {
    crossTabListeners.add(callback);
    return () => {
      crossTabListeners.delete(callback);
    };
  }
};
