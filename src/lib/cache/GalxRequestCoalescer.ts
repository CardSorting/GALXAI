/**
 * GALXAI: High-Performance Request Coalescer & Multi-Tier Cache (SingleFlight Pattern)
 * 
 * Prevents Cache Stampedes / Thundering Herds on PostgreSQL by deduplicating concurrent
 * in-flight queries for identical keys, caching read results with configurable TTL,
 * and providing negative-cache guards against non-existent keys.
 */

export interface CacheEntry<T> {
  value: T;
  cachedAt: number;
  expiresAt: number;
  isNegative?: boolean;
}

export interface CoalescerOptions {
  /** Time to live for cached items in milliseconds (default: 10,000ms = 10s) */
  ttlMs?: number;
  /** Time to live for negative/null results to prevent cache stampedes (default: 2,000ms) */
  negativeTtlMs?: number;
  /** Maximum number of entries retained in L1 memory (default: 5,000) */
  maxEntries?: number;
}

export class GalxRequestCoalescer<T> {
  private inFlight = new Map<string, Promise<T>>();
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly negativeTtlMs: number;
  private readonly maxEntries: number;

  constructor(options: CoalescerOptions = {}) {
    this.ttlMs = options.ttlMs ?? 10000;
    this.negativeTtlMs = options.negativeTtlMs ?? 2000;
    this.maxEntries = options.maxEntries ?? 5000;
  }

  /**
   * Coalesces concurrent calls to `fetcher` for the given `key`.
   * If a cached value exists and is fresh, returns it immediately.
   * If a call for `key` is already in flight, attaches to the in-flight Promise.
   * Otherwise, executes `fetcher()`, stores the result, and resolves all waiters.
   */
  public async getOrFetch(key: string, fetcher: () => Promise<T>, customTtlMs?: number): Promise<T> {
    const now = Date.now();

    // 1. Check L1 memory cache
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    // 2. Check in-flight SingleFlight promise
    const activePromise = this.inFlight.get(key);
    if (activePromise) {
      return activePromise;
    }

    // 3. Launch single in-flight promise
    const promise = (async () => {
      try {
        const result = await fetcher();
        const effectiveTtl = result === null || result === undefined 
          ? this.negativeTtlMs 
          : (customTtlMs ?? this.ttlMs);

        this.set(key, result, effectiveTtl);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Manually sets or primes the cache for a key.
   */
  public set(key: string, value: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxEntries) {
      // LRU Eviction: remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const now = Date.now();
    const duration = ttlMs ?? this.ttlMs;
    this.cache.set(key, {
      value,
      cachedAt: now,
      expiresAt: now + duration,
      isNegative: value === null || value === undefined
    });
  }

  /**
   * Synchronous cache peek (does not trigger fetcher).
   */
  public get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Invalidates a specific key immediately (e.g. on write/mutation).
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
    this.inFlight.delete(key);
  }

  /**
   * Invalidates all keys matching a prefix or regex.
   */
  public invalidatePattern(pattern: RegExp | string): void {
    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string' ? key.startsWith(pattern) : pattern.test(key)) {
        this.cache.delete(key);
        this.inFlight.delete(key);
      }
    }
  }

  /**
   * Clears all cached items and pending single-flights.
   */
  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  /**
   * Returns cache and coalescing metrics for diagnostics.
   */
  public getStats(): { cachedEntries: number; inFlightRequests: number } {
    return {
      cachedEntries: this.cache.size,
      inFlightRequests: this.inFlight.size
    };
  }
}
