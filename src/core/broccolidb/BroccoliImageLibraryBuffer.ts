/** Bounded process-local image metadata and page caches; PostgreSQL owns durable records. */

import { BroccoliDbTable } from './broccolidb-table';
import { BroccoliBoundedCache, BroccoliReadCoordinator } from './broccolidb-bounded-cache';
import { decodeLibraryCursor, encodeLibraryCursor, libraryScope } from '../../lib/images/library-cursor';
import type {
  ImageGenerationRecord,
  ImageLibraryPage,
  ImageLibraryStats,
  ImageLibraryFilterOptions,
} from '../contracts/GalxContracts';
import { getSupabaseAdmin, isSupabaseConfigured, isSupabaseAdminConfigured } from '../../lib/supabase/client';
import { executePostgresQuery } from '../../lib/db/postgres';
import { GalxUnifiedR2StorageManager } from '../storage/GalxUnifiedR2StorageManager';

export interface BroccoliBufferMetrics {
  readonly queueDepth: number;
  readonly totalBufferedWrites: number;
  readonly totalFlushesExecuted: number;
  readonly totalDatabaseHopsSaved: number;
  readonly estimatedEgressBytesSaved: number;
  readonly lastFlushTimestampMs: number;
  readonly l1CachedRecordCount: number;
}

export class BroccoliImageLibraryBuffer {
  private static instance: BroccoliImageLibraryBuffer;

  // Bounded hot metadata, independent of pending writes.
  private readonly recordCache = new BroccoliBoundedCache<ImageGenerationRecord>('galx_image_library_l1', { entries: 512, bytes: 16 * 1024 * 1024, ttlMs: 60_000 });
  public readonly l1Table: BroccoliDbTable<ImageGenerationRecord> = this.recordCache.table;

  // Pending write queue (keyed by assetId to deduplicate multiple updates)
  private readonly writeQueue = new Map<string, ImageGenerationRecord>();
  private readonly queuedSizes = new Map<string, number>();
  private queuedBytes = 0;

  // Tracks records known to exist in PostgreSQL so queued mutations are not
  // confused with never-persisted writes during delete coalescing.
  private readonly persistedAssetIds = new Set<string>();

  // Query-shaped pages are cached briefly to collapse repeated filter/sort requests.
  private readonly queryPageCache = new BroccoliBoundedCache<ImageLibraryPage>('galx_image_library_pages', { entries: 128, bytes: 8 * 1024 * 1024, ttlMs: 15_000 });
  private readonly reads = new BroccoliReadCoordinator(8, 64);
  private mutationEpoch = 0;

  // Configuration
  private readonly batchThreshold: number = 10;
  private readonly flushIntervalMs: number = 5000;
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;
  private activeFlushCompletion: Promise<void> | null = null;
  private resolveActiveFlush: (() => void) | null = null;

  // Telemetry metrics
  private totalBufferedWrites = 0;
  private totalFlushesExecuted = 0;
  private totalDatabaseHopsSaved = 0;
  private estimatedEgressBytesSaved = 0;
  private lastFlushTimestampMs = Date.now();

  private constructor() {
    this.l1Table.createIndex('userId');
    this.l1Table.createIndex('sessionId');
    this.l1Table.createIndex('aspectRatio');
    this.l1Table.createIndex('isFavorite');
    this.l1Table.createCompositeIndex(['userId', 'sessionId']);
    this.l1Table.createSortedIndex('createdAt');
  }

  public static getInstance(): BroccoliImageLibraryBuffer {
    if (!BroccoliImageLibraryBuffer.instance) {
      BroccoliImageLibraryBuffer.instance = new BroccoliImageLibraryBuffer();
    }
    return BroccoliImageLibraryBuffer.instance;
  }

  /**
   * Enqueues an image generation record into the high-velocity L1 buffer.
   * Pending writes remain in the bounded queue until PostgreSQL acknowledges them.
   */
  public enqueueRecord(record: ImageGenerationRecord): void {
    // 1. Instant L1 in-memory write
    this.queueRecord(record);
    this.recordCache.put(record.id, record);

    // 2. Queue for batched persistence
    this.invalidateUserQueryCache(record.userId);
    this.totalBufferedWrites++;

    // 3. Check threshold or schedule debounce timer
    if (this.writeQueue.size >= this.batchThreshold) {
      void this.flushBatch();
    } else {
      this.ensureDebounceTimer();
    }
  }

  /** Records that an L1 asset was loaded or mutated through PostgreSQL. */
  public markPersisted(assetId: string): void {
    if (this.writeQueue.has(assetId)) this.persistedAssetIds.add(assetId);
  }

  /**
   * Enqueues a partial mutation (e.g. toggle favorite, update tags) into L1 and write queue.
   */
  public enqueueMutation(
    userId: string,
    assetId: string,
    delta: Partial<ImageGenerationRecord>
  ): ImageGenerationRecord | null {
    const existing = this.writeQueue.get(assetId) || this.recordCache.get(assetId);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    const updated: ImageGenerationRecord = {
      ...existing,
      ...delta,
      updatedAt: new Date().toISOString()
    };

    this.queueRecord(updated);
    this.recordCache.put(assetId, updated);
    this.invalidateUserQueryCache(userId);
    this.totalBufferedWrites++;

    if (this.writeQueue.size >= this.batchThreshold) {
      void this.flushBatch();
    } else {
      this.ensureDebounceTimer();
    }

    return updated;
  }

  /**
   * Flushes up to 64 queued records to PostgreSQL in one atomic batch.
   * Concurrent requests share the active flush.
   */
  public async flushBatch(): Promise<number> {
    if (this.isFlushing) {
      await this.activeFlushCompletion;
      return this.writeQueue.size > 0 ? this.flushBatch() : 0;
    }
    if (this.writeQueue.size === 0) return 0;

    this.isFlushing = true;
    this.activeFlushCompletion = new Promise<void>((resolve) => {
      this.resolveActiveFlush = resolve;
    });

    // Snapshot without clearing. Entries are removed only after the authoritative write
    // succeeds, preventing a transient database failure from dropping buffered assets.
    const batch = Array.from(this.writeQueue.values()).slice(0, 64);

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      const recordCount = batch.length;
      if (recordCount === 0) return 0;

      // 1. Format payload for Supabase PostgreSQL RPC fn_batch_upsert_image_library
      const rpcPayload = batch.map((r) => ({
        id: r.id,
        user_id: r.userId,
        generation_id: typeof r.generationId === 'string'
          ? r.generationId
          : (typeof r.metadata?.requestId === 'string' ? r.metadata.requestId : null),
        session_id: r.sessionId || 'default',
        status: r.status || 'completed',
        prompt: r.prompt,
        revised_prompt: r.revisedPrompt || null,
        model: r.model,
        aspect_ratio: r.aspectRatio || '1:1',
        dimensions: r.dimensions || '1024x1024',
        quality: r.quality || 'standard',
        public_url: r.publicUrl,
        r2_key: r.r2Key,
        content_type: r.contentType || 'image/png',
        size_bytes: r.sizeBytes || 0,
        sha256: r.sha256,
        lqip: r.lqip || null,
        seed: r.seed || null,
        latency_ms: r.latencyMs || 0,
        cost_usd: r.costUsd || 0,
        is_favorite: Boolean(r.isFavorite),
        is_public: r.isPublic !== undefined ? Boolean(r.isPublic) : true,
        visibility: r.visibility || 'public',
        tags: r.tags || [],
        metadata: r.metadata || {},
        created_at: r.createdAt
      }));

      // 2. Execute single-roundtrip multi-row upsert in Supabase PostgreSQL.
      let persisted = false;
      if (isSupabaseAdminConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          const { error: rpcError } = await supabase.rpc(
            'fn_batch_upsert_image_library',
            { p_records: rpcPayload as any }
          );

          if (rpcError) throw rpcError;
          persisted = true;
        } catch (dbErr: any) {
          console.warn(`[BroccoliImageLibraryBuffer] Supabase batch write failed; trying pooled PostgreSQL: ${dbErr.message}`);
          const fallback = await executePostgresQuery(
            'SELECT public.fn_batch_upsert_image_library($1::jsonb) AS count;',
            [JSON.stringify(rpcPayload)]
          ).catch((e) => {
            console.warn(`[BroccoliImageLibraryBuffer] Direct query fallback error: ${e.message}`);
            return null;
          });
          persisted = fallback !== null;
        }
      } else {
        try {
          const result = await executePostgresQuery(
            'SELECT public.fn_batch_upsert_image_library($1::jsonb) AS count;',
            [JSON.stringify(rpcPayload)]
          );
          persisted = result !== null;
        } catch (dbErr: any) {
          console.warn(`[BroccoliImageLibraryBuffer] Direct Postgres batch write error: ${dbErr.message}`);
        }
      }

      if (!persisted) {
        console.warn('[BroccoliImageLibraryBuffer] Authoritative store unavailable; retaining batch for retry.');
        return 0;
      }

      // Remove only the exact versions included in this flush. Concurrent mutations of the
      // same asset remain queued for the next batch.
      for (const record of batch) {
        if (this.writeQueue.get(record.id) === record) this.removeQueuedRecord(record.id);
        else if (this.writeQueue.has(record.id)) this.persistedAssetIds.add(record.id);
      }

      // 3. Update telemetry
      this.totalFlushesExecuted++;
      this.totalDatabaseHopsSaved += Math.max(0, recordCount - 1);
      // Rough estimate of avoided JSON headers and HTTP roundtrip payload
      this.estimatedEgressBytesSaved += recordCount * 850;
      this.lastFlushTimestampMs = Date.now();

      return recordCount;
    } finally {
      this.isFlushing = false;
      this.resolveActiveFlush?.();
      this.resolveActiveFlush = null;
      this.activeFlushCompletion = null;
      // If new records were added during flush, ensure timer is scheduled
      if (this.writeQueue.size > 0) {
        this.ensureDebounceTimer();
      }
    }
  }

  /**
   * Forces an immediate synchronous flush of all buffered writes.
   */
  public async flushSync(): Promise<number> {
    let total = 0;
    // A bounded queue requires at most two snapshots in the absence of new work.
    for (let attempt = 0; attempt < 4 && this.writeQueue.size; attempt++) {
      const flushed = await this.flushBatch(); total += flushed;
      if (!flushed) break;
    }
    return total;
  }

  public async flushAssetsDurably(userId: string, assetIds: string[]): Promise<void> {
    await this.flushSync();
    if (assetIds.some(id => this.writeQueue.get(id)?.userId === userId)) throw new Error('Image changes could not be saved');
  }

  /**
   * Reads a short-lived cached page or an authoritative filtered database page.
   */
  public async queryLibrary(
    userId: string,
    options: ImageLibraryFilterOptions = {}
  ): Promise<ImageLibraryPage> {
    const normalizedOptions: ImageLibraryFilterOptions = {
      ...options,
      limit: Number.isSafeInteger(options.limit) ? Math.min(Math.max(options.limit!, 1), 100) : 48,
      sort: options.sort === 'oldest' ? 'oldest' : 'newest'
    };
    const cacheKey = `${userId}\u0000${JSON.stringify(normalizedOptions)}`;
    const cached = this.queryPageCache.get(cacheKey);
    if (cached) return cached;
    const epoch = this.mutationEpoch;
    return this.reads.run(`page:${epoch}:${cacheKey}`, async () => {
      const pendingIds = [...this.writeQueue.values()].filter(record => record.userId === userId).map(record => record.id);
      if (isSupabaseConfigured() && pendingIds.length) await this.flushAssetsDurably(userId, pendingIds);
      const authoritative = await this.queryAuthoritativePage(userId, normalizedOptions);
      if (authoritative) {
        if (authoritative.records.some(record => record.userId !== userId)) throw new Error('Invalid library owner');
        if (epoch === this.mutationEpoch) this.queryPageCache.put(cacheKey, authoritative);
        return authoritative;
      }
      // A partial cache is never an authoritative library or a successful outage response.
      if (isSupabaseConfigured() || process.env.NODE_ENV === 'production') throw new Error('Image library read unavailable');
      return this.queryLocalLibrary(userId, normalizedOptions);
    });
  }

  private async queryLocalLibrary(userId: string, options: ImageLibraryFilterOptions): Promise<ImageLibraryPage> {

    // 2. Query all records for user from L1 table
    let records: ImageGenerationRecord[] = [...this.l1Table.query({
      where: { userId }
    })];

    // 3. Compute baseline user stats across all user items
    const stats = this.computeStats(records);

    // Compute available sessions
    const sessionMap = new Map<string, number>();
    for (const r of records) {
      const s = r.sessionId || 'default';
      sessionMap.set(s, (sessionMap.get(s) || 0) + 1);
    }
    const availableSessions = Array.from(sessionMap.entries())
      .map(([sessionId, count]) => ({ sessionId, count }))
      .sort((a, b) => b.count - a.count);

    // 4. Apply Filters
    if (options.sessionId && options.sessionId !== 'all') {
      records = records.filter((r) => r.sessionId === options.sessionId);
    }

    if (options.aspectRatio && options.aspectRatio !== 'all') {
      records = records.filter((r) => r.aspectRatio === options.aspectRatio);
    }

    if (options.isFavorite !== undefined) {
      records = records.filter((r) => Boolean(r.isFavorite) === options.isFavorite);
    }

    if (options.visibility && options.visibility !== 'all') {
      records = records.filter((r) => (r.visibility || 'public') === options.visibility);
    }

    if (options.search && options.search.trim().length > 0) {
      const q = options.search.toLowerCase().trim();
      records = records.filter((r) => {
        return (
          r.prompt.toLowerCase().includes(q) ||
          (r.revisedPrompt && r.revisedPrompt.toLowerCase().includes(q)) ||
          r.model.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    // 5. Apply Sorting
    const sort = options.sort || 'newest';
    records.sort((a, b) => {
      if (sort === 'oldest') {
        return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
      }
      // default: newest
      return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
    });

    const totalCount = records.length;

    // 6. Pagination
    const cursor = this.decodeCursor(options.cursor);
    if (cursor) {
      records = records.filter((record) => {
        const comparison = record.createdAt.localeCompare(cursor.createdAt) || record.id.localeCompare(cursor.id);
        return sort === 'oldest' ? comparison > 0 : comparison < 0;
      });
    }
    const limit = options.limit!;
    const hasMore = records.length > limit;
    const pagedRecords = records.slice(0, limit);
    const lastRecord = pagedRecords.at(-1);

    return {
      records: pagedRecords,
      totalCount,
      stats,
      availableSessions,
      nextCursor: hasMore && lastRecord ? this.encodeCursor(lastRecord.createdAt, lastRecord.id) : null
    };
  }

  /**
   * Retrieves a single asset by ID.
   */
  public async getAsset(userId: string, assetId: string): Promise<ImageGenerationRecord | null> {
    if (!isSupabaseConfigured()) {
      if (process.env.NODE_ENV === 'production') throw new Error('Image lookup unavailable');
      const local = this.writeQueue.get(assetId) || this.recordCache.get(assetId);
      return local?.userId === userId ? local : null;
    }
    // Cached metadata cannot authorize an artifact after deletion on another instance.
    return this.reads.run(`asset:${this.mutationEpoch}:${userId}:${assetId}`, async () => {
      if (this.writeQueue.get(assetId)?.userId === userId) await this.flushAssetsDurably(userId, [assetId]);
      let row: any;
      if (isSupabaseAdminConfigured()) {
        const result = await getSupabaseAdmin().from('user_image_library').select('*').eq('user_id', userId).eq('id', assetId).abortSignal(AbortSignal.timeout(8_000)).maybeSingle();
        if (result.error) throw result.error;
        row = result.data;
      } else {
        const result = await executePostgresQuery<{ record: any }>('SELECT to_jsonb(library) AS record FROM public.user_image_library AS library WHERE user_id=$1 AND id=$2 LIMIT 1;', [userId, assetId]);
        if (!result) throw new Error('Image lookup unavailable');
        row = result.rows[0]?.record;
      }
      if (!row) { this.recordCache.delete(assetId); return null; }
      const record = this.mapDatabaseRow(row);
      if (record.userId !== userId) return null;
      this.recordCache.put(assetId, record);
      return record;
    });
  }

  private async queryAuthoritativePage(
    userId: string,
    options: ImageLibraryFilterOptions
  ): Promise<ImageLibraryPage | null> {
    const scope = libraryScope(userId, options);
    const cursor = decodeLibraryCursor(options.cursor, options.includeSummary === false ? scope : undefined);
    const args = {
      p_user_id: userId,
      p_limit: options.limit ?? 48,
      p_cursor_created_at: cursor?.createdAt,
      p_cursor_id: cursor?.id,
      p_session_id: options.sessionId && options.sessionId !== 'all' ? options.sessionId : undefined,
      p_aspect_ratio: options.aspectRatio && options.aspectRatio !== 'all' ? options.aspectRatio : undefined,
      p_is_favorite: options.isFavorite,
      p_search: options.search?.trim() || undefined,
      p_sort: options.sort === 'oldest' ? 'oldest' as const : 'newest' as const
    };

    try {
      let payload: any = null;
      if (options.includeSummary === false) {
        if (isSupabaseAdminConfigured()) {
          const { data, error } = await getSupabaseAdmin().rpc('fn_page_user_image_library', { ...args, p_before: cursor?.before || false }).abortSignal(AbortSignal.timeout(8_000));
          if (error) throw error;
          payload = data;
        } else if (isSupabaseConfigured()) {
          const result = await executePostgresQuery<{ result: any }>('SELECT public.fn_page_user_image_library($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS result;',
            [args.p_user_id,args.p_limit,args.p_cursor_created_at ?? null,args.p_cursor_id ?? null,args.p_session_id ?? null,args.p_aspect_ratio ?? null,args.p_is_favorite ?? null,args.p_search ?? null,args.p_sort,cursor?.before || false]);
          payload = result?.rows[0]?.result;
        }
        if (!payload || !Array.isArray(payload.records) || payload.records.length > (options.limit ?? 48)) return null;
        const records = payload.records.map((row: any) => this.mapDatabaseRow(row)) as ImageGenerationRecord[];
        const first = records[0], last = records.at(-1);
        const firstAnchor = first || cursor, lastAnchor = last || cursor;
        const next = cursor?.before ? Boolean(cursor) : payload.hasMore === true;
        const previous = cursor?.before ? payload.hasMore === true : Boolean(cursor);
        return { records, totalCount: null, stats: null, availableSessions: [],
          nextCursor: next && lastAnchor ? encodeLibraryCursor({ createdAt: lastAnchor.createdAt, id: lastAnchor.id, scope }) : null,
          previousCursor: previous && firstAnchor ? encodeLibraryCursor({ createdAt: firstAnchor.createdAt, id: firstAnchor.id, before: true, scope }) : null };
      } else if (isSupabaseAdminConfigured()) {
        const { data, error } = await getSupabaseAdmin().rpc('fn_query_user_image_library', args);
        if (error) throw error;
        payload = data;
      } else if (isSupabaseConfigured()) {
        const result = await executePostgresQuery<{ result: any }>(
          'SELECT public.fn_query_user_image_library($1,$2,$3,$4,$5,$6,$7,$8,$9) AS result;',
          [
            args.p_user_id,
            args.p_limit,
            args.p_cursor_created_at ?? null,
            args.p_cursor_id ?? null,
            args.p_session_id ?? null,
            args.p_aspect_ratio ?? null,
            args.p_is_favorite ?? null,
            args.p_search ?? null,
            args.p_sort
          ]
        );
        payload = result?.rows[0]?.result ?? null;
      }

      if (!payload || !Array.isArray(payload.records)) return null;
      const records = payload.records.map((row: any) => this.mapDatabaseRow(row));
      const nextCursor = payload.hasMore && payload.nextCursorCreatedAt && payload.nextCursorId
        ? this.encodeCursor(payload.nextCursorCreatedAt, payload.nextCursorId)
        : null;
      return {
        records,
        totalCount: Number(payload.totalCount) || 0,
        stats: {
          totalImages: Number(payload.stats?.totalImages) || 0,
          totalBytes: Number(payload.stats?.totalBytes) || 0,
          favoriteCount: Number(payload.stats?.favoriteCount) || 0,
          sessionCount: Number(payload.stats?.sessionCount) || 0,
          aspectRatios: payload.stats?.aspectRatios || {}
        },
        availableSessions: Array.isArray(payload.availableSessions)
          ? payload.availableSessions.map((session: any) => ({
              sessionId: String(session.sessionId),
              count: Number(session.count) || 0
            }))
          : [],
        nextCursor
      };
    } catch (error: any) {
      console.warn(`[BroccoliImageLibraryBuffer] Authoritative page query failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Deletes a single asset from L1 buffer, PostgreSQL, and Cloudflare R2.
   */
  public async deleteAsset(userId: string, assetId: string): Promise<boolean> {
    return (await this.batchDeleteAssets(userId, [assetId])) === 1;
  }

  /**
   * Batch deletes multiple assets in a single network roundtrip.
   */
  public async batchDeleteAssets(userId: string, assetIds: string[]): Promise<number> {
    const uniqueIds = [...new Set(assetIds.filter((id) => typeof id === 'string' && id.length > 0))].slice(0, 500);
    if (uniqueIds.length === 0) return 0;
    if (isSupabaseConfigured()) await this.flushAssetsDurably(userId, uniqueIds);

    const localR2Keys = uniqueIds.flatMap((id) => {
      const item = this.l1Table.get(id);
      return item?.userId === userId && item.r2Key ? [item.r2Key] : [];
    });
    const unpersistedIds = uniqueIds.filter((id) => this.writeQueue.get(id)?.userId === userId && !this.persistedAssetIds.has(id));
    const persistedIds = uniqueIds.filter((id) => !unpersistedIds.includes(id));
    let affectedIds: string[] = [...unpersistedIds];
    let r2KeysToDelete: string[] = unpersistedIds.flatMap((id) => {
      const record = this.l1Table.get(id);
      return record?.r2Key ? [record.r2Key] : [];
    });

    try {
      if (persistedIds.length === 0) {
        // Every selected image still lives in the write buffer; local eviction prevents
        // it from ever being inserted by a later flush.
      } else if (isSupabaseAdminConfigured()) {
        const { data, error } = await getSupabaseAdmin().rpc('fn_batch_mutate_image_library', {
          p_user_id: userId,
          p_asset_ids: persistedIds,
          p_action: 'delete'
        });
        if (error) throw error;
        const result = data as any;
        affectedIds.push(...(Array.isArray(result?.assetIds) ? result.assetIds.map(String) : []));
        r2KeysToDelete.push(...(Array.isArray(result?.r2Keys) ? result.r2Keys.map(String) : []));
      } else if (isSupabaseConfigured()) {
        const result = await executePostgresQuery<{ result: any }>(
          'SELECT public.fn_batch_mutate_image_library($1,$2,$3,$4) AS result;',
          [userId, persistedIds, 'delete', null]
        );
        const payload = result?.rows[0]?.result;
        affectedIds.push(...(Array.isArray(payload?.assetIds) ? payload.assetIds.map(String) : []));
        r2KeysToDelete.push(...(Array.isArray(payload?.r2Keys) ? payload.r2Keys.map(String) : []));
      } else {
        affectedIds = uniqueIds.filter((id) => this.l1Table.get(id)?.userId === userId);
        r2KeysToDelete = localR2Keys;
      }
    } catch (dbErr: any) {
      console.warn(`[BroccoliImageLibraryBuffer] Batch DB delete error: ${dbErr.message}`);
      return 0;
    }

    // Evict only records confirmed deleted by the authoritative mutation.
    for (const id of affectedIds) {
      this.recordCache.delete(id);
      this.removeQueuedRecord(id);
    }
    this.invalidateUserQueryCache(userId);

    // 3. Batched delete from Cloudflare R2
    if (r2KeysToDelete.length > 0) {
      try {
        const r2Manager = GalxUnifiedR2StorageManager.getInstance();
        const deletion = await r2Manager.deleteObjects('images', r2KeysToDelete);
        if (deletion.deleted.length > 0 && isSupabaseAdminConfigured()) {
          const { error } = await getSupabaseAdmin().rpc('fn_ack_image_library_gc', {
            p_r2_keys: deletion.deleted
          });
          if (error) throw error;
        } else if (deletion.deleted.length > 0 && isSupabaseConfigured()) {
          await executePostgresQuery('SELECT public.fn_ack_image_library_gc($1);', [deletion.deleted]);
        }
        if (deletion.errors.length > 0) {
          console.warn(`[BroccoliImageLibraryBuffer] ${deletion.errors.length} R2 object deletion(s) remain queued for retry.`);
        }
      } catch (r2Err: any) {
        console.warn(`[BroccoliImageLibraryBuffer] Batch R2 delete deferred to durable GC outbox: ${r2Err.message}`);
      }
    }

    return affectedIds.length;
  }

  /** Sets favorite state for up to 500 assets in one database hop. */
  public async batchSetFavorite(userId: string, assetIds: string[], isFavorite: boolean): Promise<number> {
    const uniqueIds = [...new Set(assetIds.filter((id) => typeof id === 'string' && id.length > 0))].slice(0, 500);
    if (uniqueIds.length === 0) return 0;
    if (isSupabaseConfigured()) await this.flushAssetsDurably(userId, uniqueIds);

    const pendingIds = uniqueIds.filter((id) => this.writeQueue.get(id)?.userId === userId);
    const persistedIds = uniqueIds.filter((id) => !pendingIds.includes(id));
    const pendingPrevious = new Map(pendingIds.map((id) => [id, this.l1Table.get(id)] as const));
    const affectedIds: string[] = [...pendingIds];
    for (const id of pendingIds) this.enqueueMutation(userId, id, { isFavorite });
    try {
      if (persistedIds.length === 0) {
        // Pending records are coalesced into the existing upsert batch.
      } else if (isSupabaseAdminConfigured()) {
        const { data, error } = await getSupabaseAdmin().rpc('fn_batch_mutate_image_library', {
          p_user_id: userId,
          p_asset_ids: persistedIds,
          p_action: 'favorite',
          p_is_favorite: isFavorite
        });
        if (error) throw error;
        affectedIds.push(...(Array.isArray((data as any)?.assetIds) ? (data as any).assetIds.map(String) : []));
      } else if (isSupabaseConfigured()) {
        const result = await executePostgresQuery<{ result: any }>(
          'SELECT public.fn_batch_mutate_image_library($1,$2,$3,$4) AS result;',
          [userId, persistedIds, 'favorite', isFavorite]
        );
        const payload = result?.rows[0]?.result;
        affectedIds.push(...(Array.isArray(payload?.assetIds) ? payload.assetIds.map(String) : []));
      } else {
        affectedIds.push(...persistedIds.filter((id) => this.l1Table.get(id)?.userId === userId));
      }
    } catch (dbErr: any) {
      console.warn(`[BroccoliImageLibraryBuffer] Batch favorite error: ${dbErr.message}`);
      for (const [id, previous] of pendingPrevious) {
        if (previous) this.enqueueMutation(userId, id, { isFavorite: previous.isFavorite });
      }
      return 0;
    }

    const updatedAt = new Date().toISOString();
    for (const id of affectedIds) {
      const record = this.l1Table.get(id);
      if (record?.userId === userId) this.recordCache.put(id, { ...record, isFavorite, updatedAt });
    }
    this.invalidateUserQueryCache(userId);
    return affectedIds.length;
  }

  /** Sets visibility state (public, unlisted, private) for up to 500 assets in one database hop. */
  public async batchSetVisibility(
    userId: string,
    assetIds: string[],
    visibility: 'public' | 'unlisted' | 'private'
  ): Promise<number> {
    const uniqueIds = [...new Set(assetIds.filter((id) => typeof id === 'string' && id.length > 0))].slice(0, 500);
    if (uniqueIds.length === 0) return 0;
    if (isSupabaseConfigured()) await this.flushAssetsDurably(userId, uniqueIds);

    const isPublic = visibility === 'public';
    const pendingIds = uniqueIds.filter((id) => this.writeQueue.get(id)?.userId === userId);
    const persistedIds = uniqueIds.filter((id) => !pendingIds.includes(id));
    const pendingPrevious = new Map(pendingIds.map((id) => [id, this.l1Table.get(id)] as const));
    const affectedIds: string[] = [...pendingIds];
    for (const id of pendingIds) this.enqueueMutation(userId, id, { visibility, isPublic } as any);
    try {
      if (persistedIds.length === 0) {
        // Pending records are coalesced into the existing upsert batch.
      } else if (isSupabaseAdminConfigured()) {
        const { data, error } = await getSupabaseAdmin().rpc('fn_batch_mutate_image_library', {
          p_user_id: userId,
          p_asset_ids: persistedIds,
          p_action: 'visibility',
          p_is_favorite: null as any,
          p_visibility: visibility
        });
        if (error) throw error;
        affectedIds.push(...(Array.isArray((data as any)?.assetIds) ? (data as any).assetIds.map(String) : []));
      } else if (isSupabaseConfigured()) {
        const result = await executePostgresQuery<{ result: any }>(
          'SELECT public.fn_batch_mutate_image_library($1,$2,$3,$4,$5) AS result;',
          [userId, persistedIds, 'visibility', null, visibility]
        );
        const payload = result?.rows[0]?.result;
        affectedIds.push(...(Array.isArray(payload?.assetIds) ? payload.assetIds.map(String) : []));
      } else {
        affectedIds.push(...persistedIds.filter((id) => this.l1Table.get(id)?.userId === userId));
      }
    } catch (dbErr: any) {
      console.warn(`[BroccoliImageLibraryBuffer] Batch visibility error: ${dbErr.message}`);
      for (const [id, previous] of pendingPrevious) {
        if (previous) this.enqueueMutation(userId, id, { visibility: previous.visibility, isPublic: previous.isPublic } as any);
      }
      return 0;
    }

    const updatedAt = new Date().toISOString();
    for (const id of affectedIds) {
      const record = this.l1Table.get(id);
      if (record?.userId === userId) this.recordCache.put(id, { ...record, visibility, isPublic, updatedAt });
    }
    this.invalidateUserQueryCache(userId);
    return affectedIds.length;
  }

  /**
   * Returns live telemetry and cost savings metrics for the buffer.
   */
  public getBufferMetrics(): BroccoliBufferMetrics {
    return {
      queueDepth: this.writeQueue.size,
      totalBufferedWrites: this.totalBufferedWrites,
      totalFlushesExecuted: this.totalFlushesExecuted,
      totalDatabaseHopsSaved: this.totalDatabaseHopsSaved,
      estimatedEgressBytesSaved: this.estimatedEgressBytesSaved,
      lastFlushTimestampMs: this.lastFlushTimestampMs,
      l1CachedRecordCount: this.recordCache.size
    };
  }

  /** Statistics for unconfigured local fixtures only. */
  private computeStats(records: readonly ImageGenerationRecord[] | ImageGenerationRecord[]): ImageLibraryStats {
    let totalBytes = 0;
    let favoriteCount = 0;
    const sessionSet = new Set<string>();
    const aspectRatios: Record<string, number> = {};

    for (const r of records) {
      totalBytes += r.sizeBytes || 0;
      if (r.isFavorite) favoriteCount++;
      if (r.sessionId) sessionSet.add(r.sessionId);

      const ratio = r.aspectRatio || '1:1';
      aspectRatios[ratio] = (aspectRatios[ratio] || 0) + 1;
    }

    return {
      totalImages: records.length,
      totalBytes,
      favoriteCount,
      sessionCount: sessionSet.size,
      aspectRatios
    };
  }

  private ensureDebounceTimer(): void {
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        void this.flushBatch();
      }, this.flushIntervalMs);
      this.flushTimer.unref?.();
    }
  }

  private mapDatabaseRow(row: any): ImageGenerationRecord {
    return {
      id: String(row.id),
      generationId: typeof row.generation_id === 'string' ? row.generation_id : undefined,
      userId: String(row.user_id),
      sessionId: String(row.session_id || 'default'),
      status: row.status as ImageGenerationRecord['status'],
      prompt: String(row.prompt || ''),
      revisedPrompt: row.revised_prompt ?? null,
      model: String(row.model || 'unknown'),
      aspectRatio: String(row.aspect_ratio || '1:1'),
      dimensions: String(row.dimensions || '1024x1024'),
      quality: String(row.quality || 'standard'),
      publicUrl: String(row.public_url || ''),
      r2Key: String(row.r2_key || ''),
      contentType: String(row.content_type || 'image/png'),
      sizeBytes: Number(row.size_bytes) || 0,
      sha256: String(row.sha256 || ''),
      lqip: row.lqip ?? null,
      seed: row.seed ?? null,
      latencyMs: Number(row.latency_ms) || 0,
      costUsd: Number(row.cost_usd) || 0,
      isFavorite: Boolean(row.is_favorite),
      isPublic: row.is_public !== undefined ? Boolean(row.is_public) : true,
      visibility: (row.visibility as 'public' | 'unlisted' | 'private') || 'public',
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private encodeCursor(createdAt: string, id: string): string {
    return Buffer.from(JSON.stringify({ createdAt, id }), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor?: string): { createdAt: string; id: string } | null {
    return decodeLibraryCursor(cursor);
  }

  private queueRecord(record: ImageGenerationRecord): void {
    const bytes = Buffer.byteLength(JSON.stringify(record));
    const nextBytes = this.queuedBytes - (this.queuedSizes.get(record.id) || 0) + bytes;
    if ((!this.writeQueue.has(record.id) && this.writeQueue.size >= 128) || nextBytes > 16 * 1024 * 1024) throw new Error('Image write capacity temporarily unavailable');
    this.writeQueue.set(record.id, record); this.queuedSizes.set(record.id, bytes); this.queuedBytes = nextBytes;
  }

  private removeQueuedRecord(id: string): void {
    this.queuedBytes -= this.queuedSizes.get(id) || 0;
    this.queuedSizes.delete(id); this.writeQueue.delete(id); this.persistedAssetIds.delete(id);
  }

  private invalidateUserQueryCache(userId: string): void {
    this.mutationEpoch++;
    const prefix = `${userId}\u0000`;
    this.queryPageCache.deleteWhere(key => key.startsWith(prefix));
  }
}
