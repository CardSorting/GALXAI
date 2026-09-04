/**
 * @file ShuffleShardedQueue.ts
 * @description Kubernetes API Priority & Fairness (APF) + AWS Route 53 Shuffle-Sharded Queue.
 * Uses hash permutations to isolate abusive tenants into virtual queue subsets,
 * combined with Deficit Round-Robin scheduling and LIFO-under-overload mode.
 */

import { FastFnv1a } from './FastFnv1a';
import { ClientRequest, QueueDiscipline, ShuffleShardConfig, TenantConfig } from './types';
import { RingBufferDeque } from './RingBufferDeque';

interface VirtualQueue {
  id: number;
  deque: RingBufferDeque<ClientRequest>;
  deficit: number;
  quantum: number;
  totalEnqueued: number;
  totalAged: number;
}

export class ShuffleShardedQueue {
  private readonly config: ShuffleShardConfig;
  private readonly queues: VirtualQueue[] = [];
  private currentQueueIndex = 0;
  private totalEnqueuedCount = 0;
  private queueDiscipline: QueueDiscipline = 'fifo';

  constructor(config: Partial<ShuffleShardConfig> = {}) {
    this.config = {
      totalVirtualQueues: config.totalVirtualQueues ?? 32,
      queuesPerTenant: config.queuesPerTenant ?? 4,
      maxDepthPerQueue: config.maxDepthPerQueue ?? 150,
      overloadSojournThresholdMs: config.overloadSojournThresholdMs ?? 400
    };

    for (let i = 0; i < this.config.totalVirtualQueues; i++) {
      this.queues.push({
        id: i,
        deque: new RingBufferDeque<ClientRequest>(64, this.config.maxDepthPerQueue),
        deficit: 0,
        quantum: 10,
        totalEnqueued: 0,
        totalAged: 0
      });
    }
  }

  /**
   * Hashes a tenantId into k distinct virtual queue indices using Fast FNV-1a (sub-nanosecond).
   * C(32, 4) = 35,960 unique virtual queue combinations.
   */
  public getTenantQueueIndices(tenantId: string): number[] {
    return FastFnv1a.getShuffleIndices(
      tenantId,
      this.config.queuesPerTenant,
      this.config.totalVirtualQueues
    );
  }

  /**
   * Enqueues request to the shortest queue among the tenant's shuffle-sharded subset (JSQ).
   */
  public enqueue(req: ClientRequest): { success: boolean; queueId?: number; reason?: string; retryAfterSec?: number } {
    const candidateIndices = this.getTenantQueueIndices(req.tenantId);

    // Join-the-Shortest-Queue (JSQ) across the tenant's shard subset
    let bestQueue: VirtualQueue | null = null;
    let minDepth = Infinity;

    for (const idx of candidateIndices) {
      const q = this.queues[idx];
      if (q.deque.size < minDepth) {
        minDepth = q.deque.size;
        bestQueue = q;
      }
    }

    if (!bestQueue || bestQueue.deque.size >= this.config.maxDepthPerQueue) {
      // Overload shedding: all shuffle-sharded lanes for this tenant are saturated
      const retryAfterSec = Math.max(1, Math.ceil(minDepth / 20));
      return {
        success: false,
        reason: `All shuffle-sharded lanes saturated for tenant (min depth: ${minDepth})`,
        retryAfterSec
      };
    }

    // If client signal is already aborted, fail fast
    if (req.signal?.aborted) {
      return { success: false, reason: 'Request aborted by client context before enqueue' };
    }

    const pushed = bestQueue.deque.pushTail(req);
    if (!pushed) {
      return { success: false, reason: 'Queue ring buffer full' };
    }

    bestQueue.totalEnqueued++;
    this.totalEnqueuedCount++;

    return { success: true, queueId: bestQueue.id };
  }

  /**
   * Dequeue the next valid request using Deficit Round-Robin across virtual queues.
   * Automatically adapts between FIFO and LIFO (overload mode).
   */
  public dequeueNext(): { request: ClientRequest | null; droppedAgedCount: number; discipline: QueueDiscipline } {
    if (this.totalEnqueuedCount === 0) {
      return { request: null, droppedAgedCount: 0, discipline: this.queueDiscipline };
    }

    let droppedAged = 0;
    const now = Date.now();
    let checkedQueues = 0;

    while (checkedQueues < this.config.totalVirtualQueues && this.totalEnqueuedCount > 0) {
      const q = this.queues[this.currentQueueIndex];

      if (q.deque.size === 0) {
        q.deficit = 0;
        this.advanceQueue();
        checkedQueues++;
        continue;
      }

      // Dynamic Deficit Round-Robin allocation
      if (q.deficit <= 0) {
        q.deficit += q.quantum;
      }

      while (q.deque.size > 0 && q.deficit > 0) {
        // Evaluate head sojourn to detect overload
        const head = q.deque.peekHead();
        const headSojournMs = head ? now - head.enqueuedAtMs : 0;

        // Auto-switch to LIFO if queue sojourn exceeds overload threshold
        const useLifo = headSojournMs > this.config.overloadSojournThresholdMs;
        this.queueDiscipline = useLifo ? 'lifo_overload' : 'fifo';

        const candidate = useLifo ? q.deque.popTail() : q.deque.popHead();
        if (!candidate) break;

        this.totalEnqueuedCount--;
        q.deficit -= 1;

        // Active Queue Management (AQM) & Anti-Aging Deadline Checks
        const sojournMs = now - candidate.enqueuedAtMs;
        const isClientDead =
          candidate.isCancelled ||
          candidate.signal?.aborted ||
          sojournMs > candidate.deadlineMs;

        // Google SRE Deadline Budget Check:
        // If remaining budget < estimated execution time, drop early to avoid starting a doomed task
        const remainingBudgetMs = candidate.deadlineMs - sojournMs;
        const estimatedExecMs = candidate.estimatedExecutionMs ?? 40;
        const cannotFinishInTime = remainingBudgetMs < estimatedExecMs;

        if (isClientDead || cannotFinishInTime) {
          droppedAged++;
          q.totalAged++;
          if ((candidate as any)._onResolved) {
            (candidate as any)._onResolved({
              status: 'dropped_aged',
              queueLatencyMs: sojournMs,
              error: `Sojourn deadline exceeded (${candidate.deadlineMs}ms wait in queue)`
            });
          }
          // Stale/expired request discarded: DO NOT dispatch to upstream!
          continue;
        }

        // Successfully found healthy fresh request
        if (q.deficit <= 0 || q.deque.size === 0) {
          this.advanceQueue();
        }

        return { request: candidate, droppedAgedCount: droppedAged, discipline: this.queueDiscipline };
      }

      if (q.deque.size === 0) q.deficit = 0;
      this.advanceQueue();
      checkedQueues++;
    }

    return { request: null, droppedAgedCount: droppedAged, discipline: this.queueDiscipline };
  }

  private advanceQueue(): void {
    this.currentQueueIndex = (this.currentQueueIndex + 1) % this.config.totalVirtualQueues;
  }

  public getTotalQueued(): number {
    return this.totalEnqueuedCount;
  }

  public getQueueStats() {
    return {
      totalQueued: this.totalEnqueuedCount,
      totalQueues: this.queues.length,
      activeQueues: this.queues.filter((q) => q.deque.size > 0).length,
      maxObservedDepth: Math.max(...this.queues.map((q) => q.deque.size)),
      currentDiscipline: this.queueDiscipline
    };
  }
}
