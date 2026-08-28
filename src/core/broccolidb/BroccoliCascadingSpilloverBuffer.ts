/**
 * GALXAI BroccoliDB Cascading Memory-to-Disk Spillover Buffer
 * 
 * Bounds partition-payload memory during large incident ingestion:
 * 1. Tracks UTF-8 payload bytes against a configurable 64MB default watermark.
 * 2. Evicts lower-salience payloads to mode-0600 files in a private temporary directory.
 * 3. Hydrates spilled payloads on demand and releases accounting/files on overwrite or clear.
 * Metadata and caller-owned source strings remain ordinary heap allocations, so this class
 * must not be described as a blanket OOM guarantee for the entire process.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BroccoliDbTable } from './broccolidb-table';

export interface SpilledPartition {
  partitionId: string;
  sequence: number;
  byteSize: number;
  isSpilledToTransientStore: boolean;
  salienceWeight: number; // 0.0 to 1.0
  inMemoryPayload?: string;
  transientStorageKey?: string;
  timestampMs: number;
}

export interface SpilloverBufferOptions {
  memoryThresholdBytes?: number;
  spillDirectory?: string;
}

export class BroccoliCascadingSpilloverBuffer {
  private static instance: BroccoliCascadingSpilloverBuffer;
  private readonly partitions: Map<string, SpilledPartition> = new Map();
  private readonly memoryThresholdBytes: number;
  private readonly spillDirectory: string;
  private currentInMemoryBytes = 0;
  private currentSpilledBytes = 0;

  public readonly spillAuditTable: BroccoliDbTable<{
    id: string;
    totalPartitions: number;
    spilledCount: number;
    currentMemoryMb: number;
    timestampMs: number;
  }>;

  private constructor(options: SpilloverBufferOptions | number = {}) {
    const normalizedOptions = typeof options === 'number'
      ? { memoryThresholdBytes: options }
      : options;
    const memoryThresholdBytes = normalizedOptions.memoryThresholdBytes ?? 64 * 1024 * 1024;
    if (!Number.isSafeInteger(memoryThresholdBytes) || memoryThresholdBytes <= 0) {
      throw new RangeError('Spillover memory threshold must be a positive safe integer.');
    }

    this.memoryThresholdBytes = memoryThresholdBytes;
    if (normalizedOptions.spillDirectory) {
      this.spillDirectory = normalizedOptions.spillDirectory;
      mkdirSync(this.spillDirectory, { recursive: true, mode: 0o700 });
    } else {
      this.spillDirectory = mkdtempSync(join(tmpdir(), 'galxai-broccoli-spill-'));
    }
    this.spillAuditTable = new BroccoliDbTable('cascading_spillover_audit');
    this.spillAuditTable.createIndex('spilledCount');
  }

  public static getInstance(memoryThresholdBytes = 64 * 1024 * 1024): BroccoliCascadingSpilloverBuffer {
    if (!BroccoliCascadingSpilloverBuffer.instance) {
      BroccoliCascadingSpilloverBuffer.instance = new BroccoliCascadingSpilloverBuffer(memoryThresholdBytes);
    }
    return BroccoliCascadingSpilloverBuffer.instance;
  }

  /** Creates an isolated spillover buffer with its own bounded state. */
  public static create(options: SpilloverBufferOptions | number = {}): BroccoliCascadingSpilloverBuffer {
    return new BroccoliCascadingSpilloverBuffer(options);
  }

  /**
   * Stores a partition with automatic RAM headroom protection & spillover
   */
  public storePartition(
    partitionId: string,
    sequence: number,
    payload: string,
    salienceWeight: number
  ): SpilledPartition {
    if (!partitionId) {
      throw new TypeError('partitionId must be a non-empty string.');
    }
    if (!Number.isSafeInteger(sequence) || sequence < 0) {
      throw new RangeError('sequence must be a non-negative safe integer.');
    }
    if (typeof payload !== 'string') {
      throw new TypeError('partition payload must be a string.');
    }
    if (!Number.isFinite(salienceWeight)) {
      throw new RangeError('salienceWeight must be finite.');
    }

    this.deletePartition(partitionId);

    const byteSize = Buffer.byteLength(payload, 'utf8');
    const normalizedSalience = Math.max(0, Math.min(1, salienceWeight));
    this.evictToFit(byteSize, normalizedSalience);
    const shouldSpill = byteSize > this.memoryThresholdBytes
      || this.currentInMemoryBytes + byteSize > this.memoryThresholdBytes;

    const partition: SpilledPartition = {
      partitionId,
      sequence,
      byteSize,
      isSpilledToTransientStore: shouldSpill,
      salienceWeight: normalizedSalience,
      timestampMs: Date.now(),
    };

    if (shouldSpill) {
      const storeKey = this.writeSpillFile(partitionId, sequence, payload);
      partition.transientStorageKey = storeKey;
      this.currentSpilledBytes += byteSize;
    } else {
      partition.inMemoryPayload = payload;
      this.currentInMemoryBytes += byteSize;
    }

    this.partitions.set(partitionId, partition);
    return { ...partition };
  }

  /**
   * Retrieves partition payload with transparent on-demand hydration
   */
  public getPartitionPayload(partitionId: string): string | null {
    const p = this.partitions.get(partitionId);
    if (!p) return null;

    if (p.inMemoryPayload !== undefined) {
      return p.inMemoryPayload;
    }

    if (p.transientStorageKey) {
      const spillPath = join(this.spillDirectory, p.transientStorageKey);
      try {
        return readFileSync(spillPath, 'utf8');
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Returns stats on memory and spillover distribution
   */
  public getStats(): {
    totalPartitions: number;
    inMemoryPartitions: number;
    spilledPartitions: number;
    inMemoryMb: number;
    thresholdMb: number;
    inMemoryBytes: number;
    spilledBytes: number;
    spillDirectory: string;
  } {
    let inMem = 0;
    let spilled = 0;
    for (const p of this.partitions.values()) {
      if (p.isSpilledToTransientStore) spilled++;
      else inMem++;
    }

    return {
      totalPartitions: this.partitions.size,
      inMemoryPartitions: inMem,
      spilledPartitions: spilled,
      inMemoryMb: Number((this.currentInMemoryBytes / (1024 * 1024)).toFixed(2)),
      thresholdMb: Number((this.memoryThresholdBytes / (1024 * 1024)).toFixed(2)),
      inMemoryBytes: this.currentInMemoryBytes,
      spilledBytes: this.currentSpilledBytes,
      spillDirectory: this.spillDirectory,
    };
  }

  public deletePartition(partitionId: string): boolean {
    const existing = this.partitions.get(partitionId);
    if (!existing) return false;

    if (existing.inMemoryPayload !== undefined) {
      this.currentInMemoryBytes = Math.max(0, this.currentInMemoryBytes - existing.byteSize);
    }
    if (existing.transientStorageKey) {
      this.deleteSpillFile(existing.transientStorageKey);
      this.currentSpilledBytes = Math.max(0, this.currentSpilledBytes - existing.byteSize);
    }
    this.partitions.delete(partitionId);
    return true;
  }

  public clear(): void {
    for (const partition of this.partitions.values()) {
      if (partition.transientStorageKey) {
        this.deleteSpillFile(partition.transientStorageKey);
      }
    }
    this.partitions.clear();
    this.currentInMemoryBytes = 0;
    this.currentSpilledBytes = 0;
    this.spillAuditTable.clear();
  }

  private evictToFit(incomingBytes: number, incomingSalience: number): void {
    if (incomingBytes > this.memoryThresholdBytes) return;
    if (this.currentInMemoryBytes + incomingBytes <= this.memoryThresholdBytes) return;

    const candidates = Array.from(this.partitions.values())
      .filter((partition) => partition.inMemoryPayload !== undefined)
      .sort((a, b) => {
        const salienceDelta = a.salienceWeight - b.salienceWeight;
        return salienceDelta !== 0 ? salienceDelta : a.sequence - b.sequence;
      });

    for (const candidate of candidates) {
      if (this.currentInMemoryBytes + incomingBytes <= this.memoryThresholdBytes) break;
      if (candidate.salienceWeight > incomingSalience) break;
      this.spillInMemoryPartition(candidate);
    }
  }

  private spillInMemoryPartition(partition: SpilledPartition): void {
    if (partition.inMemoryPayload === undefined) return;
    const storeKey = this.writeSpillFile(partition.partitionId, partition.sequence, partition.inMemoryPayload);
    partition.transientStorageKey = storeKey;
    partition.inMemoryPayload = undefined;
    partition.isSpilledToTransientStore = true;
    this.currentInMemoryBytes = Math.max(0, this.currentInMemoryBytes - partition.byteSize);
    this.currentSpilledBytes += partition.byteSize;
  }

  private writeSpillFile(partitionId: string, sequence: number, payload: string): string {
    const partitionHash = createHash('sha256').update(partitionId).digest('hex').slice(0, 24);
    const storeKey = `spill_${sequence}_${partitionHash}.data`;
    const finalPath = join(this.spillDirectory, storeKey);
    const temporaryPath = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(temporaryPath, payload, { encoding: 'utf8', mode: 0o600 });
    renameSync(temporaryPath, finalPath);
    return storeKey;
  }

  private deleteSpillFile(storeKey: string): void {
    const spillPath = join(this.spillDirectory, storeKey);
    try {
      if (existsSync(spillPath)) unlinkSync(spillPath);
    } catch {
      // Cleanup is best-effort; retrieval still fails closed if the file disappeared.
    }
  }
}
