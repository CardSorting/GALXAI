/**
 * GALXAI: High-Performance Multi-Key Batch DataLoader & Request Coalescer
 * 
 * Implements the Meta / GraphQL DataLoader specification for PostgreSQL:
 * Automatically coalesces individual `.load(id)` calls dispatched across the same
 * event-loop microtask tick into a single bulk array database query (e.g. WHERE id = ANY($1)),
 * eliminating N+1 database queries and reducing PostgreSQL roundtrips by up to 99%.
 */

export interface DataLoaderOptions<K, V> {
  /** Maximum number of keys per single batch dispatched to PostgreSQL (default: 100) */
  maxBatchSize?: number;
  /** Maximum wait delay in ms to accumulate keys before dispatching (default: 5ms) */
  batchWindowMs?: number;
  /** Whether to memoize loaded results in L1 memory (default: true) */
  cache?: boolean;
  /** TTL for cached items in ms (default: 15,000ms = 15s) */
  cacheTtlMs?: number;
  /** Custom cache key serializer */
  cacheKeyFn?: (key: K) => string;
}

interface PendingBatchItem<K, V> {
  key: K;
  resolve: (value: V) => void;
  reject: (error: any) => void;
}

export class GalxBatchDataLoader<K, V> {
  private readonly batchLoadFn: (keys: readonly K[]) => Promise<Array<V | Error>>;
  private readonly maxBatchSize: number;
  private readonly batchWindowMs: number;
  private readonly cacheEnabled: boolean;
  private readonly cacheTtlMs: number;
  private readonly cacheKeyFn: (key: K) => string;

  private queue: Array<PendingBatchItem<K, V>> = [];
  private batchScheduled = false;
  private cache = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    batchLoadFn: (keys: readonly K[]) => Promise<Array<V | Error>>,
    options: DataLoaderOptions<K, V> = {}
  ) {
    this.batchLoadFn = batchLoadFn;
    this.maxBatchSize = options.maxBatchSize ?? 100;
    this.batchWindowMs = options.batchWindowMs ?? 5;
    this.cacheEnabled = options.cache ?? true;
    this.cacheTtlMs = options.cacheTtlMs ?? 15000;
    this.cacheKeyFn = options.cacheKeyFn ?? ((k: K) => String(k));
  }

  /**
   * Loads a single key, coalescing with other `.load()` calls in the same tick.
   */
  public async load(key: K): Promise<V> {
    const cacheKey = this.cacheKeyFn(key);
    const now = Date.now();

    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.value;
      }
    }

    return new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      if (this.queue.length >= this.maxBatchSize) {
        this.dispatchBatch();
      } else if (!this.batchScheduled) {
        this.batchScheduled = true;
        if (this.batchWindowMs <= 0) {
          queueMicrotask(() => this.dispatchBatch());
        } else {
          setTimeout(() => this.dispatchBatch(), this.batchWindowMs);
        }
      }
    });
  }

  /**
   * Loads multiple keys simultaneously in 1 batch.
   */
  public async loadMany(keys: readonly K[]): Promise<V[]> {
    return Promise.all(keys.map(k => this.load(k)));
  }

  /**
   * Clears a key from the memoization cache on mutation.
   */
  public clear(key: K): this {
    const cacheKey = this.cacheKeyFn(key);
    this.cache.delete(cacheKey);
    return this;
  }

  /**
   * Clears the entire memoization cache.
   */
  public clearAll(): this {
    this.cache.clear();
    return this;
  }

  /**
   * Primes the cache with a known value.
   */
  public prime(key: K, value: V, ttlMs?: number): this {
    const cacheKey = this.cacheKeyFn(key);
    const now = Date.now();
    const duration = ttlMs ?? this.cacheTtlMs;
    this.cache.set(cacheKey, { value, expiresAt: now + duration });
    return this;
  }

  private async dispatchBatch(): Promise<void> {
    this.batchScheduled = false;
    if (this.queue.length === 0) return;

    const currentBatch = this.queue.splice(0, this.maxBatchSize);
    const keys = currentBatch.map(item => item.key);

    try {
      const results = await this.batchLoadFn(keys);

      if (results.length !== currentBatch.length) {
        throw new Error(
          `DataLoader batch function returned ${results.length} results for ${currentBatch.length} keys.`
        );
      }

      const now = Date.now();
      for (let i = 0; i < currentBatch.length; i++) {
        const item = currentBatch[i];
        const res = results[i];

        if (res instanceof Error) {
          item.reject(res);
        } else {
          if (this.cacheEnabled) {
            const cacheKey = this.cacheKeyFn(item.key);
            this.cache.set(cacheKey, { value: res, expiresAt: now + this.cacheTtlMs });
          }
          item.resolve(res);
        }
      }
    } catch (error: any) {
      for (const item of currentBatch) {
        item.reject(error);
      }
    }
  }
}
