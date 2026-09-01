/**
 * GALXAI: Vectorized Ping-Pong Sync Engine & Lockless Batch Buffer
 * 
 * Implements lockless dual-buffer ping-pong rotation for sub-millisecond
 * ingestion and non-blocking asynchronous PostgreSQL Vectorized Array Unnest flushes.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';

export interface StreamSettlementRecord {
  leaseId: string;
  userId: string;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  idempotencyKey: string;
  timestampMs: number;
}

export class GalxVectorizedSyncEngine {
  private static instance: GalxVectorizedSyncEngine;
  
  // Dual Ping-Pong Buffers
  private bufferA: StreamSettlementRecord[] = [];
  private bufferB: StreamSettlementRecord[] = [];
  private activeBufferIndex: 0 | 1 = 0; // 0 = A, 1 = B

  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private readonly maxBatchSize = 60;
  private readonly flushIntervalMs = 50;

  // Metrics
  private totalSettlementsEnqueued = 0;
  private totalSettlementsFlushed = 0;
  private totalBatchesDispatched = 0;

  private constructor() {
    this.startPeriodicFlush();
  }

  public static getInstance(): GalxVectorizedSyncEngine {
    if (!GalxVectorizedSyncEngine.instance) {
      GalxVectorizedSyncEngine.instance = new GalxVectorizedSyncEngine();
    }
    return GalxVectorizedSyncEngine.instance;
  }

  /**
   * Lockless settlement enqueue into the currently active ping-pong buffer
   */
  public enqueueSettlement(record: StreamSettlementRecord): void {
    this.totalSettlementsEnqueued++;
    if (this.activeBufferIndex === 0) {
      this.bufferA.push(record);
      if (this.bufferA.length >= this.maxBatchSize && !this.isFlushing) {
        this.flushAsync();
      }
    } else {
      this.bufferB.push(record);
      if (this.bufferB.length >= this.maxBatchSize && !this.isFlushing) {
        this.flushAsync();
      }
    }
  }

  private startPeriodicFlush(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      if (this.getPendingBufferSize() > 0 && !this.isFlushing) {
        this.flushAsync();
      }
    }, this.flushIntervalMs);
    if (this.flushTimer && typeof this.flushTimer.unref === 'function') {
      this.flushTimer.unref();
    }
  }

  /**
   * Atomically swaps ping-pong buffers and flushes the draining buffer via RPC
   */
  public async flushAsync(): Promise<number> {
    if (this.isFlushing) return 0;
    this.isFlushing = true;

    // 1. Atomic Ping-Pong Swap
    let batchToFlush: StreamSettlementRecord[];
    if (this.activeBufferIndex === 0) {
      batchToFlush = this.bufferA;
      this.bufferA = [];
      this.activeBufferIndex = 1; // Direct new traffic to Buffer B
    } else {
      batchToFlush = this.bufferB;
      this.bufferB = [];
      this.activeBufferIndex = 0; // Direct new traffic to Buffer A
    }

    if (batchToFlush.length === 0) {
      this.isFlushing = false;
      return 0;
    }

    this.totalBatchesDispatched++;
    this.totalSettlementsFlushed += batchToFlush.length;

    // 2. Dispatch Vectorized Multi-Row Array Unnest RPC
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin() as any;
        const { error } = await supabase.rpc('fn_vectorized_batch_settle_stream_leases_v3', {
          p_lease_ids: batchToFlush.map(b => b.leaseId),
          p_user_ids: batchToFlush.map(b => b.userId),
          p_model_ids: batchToFlush.map(b => b.modelId),
          p_prompt_tokens: batchToFlush.map(b => b.promptTokens),
          p_completion_tokens: batchToFlush.map(b => b.completionTokens),
          p_reasoning_tokens: batchToFlush.map(b => b.reasoningTokens),
          p_idempotency_keys: batchToFlush.map(b => b.idempotencyKey)
        });

        if (error) throw error;
      } catch (err) {
        console.warn('[GalxVectorizedSyncEngine] Vectorized batch flush fallback, retaining records:', err);
        // Re-inject failed batch into current active buffer
        if (this.activeBufferIndex === 0) {
          this.bufferA.push(...batchToFlush);
        } else {
          this.bufferB.push(...batchToFlush);
        }
      }
    }

    this.isFlushing = false;
    return batchToFlush.length;
  }

  public getPendingBufferSize(): number {
    return this.bufferA.length + this.bufferB.length;
  }

  public getStats() {
    return {
      activeBuffer: this.activeBufferIndex === 0 ? 'A' : 'B',
      pendingBufferASize: this.bufferA.length,
      pendingBufferBSize: this.bufferB.length,
      totalEnqueued: this.totalSettlementsEnqueued,
      totalFlushed: this.totalSettlementsFlushed,
      totalBatches: this.totalBatchesDispatched
    };
  }
}

export const vectorizedSyncEngine = GalxVectorizedSyncEngine.getInstance();
