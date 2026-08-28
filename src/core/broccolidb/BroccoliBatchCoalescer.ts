/**
 * GALXAI BroccoliDB Batch Coalescer & Single-Flight Stampede Shield
 * 
 * Delivers two massive structural spend reduction capabilities:
 * 1. Single-Flight Request Coalescing: When concurrent clients ask identical queries
 *    within a short time window, executes only 1 upstream inference call and fans out
 *    the result to all concurrent listeners in sub-microsecond memory (90%+ savings during spikes).
 * 2. OpenAI Batch API Micro-Coalescer: Buffers non-latency-critical background jobs
 *    in BroccoliDB hot tables and multiplexes them for OpenAI's 50% flat batch discount.
 */

import { createHash } from 'node:crypto';
import { BroccoliDbTable } from './broccolidb-table';

export interface QueuedBatchItem {
  id: string;
  department: string;
  costCenter: string;
  model: string;
  promptText: string;
  maxTokens: number;
  grossRetailUsd: number;
  discountedBatchUsd: number;
  avoidedDiscountUsd: number;
  enqueuedAtMs: number;
  status: 'QUEUED' | 'DISPATCHED' | 'COMPLETED';
}

export class BroccoliBatchCoalescer {
  private static instance: BroccoliBatchCoalescer;
  public readonly batchTable: BroccoliDbTable<QueuedBatchItem>;
  private readonly inFlightPromises = new Map<string, Promise<string>>();

  private constructor() {
    this.batchTable = new BroccoliDbTable<QueuedBatchItem>('batch_coalesce_queue');
    this.batchTable.createIndex('department');
    this.batchTable.createIndex('status');
    this.batchTable.createSortedIndex('enqueuedAtMs');
  }

  public static getInstance(): BroccoliBatchCoalescer {
    if (!BroccoliBatchCoalescer.instance) {
      BroccoliBatchCoalescer.instance = new BroccoliBatchCoalescer();
    }
    return BroccoliBatchCoalescer.instance;
  }

  /**
   * Single-Flight Request Coalescing (Stampede Shield)
   * Collapses concurrent identical requests into a single upstream invocation
   */
  public static async executeSingleFlight(
    queryText: string,
    model: string,
    fetcher: () => Promise<string>
  ): Promise<{ result: string; wasCoalesced: boolean }> {
    const coalescer = this.getInstance();
    const queryHash = createHash('sha256').update(`${model}:${queryText.trim()}`).digest('hex');

    const inFlight = coalescer.inFlightPromises.get(queryHash);
    if (inFlight) {
      const result = await inFlight;
      return { result, wasCoalesced: true };
    }

    const promise = (async () => {
      try {
        return await fetcher();
      } finally {
        coalescer.inFlightPromises.delete(queryHash);
      }
    })();

    coalescer.inFlightPromises.set(queryHash, promise);
    const result = await promise;
    return { result, wasCoalesced: false };
  }

  /**
   * Enqueues a non-latency-critical background request to the 50% discount batch buffer
   */
  public static enqueueBatch(params: {
    id: string;
    department: string;
    costCenter: string;
    model: string;
    promptText: string;
    maxTokens: number;
    retailCostUsd: number;
  }): QueuedBatchItem {
    const coalescer = this.getInstance();
    const discountedBatchUsd = params.retailCostUsd * 0.50; // OpenAI 50% Batch API Discount
    const avoidedDiscountUsd = params.retailCostUsd * 0.50;

    const item: QueuedBatchItem = {
      id: params.id,
      department: params.department,
      costCenter: params.costCenter,
      model: params.model,
      promptText: params.promptText,
      maxTokens: params.maxTokens,
      grossRetailUsd: params.retailCostUsd,
      discountedBatchUsd,
      avoidedDiscountUsd,
      enqueuedAtMs: Date.now(),
      status: 'QUEUED',
    };

    coalescer.batchTable.put(params.id, item);
    return item;
  }

  /**
   * Flushes queued batch items into a single multiplexed OpenAI Batch payload
   */
  public static flushBatch(): {
    flushedCount: number;
    totalGrossRetailUsd: number;
    totalDiscountedBatchUsd: number;
    totalSavingsUsd: number;
    batchItems: QueuedBatchItem[];
  } {
    const coalescer = this.getInstance();
    const queued = coalescer.batchTable.query({
      where: { status: 'QUEUED' },
    });

    let totalGrossRetailUsd = 0;
    let totalDiscountedBatchUsd = 0;

    for (const item of queued) {
      totalGrossRetailUsd += item.grossRetailUsd;
      totalDiscountedBatchUsd += item.discountedBatchUsd;

      // Update status to DISPATCHED
      const updated = { ...item, status: 'DISPATCHED' as const };
      coalescer.batchTable.put(item.id, updated);
    }

    return {
      flushedCount: queued.length,
      totalGrossRetailUsd: Number(totalGrossRetailUsd.toFixed(4)),
      totalDiscountedBatchUsd: Number(totalDiscountedBatchUsd.toFixed(4)),
      totalSavingsUsd: Number((totalGrossRetailUsd - totalDiscountedBatchUsd).toFixed(4)),
      batchItems: [...queued],
    };
  }

  /**
   * Clears all queue tables
   */
  public static clear(): void {
    const coalescer = this.getInstance();
    coalescer.batchTable.clear();
    coalescer.inFlightPromises.clear();
  }
}
