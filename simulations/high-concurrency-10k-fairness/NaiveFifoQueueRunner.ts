/**
 * @file NaiveFifoQueueRunner.ts
 * @description Simulates the baseline "naive" architecture: unbounded monolithic FIFO queue
 * with no tenant isolation, no early load-shedding, and no anti-aging drops.
 * Demonstrates the Bufferbloat, Zombie Execution, and Cascading Death Spiral failure modes.
 */

import { ClientRequest, AdmissionResult, SimulationMetrics } from './types';
import { MockUpstreamShardFleet } from './MockUpstreamShardFleet';

export class NaiveFifoQueueRunner {
  private readonly fleet: MockUpstreamShardFleet;
  private readonly queue: ClientRequest[] = [];

  private totalSubmitted = 0;
  private completedSuccess = 0;
  private zombieUpstreamExecutions = 0;
  private droppedAged = 0;
  private readonly queueLatencies: number[] = [];
  private readonly tenantStats: Record<string, { submitted: number; completed: number; shed: number; aged: number }> = {};
  private isDraining = false;

  constructor(fleet: MockUpstreamShardFleet) {
    this.fleet = fleet;
  }

  public async submitRequest(req: ClientRequest): Promise<AdmissionResult> {
    this.totalSubmitted++;
    if (!this.tenantStats[req.tenantId]) {
      this.tenantStats[req.tenantId] = { submitted: 0, completed: 0, shed: 0, aged: 0 };
    }
    this.tenantStats[req.tenantId].submitted++;

    // Unbounded monolithic FIFO push
    this.queue.push(req);
    this.triggerDrain();

    return new Promise<AdmissionResult>((resolve) => {
      const waitTimer = setInterval(() => {
        const sojournMs = Date.now() - req.enqueuedAtMs;
        if (sojournMs > req.deadlineMs) {
          clearInterval(waitTimer);
          req.isCancelled = true;
          this.droppedAged++;
          this.tenantStats[req.tenantId].aged++;
          resolve({
            status: 'dropped_aged',
            queueLatencyMs: sojournMs,
            error: 'Client timed out waiting in naive FIFO queue'
          });
        }
      }, 25);

      (req as any)._onDispatched = (shardId: string, queueWaitMs: number, execLatencyMs: number, wasZombie: boolean) => {
        clearInterval(waitTimer);
        if (!wasZombie) {
          this.queueLatencies.push(queueWaitMs);
          this.completedSuccess++;
          this.tenantStats[req.tenantId].completed++;
          resolve({
            status: 'queued',
            queueLatencyMs: queueWaitMs,
            totalExecutionTimeMs: queueWaitMs + execLatencyMs,
            executedByShardId: shardId
          });
        }
      };
    });
  }

  private triggerDrain(): void {
    if (this.isDraining) return;
    this.isDraining = true;

    setImmediate(async () => {
      while (this.queue.length > 0) {
        const availableShard = this.fleet.getAvailableShard();
        if (!availableShard) {
          await new Promise((r) => setTimeout(r, 10));
          continue;
        }

        const req = this.queue.shift()!;
        const queueWaitMs = Date.now() - req.enqueuedAtMs;
        const wasZombie = queueWaitMs > req.deadlineMs || !!req.isCancelled;

        if (wasZombie) {
          // In the naive architecture, it STILL executes on the upstream shard!
          // This wastes upstream quota and saturates workers with dead requests.
          this.zombieUpstreamExecutions++;
        }

        this.fleet.execute(req, availableShard).then((exec) => {
          if ((req as any)._onDispatched) {
            (req as any)._onDispatched(availableShard.shardId, queueWaitMs, exec.latencyMs, wasZombie);
          }
        });
      }

      this.isDraining = false;
    });
  }

  public async waitForDrain(): Promise<void> {
    while (this.queue.length > 0 || this.isDraining) {
      await new Promise((r) => setTimeout(r, 20));
    }
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
      admitted: this.totalSubmitted,
      coalesced: 0,
      shedOverflow: 0,
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
