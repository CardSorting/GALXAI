/**
 * @file ShadowShardStandby.ts
 * @description Pre-Warmed Standby Shadow Shard Pool.
 * Mirrors AWS Bedrock Provisioned Throughput & Envoy Warm Pool architectures:
 * Maintains a pool of pre-authenticated, idle shadow shards for instantaneous (<50ms)
 * warm handover when an in-flight 2-3 minute job suffers a TTFT or ITL stall.
 */

import { ShadowShardStats, ShardCapacity } from './types';

export class ShadowShardStandby {
  private shadowPool: ShardCapacity[] = [];
  private warmHandoverCount = 0;
  private totalHandoverDurationMs = 0;

  constructor(shadowShards: ShardCapacity[]) {
    this.shadowPool = [...shadowShards];
  }

  /**
   * Check if warm shadow capacity is available.
   */
  public hasAvailableShadow(): boolean {
    return this.shadowPool.some((s) => s.isHealthy);
  }

  /**
   * Acquire a pre-warmed shadow shard for instant handover.
   */
  public acquireShadow(originalShardId: string): { shard: ShardCapacity; handoverLatencyMs: number } | null {
    const start = performance.now();
    const available = this.shadowPool.find((s) => s.shardId !== originalShardId && s.isHealthy);
    if (!available) return null;

    const handoverLatencyMs = performance.now() - start;
    this.warmHandoverCount++;
    this.totalHandoverDurationMs += handoverLatencyMs;

    return {
      shard: available,
      handoverLatencyMs: Number(handoverLatencyMs.toFixed(3))
    };
  }

  public releaseShadow(shardId: string): void {
    const found = this.shadowPool.find((s) => s.shardId === shardId);
    if (found) {
      found.inFlight = Math.max(0, found.inFlight - 1);
    }
  }

  public getStats(): ShadowShardStats {
    return {
      totalShadowShards: this.shadowPool.length,
      warmHandoverCount: this.warmHandoverCount,
      avgHandoverLatencyMs:
        this.warmHandoverCount > 0 ? Number((this.totalHandoverDurationMs / this.warmHandoverCount).toFixed(3)) : 0
    };
  }
}
