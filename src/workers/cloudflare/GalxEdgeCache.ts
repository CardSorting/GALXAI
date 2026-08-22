/**
 * GALXAI: Cloudflare Edge Cache API & Stale-While-Revalidate Engine + BroccoliDB Hot Table
 * Zero-egress caching at global edge Points of Presence for model catalogs,
 * semantic embeddings, prompt caches, and rate-limit states.
 * Backed by BroccoliDB L1 reactive table with secondary indexing and natural query parsing.
 */

import { BroccoliDbTable } from '../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../core/broccolidb/broccolidb-natural-query';

export interface CacheEntry<T> {
  value: T;
  cachedAtMs: number;
  ttlMs: number;
  swrTtlMs: number; // Stale-while-revalidate window
}

export interface CacheRecord<T = any> {
  id: string;
  key: string;
  value: T;
  cachedAtMs: number;
  ttlMs: number;
  swrTtlMs: number;
  expiresAtMs: number;
}

export class GalxEdgeCache {
  private static instance: GalxEdgeCache;
  public readonly cacheTable: BroccoliDbTable<CacheRecord>;

  private constructor() {
    this.cacheTable = new BroccoliDbTable<CacheRecord>('edge_cache');
    this.cacheTable.createIndex('key');
    this.cacheTable.createSortedIndex('cachedAtMs');
    this.cacheTable.createSortedIndex('expiresAtMs');
  }

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

    const entry = this.cacheTable.get(key) as CacheRecord<T> | null;

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
    const now = Date.now();
    const ttlMs = options.ttlMs || 60000;
    const swrTtlMs = options.swrTtlMs || 300000;

    const record: CacheRecord<T> = {
      id: key,
      key,
      value,
      cachedAtMs: now,
      ttlMs,
      swrTtlMs,
      expiresAtMs: now + ttlMs + swrTtlMs
    };

    this.cacheTable.put(key, record);

    if (this.cacheTable.count() > 2000) {
      const oldest = this.cacheTable.query({
        sortBy: 'cachedAtMs',
        sortOrder: 'asc',
        limit: 1
      }) as CacheRecord[];
      if (oldest.length > 0) {
        this.cacheTable.delete(oldest[0].id);
      }
    }
  }

  delete(key: string): void {
    this.cacheTable.delete(key);
  }

  clear(): void {
    this.cacheTable.clear();
  }

  public queryNatural(naturalQuery: string): CacheRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'edge_cache');
    return this.cacheTable.query(parsed.queryOptions) as CacheRecord[];
  }
}
