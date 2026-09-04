/**
 * @file DeficitRoundRobinQueue.ts
 * @description Multi-Tenant Fair Queuing via Deficit Round Robin (DRR) with per-tenant queues,
 * priority quantum weights, active queue management (AQM), and deadline-based anti-aging drops.
 */

import { ClientRequest, PriorityTier, TenantConfig } from './types';

interface TenantQueueState {
  config: TenantConfig;
  queue: ClientRequest[];
  deficit: number;
}

export class DeficitRoundRobinQueue {
  private readonly tenantQueues: Map<string, TenantQueueState> = new Map();
  private activeTenantIds: string[] = [];
  private currentTenantIndex = 0;
  private readonly maxQueueDepthPerTenant: number;
  private totalEnqueuedCount = 0;

  constructor(maxQueueDepthPerTenant = 200) {
    this.maxQueueDepthPerTenant = maxQueueDepthPerTenant;
  }

  public registerTenant(config: TenantConfig): void {
    if (!this.tenantQueues.has(config.id)) {
      this.tenantQueues.set(config.id, {
        config,
        queue: [],
        deficit: 0
      });
      this.activeTenantIds.push(config.id);
    }
  }

  /**
   * Enqueue a request into the tenant's dedicated queue lane.
   * Returns false if the tenant's queue is saturated (overflow load shedding).
   */
  public enqueue(req: ClientRequest): { success: boolean; reason?: string; retryAfterSec?: number } {
    let state = this.tenantQueues.get(req.tenantId);
    if (!state) {
      // Auto-register default developer tier if unknown
      const defaultConfig: TenantConfig = {
        id: req.tenantId,
        tier: req.priorityTier,
        quantumWeight: req.priorityTier === 'enterprise' ? 20 : (req.priorityTier === 'developer' ? 10 : 4),
        maxBurstCapacity: 100,
        rateLimitPerSec: 50
      };
      this.registerTenant(defaultConfig);
      state = this.tenantQueues.get(req.tenantId)!;
    }

    // Load shedding: Check per-tenant bounded queue depth
    if (state.queue.length >= this.maxQueueDepthPerTenant) {
      // Calibrated Retry-After based on current depth and quantum
      const retryAfterSec = Math.max(1, Math.ceil(state.queue.length / (state.config.quantumWeight * 10)));
      return {
        success: false,
        reason: `Tenant queue limit reached (${this.maxQueueDepthPerTenant} in queue)`,
        retryAfterSec
      };
    }

    state.queue.push(req);
    this.totalEnqueuedCount++;
    return { success: true };
  }

  /**
   * Dequeue the next fair request across tenants using Deficit Round-Robin.
   * Automatically drops aged / dead requests whose sojourn time exceeds deadline.
   */
  public dequeueNext(): { request: ClientRequest | null; droppedAgedCount: number } {
    if (this.totalEnqueuedCount === 0 || this.activeTenantIds.length === 0) {
      return { request: null, droppedAgedCount: 0 };
    }

    let droppedAged = 0;
    const now = Date.now();
    let iterations = 0;

    while (iterations < this.activeTenantIds.length && this.totalEnqueuedCount > 0) {
      const tenantId = this.activeTenantIds[this.currentTenantIndex];
      const state = this.tenantQueues.get(tenantId);

      if (!state || state.queue.length === 0) {
        if (state) state.deficit = 0;
        this.advanceTenant();
        iterations++;
        continue;
      }

      // If deficit is exhausted, start new round for this tenant by allocating quantum
      if (state.deficit <= 0) {
        state.deficit += state.config.quantumWeight;
      }

      // Dequeue next valid request within deficit
      while (state.queue.length > 0 && state.deficit > 0) {
        const candidate = state.queue.shift()!;
        this.totalEnqueuedCount--;
        state.deficit -= 1;

        // Anti-Aging Invariant: Check if request has aged past caller's deadline
        const sojournTimeMs = now - candidate.enqueuedAtMs;
        if (sojournTimeMs > candidate.deadlineMs || candidate.isCancelled) {
          droppedAged++;
          // Stale request dropped without dispatching to upstream!
          continue;
        }

        // If this tenant exhausted its quantum credits or its queue emptied, advance tenant
        if (state.deficit <= 0 || state.queue.length === 0) {
          this.advanceTenant();
        }

        return { request: candidate, droppedAgedCount: droppedAged };
      }

      if (state.queue.length === 0) {
        state.deficit = 0;
      }
      this.advanceTenant();
      iterations++;
    }

    return { request: null, droppedAgedCount: droppedAged };
  }

  private advanceTenant(): void {
    this.currentTenantIndex = (this.currentTenantIndex + 1) % this.activeTenantIds.length;
  }

  public getTotalQueued(): number {
    return this.totalEnqueuedCount;
  }

  public getTenantQueueDepth(tenantId: string): number {
    return this.tenantQueues.get(tenantId)?.queue.length || 0;
  }
}
