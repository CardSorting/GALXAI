/**
 * @file MockUpstreamShardFleet.ts
 * @description Simulates a pooled fleet of upstream provider accounts with realistic concurrency caps,
 * latencies, and 429 rate limit triggers.
 */

import { ClientRequest, ShardCapacity } from './types';

export class MockUpstreamShardFleet {
  private readonly shards: ShardCapacity[] = [];
  private totalExecuted = 0;
  private total429s = 0;

  constructor(shardCount = 20, maxConcurrencyPerShard = 15, avgLatencyMs = 60) {
    for (let i = 0; i < shardCount; i++) {
      this.shards.push({
        shardId: `shard_mock_${i.toString().padStart(2, '0')}`,
        accountId: `acc_${Math.random().toString(36).substring(2, 8)}`,
        maxConcurrency: maxConcurrencyPerShard,
        inFlight: 0,
        avgLatencyMs: avgLatencyMs + Math.floor((Math.random() - 0.5) * 20),
        isHealthy: true
      });
    }
  }

  public getAvailableShard(): ShardCapacity | null {
    const now = Date.now();
    // Return the healthy shard with lowest in-flight ratio
    let bestShard: ShardCapacity | null = null;
    let lowestRatio = 1.0;

    for (const shard of this.shards) {
      if (!shard.isHealthy) {
        if (shard.cooldownUntilMs && now >= shard.cooldownUntilMs) {
          shard.isHealthy = true;
          shard.cooldownUntilMs = undefined;
        } else {
          continue;
        }
      }

      const ratio = shard.inFlight / shard.maxConcurrency;
      if (ratio < 1.0 && ratio < lowestRatio) {
        lowestRatio = ratio;
        bestShard = shard;
      }
    }

    return bestShard;
  }

  public async execute(req: ClientRequest, shard: ShardCapacity): Promise<{ status: 'ok' | '429'; latencyMs: number }> {
    if (shard.inFlight >= shard.maxConcurrency) {
      shard.isHealthy = false;
      shard.cooldownUntilMs = Date.now() + 500; // 500ms cooldown
      this.total429s++;
      return { status: '429', latencyMs: 2 };
    }

    shard.inFlight++;
    const latency = Math.max(10, shard.avgLatencyMs + Math.floor((Math.random() - 0.5) * 15));

    return new Promise((resolve) => {
      setTimeout(() => {
        shard.inFlight--;
        this.totalExecuted++;
        resolve({ status: 'ok', latencyMs: latency });
      }, latency);
    });
  }

  public getStats() {
    return {
      totalShards: this.shards.length,
      totalCapacity: this.shards.reduce((acc, s) => acc + s.maxConcurrency, 0),
      currentInFlight: this.shards.reduce((acc, s) => acc + s.inFlight, 0),
      totalExecuted: this.totalExecuted,
      total429s: this.total429s
    };
  }
}
