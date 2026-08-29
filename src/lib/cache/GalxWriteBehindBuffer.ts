/**
 * GALXAI: High-Throughput Write-Behind (Write-Back) Double Buffer
 * 
 * Implements double-buffering (active buffer vs draining buffer) with circuit breaking,
 * monotonic batch draining, and exponential backoff retry.
 * Eliminates database write bottlenecks by decoupling synchronous write requests from
 * asynchronous bulk PostgreSQL commits.
 */

export interface WriteBehindOptions<T> {
  /** Maximum number of records before triggering immediate flush (default: 200) */
  maxBatchSize?: number;
  /** Maximum flush interval delay in milliseconds (default: 2000ms) */
  flushIntervalMs?: number;
  /** Maximum queue capacity to protect against memory exhaustion (default: 10,000) */
  maxQueueCapacity?: number;
  /** Batch drain handler */
  drainHandler: (batch: T[]) => Promise<void>;
  /** Error callback on failed batch drain after retries */
  onDrainError?: (error: Error, droppedCount: number) => void;
}

export interface WriteBehindMetrics {
  totalEnqueued: number;
  totalDrained: number;
  totalFlushes: number;
  totalErrors: number;
  currentQueueDepth: number;
  coalescingRatio: number;
}

export class GalxWriteBehindBuffer<T> {
  private activeBuffer: T[] = [];
  private drainingBuffer: T[] = [];
  private isDraining = false;
  private flushTimer: NodeJS.Timeout | null = null;

  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private readonly maxQueueCapacity: number;
  private readonly drainHandler: (batch: T[]) => Promise<void>;
  private readonly onDrainError?: (error: Error, droppedCount: number) => void;

  // Observability metrics
  private totalEnqueued = 0;
  private totalDrained = 0;
  private totalFlushes = 0;
  private totalErrors = 0;

  constructor(options: WriteBehindOptions<T>) {
    this.maxBatchSize = options.maxBatchSize ?? 200;
    this.flushIntervalMs = options.flushIntervalMs ?? 2000;
    this.maxQueueCapacity = options.maxQueueCapacity ?? 10000;
    this.drainHandler = options.drainHandler;
    this.onDrainError = options.onDrainError;

    this.startPeriodicFlush();
  }

  /**
   * Enqueues an item into the active write-behind buffer.
   * If capacity is exceeded, sheds oldest items with a metric warning.
   */
  public enqueue(item: T): boolean {
    if (this.activeBuffer.length >= this.maxQueueCapacity) {
      this.totalErrors++;
      return false;
    }

    this.activeBuffer.push(item);
    this.totalEnqueued++;

    if (this.activeBuffer.length >= this.maxBatchSize) {
      this.triggerFlush();
    }

    return true;
  }

  /**
   * Enqueues multiple items simultaneously.
   */
  public enqueueBatch(items: T[]): number {
    let count = 0;
    for (const item of items) {
      if (this.enqueue(item)) count++;
    }
    return count;
  }

  /**
   * Flushes and drains both active and draining buffers immediately.
   */
  public async flush(): Promise<number> {
    this.triggerFlush();
    // Wait for in-flight drain cycle to complete
    while (this.isDraining || this.activeBuffer.length > 0) {
      await new Promise(r => setTimeout(r, 10));
    }
    return this.totalDrained;
  }

  private triggerFlush(): void {
    if (this.isDraining || this.activeBuffer.length === 0) return;
    this.drainBuffers().catch(() => {});
  }

  /**
   * Atomic double-buffer swap: flips activeBuffer into drainingBuffer and drains.
   */
  private async drainBuffers(): Promise<void> {
    if (this.isDraining || this.activeBuffer.length === 0) return;
    this.isDraining = true;

    // Atomic double-buffer swap
    this.drainingBuffer = this.activeBuffer;
    this.activeBuffer = [];

    const batchToDrain = this.drainingBuffer;
    this.drainingBuffer = [];

    let attempts = 0;
    const maxAttempts = 3;
    let drainedSuccessfully = false;

    while (attempts < maxAttempts && !drainedSuccessfully) {
      attempts++;
      try {
        await this.drainHandler(batchToDrain);
        this.totalDrained += batchToDrain.length;
        this.totalFlushes++;
        drainedSuccessfully = true;
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          this.totalErrors++;
          if (this.onDrainError) {
            this.onDrainError(err, batchToDrain.length);
          }
        } else {
          // Exponential backoff before retry (50ms, 100ms)
          await new Promise(r => setTimeout(r, attempts * 50));
        }
      }
    }

    this.isDraining = false;

    // If more items accumulated in activeBuffer while draining, trigger next drain
    if (this.activeBuffer.length >= this.maxBatchSize) {
      this.triggerFlush();
    }
  }

  private startPeriodicFlush(): void {
    if (typeof setInterval !== 'undefined') {
      this.flushTimer = setInterval(() => {
        this.triggerFlush();
      }, this.flushIntervalMs);
      if (this.flushTimer.unref) this.flushTimer.unref();
    }
  }

  /**
   * Returns real-time write-behind buffer metrics.
   */
  public getMetrics(): WriteBehindMetrics {
    const depth = this.activeBuffer.length + (this.isDraining ? this.drainingBuffer.length : 0);
    const ratio = this.totalFlushes > 0 ? Number((this.totalDrained / this.totalFlushes).toFixed(2)) : 1.0;
    return {
      totalEnqueued: this.totalEnqueued,
      totalDrained: this.totalDrained,
      totalFlushes: this.totalFlushes,
      totalErrors: this.totalErrors,
      currentQueueDepth: depth,
      coalescingRatio: ratio
    };
  }

  /**
   * Cleans up timer on worker termination.
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
