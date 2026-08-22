/**
 * GALXAI: Cloudflare Edge Cache API & Stale-While-Revalidate Engine
 * Zero-egress caching at global edge Points of Presence for model catalogs,
 * semantic embeddings, prompt caches, and rate-limit states.
 */

export interface CacheEntry<T> {
  value: T;
  cachedAtMs: number;
  ttlMs: number;
  swrTtlMs: number; // Stale-while-revalidate window
}

export class GalxEdgeCache {
  private static instance: GalxEdgeCache;
  private readonly memoryCache = new Map<string, CacheEntry<any>>();

  static getInstance(): GalxEdgeCache {
    if (!GalxEdgeCache.instance) {
      GalxEdgeCache.instance = new GalxEdgeCache();
    }
    return GalxEdgeCache.instance;
  }

  /**
   * Retrieves or computes a cached value with Stale-While-Revalidate semantics.
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { ttlMs?: number; swrTtlMs?: number } = {}
  ): Promise<{ value: T; source: 'HIT' | 'SWR_HIT' | 'MISS' }> {
    const ttlMs = options.ttlMs || 60000; // 1 minute fresh
    const swrTtlMs = options.swrTtlMs || 300000; // 5 minutes stale window
    const now = Date.now();

    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    if (entry) {
      const age = now - entry.cachedAtMs;

      // 1. Fresh Cache Hit
      if (age < entry.ttlMs) {
        return { value: entry.value, source: 'HIT' };
      }

      // 2. Stale-While-Revalidate Hit (serve stale immediately, fetch fresh in background)
      if (age < entry.ttlMs + entry.swrTtlMs) {
        // Trigger background refresh
        fetchFn()
          .then(fresh => this.set(key, fresh, { ttlMs, swrTtlMs }))
          .catch(() => {});

        return { value: entry.value, source: 'SWR_HIT' };
      }
    }

    // 3. Cache Miss
    const fresh = await fetchFn();
    this.set(key, fresh, { ttlMs, swrTtlMs });
    return { value: fresh, source: 'MISS' };
  }

  set<T>(key: string, value: T, options: { ttlMs?: number; swrTtlMs?: number } = {}): void {
    this.memoryCache.set(key, {
      value,
      cachedAtMs: Date.now(),
      ttlMs: options.ttlMs || 60000,
      swrTtlMs: options.swrTtlMs || 300000
    });

    if (this.memoryCache.size > 2000) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }
  }

  delete(key: string): void {
    this.memoryCache.delete(key);
  }

  clear(): void {
    this.memoryCache.clear();
  }
}
