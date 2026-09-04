/**
 * @file AntiAgingAdmissionGovernor.ts
 * @description Coordinates Pre-Queue Admission Gating, Multi-Tenant Deficit Round-Robin Fair Queueing,
 * Single-Flight Coalescing, Anti-Aging Sojourn Drops, and SWRR Fleet Lease Allocation.
 */

import { ClientRequest, AdmissionResult, TenantConfig, SimulationMetrics } from './types';
import { MockUpstreamShardFleet } from './MockUpstreamShardFleet';
import { DeficitRoundRobinQueue } from './DeficitRoundRobinQueue';
import { SingleFlightCoalescer } from './SingleFlightCoalescer';

export class AntiAgingAdmissionGovernor {
  private readonly fleet: MockUpstreamShardFleet;
  private readonly drrQueue: DeficitRoundRobinQueue;
  private readonly coalescer: SingleFlightCoalescer;

  // Rate buckets per tenant: tokens remaining and last refill timestamp
  private readonly tenantBuckets: Map<string, { tokens: number; lastRefillMs: number }> = new Map();
  private readonly tenantConfigs: Map<string, TenantConfig> = new Map();

  // Telemetry
  private totalSubmitted = 0;
  private admitted = 0;
  private shedOverflow = 0;
  private droppedAged = 0;
  private completedSuccess = 0;
  private zombieUpstreamExecutions = 0;
  private readonly queueLatencies: number[] = [];
  private readonly tenantStats: Record<string, { submitted: number; completed: number; shed: number; aged: number }> = {};

  private isDraining = false;

  constructor(fleet: MockUpstreamShardFleet, maxQueueDepthPerTenant = 200) {
    this.fleet = fleet;
    this.drrQueue = new DeficitRoundRobinQueue(maxQueueDepthPerTenant);
    this.coalescer = new SingleFlightCoalescer();
  }

  public registerTenant(config: TenantConfig): void {
    this.tenantConfigs.set(config.id, config);
    this.drrQueue.registerTenant(config);
    this.tenantBuckets.set(config.id, {
      tokens: config.maxBurstCapacity,
      lastRefillMs: Date.now()
    });
    this.tenantStats[config.id] = { submitted: 0, completed: 0, shed: 0, aged: 0 };
  }

  /**
   * Submit an incoming request through the 10,000 QPS Admission Governor pipeline.
   */
  public async submitRequest(req: ClientRequest): Promise<AdmissionResult> {
    this.totalSubmitted++;
    if (!this.tenantStats[req.tenantId]) {
      this.tenantStats[req.tenantId] = { submitted: 0, completed: 0, shed: 0, aged: 0 };
    }
    this.tenantStats[req.tenantId].submitted++;

    // Layer 1: Ingress Token Bucket Rate Governance
    const config = this.tenantConfigs.get(req.tenantId);
    if (config && !this.consumeTenantToken(req.tenantId, config)) {
      this.shedOverflow++;
      this.tenantStats[req.tenantId].shed++;
      return {
        status: 'shed_overflow',
        queueLatencyMs: 0,
        retryAfterSec: 1,
        error: 'Tenant rate limit exceeded at ingress gate (HTTP 429)'
      };
    }

    // Layer 2: Single-Flight Request Coalescing (for duplicate requests)
    const { result } = await this.coalescer.executeOrJoin(req.promptHash, () => this.processSingleRequest(req));
    return result;
  }

  private async processSingleRequest(req: ClientRequest): Promise<AdmissionResult> {
    // Fast Path: Check if upstream shard is immediately available without queueing
    const immediateShard = this.fleet.getAvailableShard();
    if (immediateShard && this.drrQueue.getTotalQueued() === 0) {
      this.admitted++;
      const exec = await this.fleet.execute(req, immediateShard);
      if (exec.status === 'ok') {
        this.completedSuccess++;
        this.tenantStats[req.tenantId].completed++;
        return {
          status: 'admitted',
          queueLatencyMs: 0,
          totalExecutionTimeMs: exec.latencyMs,
          executedByShardId: immediateShard.shardId
        };
      }
    }

    // Layer 3: Enqueue into Multi-Tenant Deficit Round-Robin Queue
    const enqueueResult = this.drrQueue.enqueue(req);
    if (!enqueueResult.success) {
      this.shedOverflow++;
      this.tenantStats[req.tenantId].shed++;
      return {
        status: 'shed_overflow',
        queueLatencyMs: 0,
        retryAfterSec: enqueueResult.retryAfterSec || 1,
        error: enqueueResult.reason
      };
    }

    this.admitted++;

    // Trigger asynchronous queue drainer
    this.triggerDrain();

    // Await execution resolution with caller deadline awareness
    return new Promise<AdmissionResult>((resolve) => {
      const waitTimer = setInterval(() => {
        const sojournMs = Date.now() - req.enqueuedAtMs;

        // Check if client deadline expired while waiting in queue
        if (sojournMs > req.deadlineMs) {
          clearInterval(waitTimer);
          req.isCancelled = true;
          this.droppedAged++;
          this.tenantStats[req.tenantId].aged++;
          return resolve({
            status: 'dropped_aged',
            queueLatencyMs: sojournMs,
            error: `Request deadline exceeded (${req.deadlineMs}ms wait in queue)`
          });
        }
      }, 20);

      // Hook for when the request is dispatched by the worker loop
      (req as any)._onDispatched = (shardId: string, queueWaitMs: number, execLatencyMs: number) => {
        clearInterval(waitTimer);
        this.queueLatencies.push(queueWaitMs);
        this.completedSuccess++;
        this.tenantStats[req.tenantId].completed++;

        resolve({
          status: 'queued',
          queueLatencyMs: queueWaitMs,
          totalExecutionTimeMs: queueWaitMs + execLatencyMs,
          executedByShardId: shardId
        });
      };
    });
  }

  /**
   * Drain worker loop: pulls requests according to Deficit Round-Robin across tenants,
   * checks sojourn deadlines, and dispatches to available shards.
   */
  private triggerDrain(): void {
    if (this.isDraining) return;
    this.isDraining = true;

    setImmediate(async () => {
      while (this.drrQueue.getTotalQueued() > 0) {
        const availableShard = this.fleet.getAvailableShard();
        if (!availableShard) {
          // Shard fleet is at capacity, yield to event loop
          await new Promise((r) => setTimeout(r, 10));
          continue;
        }

        const { request, droppedAgedCount } = this.drrQueue.dequeueNext();
        if (droppedAgedCount > 0) {
          this.droppedAged += droppedAgedCount;
        }

        if (!request) {
          break;
        }

        const now = Date.now();
        const queueWaitMs = now - request.enqueuedAtMs;

        // Verify Anti-Aging invariant: caller must still be alive
        if (queueWaitMs > request.deadlineMs || request.isCancelled) {
          this.droppedAged++;
          this.tenantStats[request.tenantId].aged++;
          // Stale request discarded: DO NOT send to upstream shard!
          continue;
        }

        // Dispatch to upstream shard
        this.fleet.execute(request, availableShard).then((exec) => {
          if ((request as any)._onDispatched) {
            (request as any)._onDispatched(availableShard.shardId, queueWaitMs, exec.latencyMs);
          }
        });
      }

      this.isDraining = false;
    });
  }

  private consumeTenantToken(tenantId: string, config: TenantConfig): boolean {
    const bucket = this.tenantBuckets.get(tenantId);
    if (!bucket) return true;

    const now = Date.now();
    const elapsedSec = (now - bucket.lastRefillMs) / 1000;
    bucket.lastRefillMs = now;
    bucket.tokens = Math.min(config.maxBurstCapacity, bucket.tokens + elapsedSec * config.rateLimitPerSec);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  public getMetrics(): SimulationMetrics {
    const sorted = [...this.queueLatencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    const tenantSummary: Record<string, any> = {};
    for (const [id, stats] of Object.entries(this.tenantStats)) {
      tenantSummary[id] = {
        ...stats,
        successRate: stats.submitted > 0 ? (stats.completed / stats.submitted) : 0
      };
    }

    return {
      totalSubmitted: this.totalSubmitted,
      admitted: this.admitted,
      coalesced: this.coalescer.getCoalescedCount(),
      shedOverflow: this.shedOverflow,
      droppedAged: this.droppedAged,
      completedSuccess: this.completedSuccess,
      zombieUpstreamExecutions: this.zombieUpstreamExecutions,
      p50QueueLatencyMs: p50,
      p90QueueLatencyMs: p90,
      p99QueueLatencyMs: p99,
      throughputQps: this.completedSuccess,
      tenantStats: tenantSummary
    };
  }
}
