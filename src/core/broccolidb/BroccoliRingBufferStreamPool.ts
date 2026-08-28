/**
 * GALXAI BroccoliDB High-Throughput Ring Buffer Stream Pool
 * 
 * Bounded, pre-allocated circular slot pool for same-thread stream ingestion:
 * 1. Pre-allocates fixed-capacity slot records (default 128 slots).
 * 2. Maintains circular head/tail pointers and explicit overwrite accounting.
 * 3. Returns snapshots so reused slots cannot mutate data held by consumers.
 */

import { BroccoliDbTable } from './broccolidb-table';

export interface StreamSlot {
  slotId: number;
  sequenceNumber: number;
  isOccupied: boolean;
  timestampMs: number;
  chunkSize: number;
  payload: string;
  anomalyScore: number;
  metadata?: Record<string, any>;
}

export class BroccoliRingBufferStreamPool {
  private static instance: BroccoliRingBufferStreamPool;
  private readonly slots: StreamSlot[];
  private readonly capacity: number;
  private headIndex = 0;
  private tailIndex = 0;
  private activeCount = 0;
  private totalEnqueued = 0;
  private totalDequeued = 0;
  private totalOverwritten = 0;

  public readonly poolAuditTable: BroccoliDbTable<{
    id: string;
    totalEnqueued: number;
    totalDequeued: number;
    totalOverwritten: number;
    timestampMs: number;
  }>;

  private constructor(capacity = 128) {
    if (!Number.isSafeInteger(capacity) || capacity <= 0) {
      throw new RangeError('Ring buffer capacity must be a positive safe integer.');
    }
    this.capacity = capacity;
    this.slots = new Array<StreamSlot>(this.capacity);
    for (let i = 0; i < this.capacity; i++) {
      this.slots[i] = {
        slotId: i,
        sequenceNumber: 0,
        isOccupied: false,
        timestampMs: 0,
        chunkSize: 0,
        payload: '',
        anomalyScore: 0,
      };
    }
    this.poolAuditTable = new BroccoliDbTable('ring_buffer_stream_pool_audit');
  }

  public static getInstance(capacity = 128): BroccoliRingBufferStreamPool {
    if (!BroccoliRingBufferStreamPool.instance) {
      BroccoliRingBufferStreamPool.instance = new BroccoliRingBufferStreamPool(capacity);
    }
    return BroccoliRingBufferStreamPool.instance;
  }

  /**
   * Creates an isolated pool. Prefer this for request- or stream-scoped ingestion;
   * getInstance() remains available for the process-wide telemetry pool.
   */
  public static create(capacity = 128): BroccoliRingBufferStreamPool {
    return new BroccoliRingBufferStreamPool(capacity);
  }

  /**
   * Enqueues a stream chunk into the circular ring buffer
   */
  public push(payload: string, anomalyScore = 0, metadata?: Record<string, any>): StreamSlot {
    if (typeof payload !== 'string') {
      throw new TypeError('Ring buffer payload must be a string.');
    }
    if (!Number.isFinite(anomalyScore)) {
      throw new RangeError('Ring buffer anomalyScore must be finite.');
    }

    const slot = this.slots[this.headIndex];
    if (slot.isOccupied) {
      this.totalOverwritten++;
      this.tailIndex = (this.tailIndex + 1) % this.capacity;
    } else {
      this.activeCount++;
    }

    slot.sequenceNumber = ++this.totalEnqueued;
    slot.isOccupied = true;
    slot.timestampMs = Date.now();
    slot.chunkSize = payload.length;
    slot.payload = payload;
    slot.anomalyScore = Math.max(0, Math.min(1, anomalyScore));
    slot.metadata = metadata;

    this.headIndex = (this.headIndex + 1) % this.capacity;
    return this.snapshot(slot);
  }

  /**
   * Dequeues the oldest available chunk from the ring buffer
   */
  public pop(): StreamSlot | null {
    const slot = this.slots[this.tailIndex];
    if (!slot.isOccupied) {
      return null;
    }

    const result = this.snapshot(slot);
    slot.isOccupied = false;
    slot.payload = '';
    slot.chunkSize = 0;
    slot.anomalyScore = 0;
    slot.metadata = undefined;
    this.activeCount--;
    this.totalDequeued++;
    this.tailIndex = (this.tailIndex + 1) % this.capacity;
    return result;
  }

  /**
   * Drains all currently active slots in chronological sequence
   */
  public drainAll(): StreamSlot[] {
    const active: StreamSlot[] = [];
    let curr = this.tailIndex;
    const countToDrain = this.activeCount;
    for (let i = 0; i < countToDrain; i++) {
      const slot = this.slots[curr];
      active.push(this.snapshot(slot));
      slot.isOccupied = false;
      slot.payload = '';
      slot.chunkSize = 0;
      slot.anomalyScore = 0;
      slot.metadata = undefined;
      this.totalDequeued++;
      curr = (curr + 1) % this.capacity;
    }
    this.activeCount = 0;
    this.tailIndex = this.headIndex;
    return active;
  }

  /**
   * Returns current buffer utilization statistics
   */
  public getStats(): {
    capacity: number;
    activeCount: number;
    totalEnqueued: number;
    totalDequeued: number;
    totalOverwritten: number;
    headIndex: number;
    tailIndex: number;
  } {
    return {
      capacity: this.capacity,
      activeCount: this.activeCount,
      totalEnqueued: this.totalEnqueued,
      totalDequeued: this.totalDequeued,
      totalOverwritten: this.totalOverwritten,
      headIndex: this.headIndex,
      tailIndex: this.tailIndex,
    };
  }

  public clear(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.slots[i].isOccupied = false;
      this.slots[i].payload = '';
      this.slots[i].sequenceNumber = 0;
    }
    this.headIndex = 0;
    this.tailIndex = 0;
    this.activeCount = 0;
    this.totalEnqueued = 0;
    this.totalDequeued = 0;
    this.totalOverwritten = 0;
    this.poolAuditTable.clear();
  }

  private snapshot(slot: StreamSlot): StreamSlot {
    return {
      ...slot,
      metadata: slot.metadata ? { ...slot.metadata } : undefined,
    };
  }
}
