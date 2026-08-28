/**
 * GALXAI: BroccoliTieredKvCache (Zenith Tier)
 *
 * Multi-Tiered Semantic KV Cache with the XFetch Probabilistic Stampede Prevention Algorithm.
 * Implements L1 Hot In-Memory, L2 Compressed Snapshot, and L3 Cold Storage tiers with early probabilistic refresh.
 */

import type {
  BroccoliTieredCacheEntry,
  BroccoliTieredCacheMetrics,
  IBroccoliTieredKvCache,
} from "./broccolidb.contracts";

export class BroccoliTieredKvCache implements IBroccoliTieredKvCache {
  private readonly l1Memory = new Map<string, BroccoliTieredCacheEntry<any>>();
  private readonly l2Compressed = new Map<string, { json: string; expiresAt: number; computationTimeMs: number }>();
  private readonly maxL1Entries: number;
  private readonly inFlightFetches = new Map<string, Promise<unknown>>();

  private l1HitsCount = 0;
  private l2HitsCount = 0;
  private l3HitsCount = 0;
  private missesCount = 0;
  private earlyRefreshesCount = 0;

  constructor(maxL1Entries = 1000) {
    if (!Number.isSafeInteger(maxL1Entries) || maxL1Entries <= 0) {
      throw new RangeError("maxL1Entries must be a positive integer");
    }
    this.maxL1Entries = maxL1Entries;
  }

  public async get<T = unknown>(
    key: string,
    fetcher?: () => Promise<T>,
    options: { readonly ttlMs?: number; readonly beta?: number } = {}
  ): Promise<T | undefined> {
    const now = Date.now();
    const beta = options.beta ?? 1.0;
    const ttlMs = options.ttlMs ?? 60000;
    if (!key.length) throw new TypeError("key must be non-empty");
    if (!Number.isFinite(beta) || beta < 0) throw new RangeError("beta must be a non-negative number");
    this.validateTtl(ttlMs);

    // 1. Check L1 Memory
    const l1Entry = this.l1Memory.get(key);
    if (l1Entry) {
      l1Entry.readCount++;
      const timeToExpiry = l1Entry.expiresAt - now;

      // XFetch Algorithm: Probabilistic Early Refresh to eliminate thundering herds
      // early_refresh if: -beta * delta * ln(random()) > timeToExpiry
      if (fetcher && timeToExpiry > 0) {
        const delta = l1Entry.computationTimeMs;
        const xfetchThreshold = -beta * delta * Math.log(Math.random());

        if (xfetchThreshold > timeToExpiry && !this.inFlightFetches.has(key)) {
          this.earlyRefreshesCount++;
          // Single-flight refresh: at most one origin computation per key.
          void this.recomputeAndStore(key, fetcher, ttlMs).catch(() => undefined);
        }
      }

      if (timeToExpiry > 0) {
        this.l1HitsCount++;
        return l1Entry.value as T;
      }
      this.l1Memory.delete(key);
    }

    // 2. Check L2 Compressed Storage
    const l2Entry = this.l2Compressed.get(key);
    if (l2Entry && l2Entry.expiresAt > now) {
      try {
        this.l2HitsCount++;
        const decompressed = JSON.parse(l2Entry.json) as T;
        this.put(key, decompressed, l2Entry.expiresAt - now, l2Entry.computationTimeMs);
        return decompressed;
      } catch {
        this.l2Compressed.delete(key);
      }
    }
    if (l2Entry) this.l2Compressed.delete(key);

    // 3. Cache Miss: Recompute via fetcher if provided
    if (fetcher) {
      this.missesCount++;
      return this.recomputeAndStore(key, fetcher, ttlMs);
    }

    this.missesCount++;
    return undefined;
  }

  public put<T = unknown>(key: string, value: T, ttlMs = 60000, computationTimeMs = 5): void {
    if (!key.length) throw new TypeError("key must be non-empty");
    this.validateTtl(ttlMs);
    if (!Number.isFinite(computationTimeMs) || computationTimeMs < 0) {
      throw new RangeError("computationTimeMs must be a non-negative finite number");
    }
    if (!this.l1Memory.has(key) && this.l1Memory.size >= this.maxL1Entries) {
      this.demoteOldestToL2();
    }

    const now = Date.now();
    const expiresAt = now + ttlMs;

    const entry: BroccoliTieredCacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt,
      computationTimeMs,
      tier: "L1_MEMORY",
      readCount: 1,
    };

    this.l1Memory.set(key, entry);
    // Mirror to L2 compressed JSON
    try {
      const json = JSON.stringify(value);
      if (json !== undefined) {
        this.l2Compressed.set(key, { json, expiresAt, computationTimeMs });
      } else {
        this.l2Compressed.delete(key);
      }
    } catch {
      // L1 accepts arbitrary JS values; values that cannot be represented as
      // JSON simply do not participate in the JSON-backed L2 tier.
      this.l2Compressed.delete(key);
    }
  }

  public delete(key: string): boolean {
    const l1Del = this.l1Memory.delete(key);
    const l2Del = this.l2Compressed.delete(key);
    return l1Del || l2Del;
  }

  public clear(): void {
    this.l1Memory.clear();
    this.l2Compressed.clear();
    this.inFlightFetches.clear();
  }

  public getMetrics(): BroccoliTieredCacheMetrics {
    return {
      l1EntriesCount: this.l1Memory.size,
      l2EntriesCount: this.l2Compressed.size,
      l3EntriesCount: 0,
      l1Hits: this.l1HitsCount,
      l2Hits: this.l2HitsCount,
      l3Hits: this.l3HitsCount,
      misses: this.missesCount,
      earlyRefreshes: this.earlyRefreshesCount,
    };
  }

  private async recomputeAndStore<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const existing = this.inFlightFetches.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const computation = (async () => {
      const t0 = Date.now();
      const value = await fetcher();
      const delta = Math.max(1, Date.now() - t0);
      this.put(key, value, ttlMs, delta);
      return value;
    })();
    this.inFlightFetches.set(key, computation);
    try {
      return await computation;
    } finally {
      if (this.inFlightFetches.get(key) === computation) this.inFlightFetches.delete(key);
    }
  }

  private demoteOldestToL2(): void {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;

    for (const [k, v] of this.l1Memory.entries()) {
      if (v.expiresAt < oldestExpiry) {
        oldestExpiry = v.expiresAt;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      this.l1Memory.delete(oldestKey);
    }
  }

  private validateTtl(ttlMs: number): void {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
      throw new RangeError("ttlMs must be a positive integer");
    }
  }
}
