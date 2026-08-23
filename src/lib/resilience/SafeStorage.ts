/**
 * GALXAI: Zero-Crash Safe Storage Utility
 *
 * Provides a bulletproof wrapper around localStorage and sessionStorage.
 * If browser storage throws DOMException (Private Browsing, QuotaExceededError,
 * disabled cookies, or iframe sandboxing), operations transparently fall back
 * to an in-memory Map store without throwing unhandled exceptions.
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

export const SafeStorage = {
  // Local Storage Methods
  getItem(key: string): string | null {
    try {
      return getStorage('local').getItem(key);
    } catch {
      return memoryLocalStorage.getItem(key);
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      getStorage('local').setItem(key, value);
      return true;
    } catch {
      memoryLocalStorage.setItem(key, value);
      return false;
    }
  },

  removeItem(key: string): void {
    try {
      getStorage('local').removeItem(key);
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
    try {
      getStorage('session').setItem(key, value);
      return true;
    } catch {
      memorySessionStorage.setItem(key, value);
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
  }
};
