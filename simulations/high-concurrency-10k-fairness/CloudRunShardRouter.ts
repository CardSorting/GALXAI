/**
 * @file CloudRunShardRouter.ts
 * @description Google Cloud Run Instance Router with Peak EWMA Load Balancing
 * and Envoy Outlier Detection (automatic circuit ejection).
 */

import { ShardCapacity, CloudRunInstanceConfig, ClientRequest } from './types';

export class CloudRunShardRouter {
  private readonly shards: ShardCapacity[] = [];
  private readonly config: CloudRunInstanceConfig;
  private totalEjections = 0;

  constructor(
    shardCount = 20,
    containerConcurrency = 15,
    config: Partial<CloudRunInstanceConfig> = {}
  ) {
    this.config = {
      containerConcurrency: config.containerConcurrency ?? containerConcurrency,
      softConcurrencyTarget: config.softConcurrencyTarget ?? Math.floor(containerConcurrency * 0.7),
      ewmaAlpha: config.ewmaAlpha ?? 0.25,
      outlierFailureThreshold: config.outlierFailureThreshold ?? 3,
      baseEjectionDurationMs: config.baseEjectionDurationMs ?? 800
    };

    for (let i = 0; i < shardCount; i++) {
      this.shards.push({
        shardId: `cr_instance_${i.toString().padStart(2, '0')}`,
        accountId: `acc_${Math.random().toString(36).substring(2, 8)}`,
        maxConcurrency: this.config.containerConcurrency,
        softConcurrencyTarget: this.config.softConcurrencyTarget,
        inFlight: 0,
        avgLatencyMs: 60 + Math.floor((Math.random() - 0.5) * 20),
        ewmaLatencyMs: 60,
        isHealthy: true,
        consecutiveFailures: 0
      });
    }
  }

  /**
   * Peak EWMA Load Balancer: Selects the healthiest Cloud Run instance with the lowest cost.
   * cost = ((inFlight + 1) / containerConcurrency) * ewmaLatency
   */
  public selectBestInstance(): ShardCapacity | null {
    const now = Date.now();
    let bestInstance: ShardCapacity | null = null;
    let lowestCost = Infinity;

    for (const shard of this.shards) {
      // Outlier ejection recovery check
      if (!shard.isHealthy) {
        if (shard.cooldownUntilMs && now >= shard.cooldownUntilMs) {
          shard.isHealthy = true;
          shard.cooldownUntilMs = undefined;
          shard.consecutiveFailures = 0;
        } else {
          continue; // Ejected by Outlier Detection
        }
      }

      if (shard.inFlight >= shard.maxConcurrency) {
        continue; // Saturated
      }

      const cost =
        ((shard.inFlight + 1) / shard.maxConcurrency) * (shard.ewmaLatencyMs || shard.avgLatencyMs);

      if (cost < lowestCost) {
        lowestCost = cost;
        bestInstance = shard;
      }
    }

    return bestInstance;
  }

  /**
   * Record execution outcome and update Peak EWMA latency and Outlier Detection counters.
   */
  public recordExecution(shard: ShardCapacity, latencyMs: number, isSuccess: boolean): void {
    shard.inFlight = Math.max(0, shard.inFlight - 1);

    if (isSuccess) {
      shard.consecutiveFailures = 0;
      // EWMA: S_t = alpha * latency + (1 - alpha) * S_{t-1}
      shard.ewmaLatencyMs =
        this.config.ewmaAlpha * latencyMs + (1 - this.config.ewmaAlpha) * (shard.ewmaLatencyMs || latencyMs);
    } else {
      shard.consecutiveFailures = (shard.consecutiveFailures || 0) + 1;

      // Envoy Outlier Detection: Eject if failure threshold exceeded
      if (shard.consecutiveFailures >= this.config.outlierFailureThreshold) {
        shard.isHealthy = false;
        const jitter = Math.floor(Math.random() * (this.config.baseEjectionDurationMs * 0.3));
        shard.cooldownUntilMs = Date.now() + this.config.baseEjectionDurationMs + jitter;
        this.totalEjections++;
      }
    }
  }

  public async execute(
    req: ClientRequest,
    shard: ShardCapacity
  ): Promise<{ status: 'ok' | '429'; latencyMs: number }> {
    if (shard.inFlight >= shard.maxConcurrency) {
      this.recordExecution(shard, 2, false);
      return { status: '429', latencyMs: 2 };
    }

    shard.inFlight++;
    const latency = Math.max(10, shard.avgLatencyMs + Math.floor((Math.random() - 0.5) * 15));

    return new Promise((resolve) => {
      setTimeout(() => {
        this.recordExecution(shard, latency, true);
        resolve({ status: 'ok', latencyMs: latency });
      }, latency);
    });
  }

  public getStats() {
    return {
      totalInstances: this.shards.length,
      activeInstances: this.shards.filter((s) => s.isHealthy).length,
      totalInFlight: this.shards.reduce((sum, s) => sum + s.inFlight, 0),
      totalEjections: this.totalEjections
    };
  }

  public getShards(): ShardCapacity[] {
    return this.shards;
  }
}
