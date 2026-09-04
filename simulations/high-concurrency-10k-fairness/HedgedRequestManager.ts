/**
 * @file HedgedRequestManager.ts
 * @description Google SRE & Twitter Finagle Hedged Request Dispatcher.
 * Launches a secondary backup execution if the primary exceeds P95 latency threshold,
 * taming tail P99/P99.9 latency spikes under high-concurrency bursts.
 */

import { ClientRequest, ShardCapacity } from './types';
import { CloudRunShardRouter } from './CloudRunShardRouter';

export class HedgedRequestManager {
  private readonly router: CloudRunShardRouter;
  private readonly hedgeDelayMs: number;
  private totalHedged = 0;
  private hedgedWonCount = 0;

  constructor(router: CloudRunShardRouter, hedgeDelayMs = 70) {
    this.router = router;
    this.hedgeDelayMs = hedgeDelayMs;
  }

  public async executeWithHedge(
    req: ClientRequest,
    primaryShard: ShardCapacity
  ): Promise<{ status: 'ok' | '429'; latencyMs: number; wasHedged: boolean; shardId: string }> {
    let isSettled = false;
    let hedgeTimer: NodeJS.Timeout | null = null;
    let hedgedLaunched = false;

    return new Promise((resolve) => {
      // 1. Launch Primary Execution
      const primaryStart = Date.now();
      this.router.execute(req, primaryShard).then((primaryRes) => {
        if (isSettled) return;
        isSettled = true;
        if (hedgeTimer) clearTimeout(hedgeTimer);

        resolve({
          status: primaryRes.status,
          latencyMs: Date.now() - primaryStart,
          wasHedged: hedgedLaunched,
          shardId: primaryShard.shardId
        });
      });

      // 2. Schedule Hedged Backup Execution on P95 delay
      hedgeTimer = setTimeout(() => {
        if (isSettled) return;

        const backupShard = this.router.selectBestInstance();
        if (!backupShard || backupShard.shardId === primaryShard.shardId) {
          return; // No secondary shard available
        }

        hedgedLaunched = true;
        this.totalHedged++;

        const backupStart = Date.now();
        this.router.execute(req, backupShard).then((backupRes) => {
          if (isSettled) return;
          isSettled = true;
          this.hedgedWonCount++;

          resolve({
            status: backupRes.status,
            latencyMs: Date.now() - backupStart,
            wasHedged: true,
            shardId: backupShard.shardId
          });
        });
      }, this.hedgeDelayMs);

      if (hedgeTimer.unref) hedgeTimer.unref();
    });
  }

  public getStats() {
    return {
      totalHedged: this.totalHedged,
      hedgedWon: this.hedgedWonCount,
      hedgeWinRatio: this.totalHedged > 0 ? this.hedgedWonCount / this.totalHedged : 0
    };
  }
}
