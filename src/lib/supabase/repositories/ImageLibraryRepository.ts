/**
 * GALXAI: User Visual Library & Request Content Repository
 *
 * Combines PostgreSQL (Supabase) as authoritative data ruler with
 * BroccoliDB as the high-velocity L1 in-memory write buffer and read shield.
 * Employs micro-batching to eliminate egress costs and database connection hops.
 */

import { getSupabaseAdmin, isSupabaseConfigured, isSupabaseAdminConfigured } from '../client';
import { executePostgresQuery } from '../../db/postgres';
import { BroccoliImageLibraryBuffer, type BroccoliBufferMetrics } from '../../../core/broccolidb/BroccoliImageLibraryBuffer';
import type {
  ImageGenerationRecord,
  ImageLibraryPage,
  ImageLibraryStats,
  ImageLibraryFilterOptions
} from '../../../core/contracts/GalxContracts';

export class ImageLibraryRepository {
  private static instance: ImageLibraryRepository;
  private readonly buffer: BroccoliImageLibraryBuffer;

  private constructor() {
    this.buffer = BroccoliImageLibraryBuffer.getInstance();
  }

  public static getInstance(): ImageLibraryRepository {
    if (!ImageLibraryRepository.instance) {
      ImageLibraryRepository.instance = new ImageLibraryRepository();
    }
    return ImageLibraryRepository.instance;
  }

  /**
   * Queries user visual library with microsecond L1 memory lookups,
   * rich search, facet filtering, and automated cold-start database warming.
   */
  public async getLibrary(
    userId: string,
    options: ImageLibraryFilterOptions = {}
  ): Promise<ImageLibraryPage> {
    return this.buffer.queryLibrary(userId, options);
  }

  /**
   * Retrieves a single visual asset by ID.
   */
  public async getAsset(userId: string, assetId: string): Promise<ImageGenerationRecord | null> {
    return this.buffer.getAsset(userId, assetId);
  }

  /**
   * Enqueues an image generation record into the BroccoliDB L1 buffer.
   * Immediately available for reads; flushed to PostgreSQL in micro-batches.
   */
  public enqueueRecord(record: ImageGenerationRecord): void {
    this.buffer.enqueueRecord(record);
  }

  /**
   * Enqueues multiple records into the buffer.
   */
  public enqueueBatch(records: ImageGenerationRecord[]): void {
    for (const record of records) {
      this.buffer.enqueueRecord(record);
    }
  }

  /**
   * Toggles the favorite status of an image asset.
   */
  public async toggleFavorite(
    userId: string,
    assetId: string,
    isFavorite: boolean
  ): Promise<ImageGenerationRecord | null> {
    const updated = this.buffer.enqueueMutation(userId, assetId, { isFavorite });
    if (updated) return updated;

    // If not in buffer, perform direct update in Supabase
    if (isSupabaseAdminConfigured()) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('user_image_library')
        .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
        .eq('id', assetId)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) {
        const record: ImageGenerationRecord = {
          id: data.id,
          userId: data.user_id,
          sessionId: data.session_id,
          status: data.status as any,
          prompt: data.prompt,
          revisedPrompt: data.revised_prompt,
          model: data.model,
          aspectRatio: data.aspect_ratio,
          dimensions: data.dimensions,
          quality: data.quality,
          publicUrl: data.public_url,
          r2Key: data.r2_key,
          contentType: data.content_type,
          sizeBytes: Number(data.size_bytes),
          sha256: data.sha256,
          lqip: data.lqip,
          seed: data.seed,
          latencyMs: data.latency_ms,
          costUsd: Number(data.cost_usd),
          isFavorite: Boolean(data.is_favorite),
          tags: data.tags || [],
          metadata: (data.metadata as Record<string, unknown>) || {},
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        this.buffer.l1Table.put(record.id, record);
        this.buffer.markPersisted(record.id);
        return record;
      }
    } else {
      try {
        await executePostgresQuery(
          'UPDATE public.user_image_library SET is_favorite = $1, updated_at = now() WHERE id = $2 AND user_id = $3;',
          [isFavorite, assetId, userId]
        );
      } catch (err: any) {
        console.warn(`[ImageLibraryRepository] Direct Postgres favorite update fallback: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Deletes a single image asset from L1 buffer, PostgreSQL, and Cloudflare R2.
   */
  public async deleteAsset(userId: string, assetId: string): Promise<boolean> {
    return this.buffer.deleteAsset(userId, assetId);
  }

  /**
   * Deletes multiple assets in an atomic batch.
   */
  public async batchDeleteAssets(userId: string, assetIds: string[]): Promise<number> {
    return this.buffer.batchDeleteAssets(userId, assetIds);
  }

  /** Sets favorite state for a selection in one set-based database operation. */
  public async batchSetFavorite(userId: string, assetIds: string[], isFavorite: boolean): Promise<number> {
    return this.buffer.batchSetFavorite(userId, assetIds, isFavorite);
  }

  /**
   * Obtains aggregate library statistics.
   */
  public async getLibraryStats(userId: string): Promise<ImageLibraryStats> {
    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_get_user_image_library_stats', {
          p_user_id: userId
        });

        if (!error && data) {
          const typed = data as any;
          return {
            totalImages: Number(typed.totalImages) || 0,
            totalBytes: Number(typed.totalBytes) || 0,
            favoriteCount: Number(typed.favoriteCount) || 0,
            sessionCount: Number(typed.sessionCount) || 0,
            aspectRatios: typed.aspectRatios || {}
          };
        }
      } catch (err: any) {
        console.warn(`[ImageLibraryRepository] Stats RPC fallback: ${err.message}`);
      }
    } else {
      try {
        const res = await executePostgresQuery<{ fn_get_user_image_library_stats: any }>(
          'SELECT public.fn_get_user_image_library_stats($1) AS fn_get_user_image_library_stats;',
          [userId]
        );
        const typed = res?.rows[0]?.fn_get_user_image_library_stats;
        if (typed) {
          return {
            totalImages: Number(typed.totalImages) || 0,
            totalBytes: Number(typed.totalBytes) || 0,
            favoriteCount: Number(typed.favoriteCount) || 0,
            sessionCount: Number(typed.sessionCount) || 0,
            aspectRatios: typed.aspectRatios || {}
          };
        }
      } catch (err: any) {
        console.warn(`[ImageLibraryRepository] Direct Postgres stats fallback: ${err.message}`);
      }
    }

    const { stats } = await this.buffer.queryLibrary(userId);
    return stats;
  }

  /**
   * Flushes all buffered writes synchronously.
   */
  public async flushSync(): Promise<number> {
    return this.buffer.flushSync();
  }

  /**
   * Retrieves buffer health, egress savings, and queue metrics.
   */
  public getBufferMetrics(): BroccoliBufferMetrics {
    return this.buffer.getBufferMetrics();
  }
}
