/**
 * @file CalibratedEtaEngine.ts
 * @description Calibrated Moving-Window ETA and Queue Position Engine.
 * Mirrors Midjourney Job Queue & Suno Generative Music streaming ETA models:
 * Computes real-time dynamic queue positions and EWMA throughput-based wait times:
 * EstimatedWaitMs = AheadInQueue / (ActiveShards * ThroughputRateEWMA)
 */

import { EtaEstimate } from './types';

export class CalibratedEtaEngine {
  private alpha = 0.2; // EWMA smoothing factor
  private currentThroughputEwmaPerSec = 2.0; // Default baseline ~2 tasks/sec across fleet
  private lastCompletedTimestampMs = Date.now();
  private completedWindowCount = 0;
  private activeShardsCount: number;

  constructor(activeShardsCount = 25) {
    this.activeShardsCount = activeShardsCount;
  }

  /**
   * Record task completion to update running EWMA throughput rate.
   */
  public recordCompletion(durationMs: number): void {
    const now = Date.now();
    const elapsedSec = Math.max(0.01, (now - this.lastCompletedTimestampMs) / 1000);
    this.completedWindowCount++;

    if (elapsedSec >= 1.0) {
      const instantThroughput = this.completedWindowCount / elapsedSec;
      this.currentThroughputEwmaPerSec =
        this.alpha * instantThroughput + (1 - this.alpha) * this.currentThroughputEwmaPerSec;
      this.completedWindowCount = 0;
      this.lastCompletedTimestampMs = now;
    }
  }

  /**
   * Calculate real-time calibrated ETA for a given queue position.
   */
  public calculateEta(queuePosition: number): EtaEstimate {
    const safeRate = Math.max(0.1, this.currentThroughputEwmaPerSec);
    const estimatedWaitSec = Math.round(queuePosition / safeRate);
    const estimatedWaitMs = estimatedWaitSec * 1000;

    return {
      queuePosition,
      estimatedWaitMs,
      estimatedWaitSec,
      activeThroughputEwma: Number(safeRate.toFixed(2)),
      activeShardsCount: this.activeShardsCount
    };
  }

  /**
   * Format RFC 7231 / SSE response headers for HTTP 202 Accepted.
   */
  public formatHeaders(queuePosition: number): Record<string, string> {
    const eta = this.calculateEta(queuePosition);
    return {
      'X-Queue-Position': String(eta.queuePosition),
      'X-Estimated-Wait-Sec': String(eta.estimatedWaitSec),
      'Retry-After': String(Math.max(5, Math.min(60, Math.floor(eta.estimatedWaitSec * 0.3))))
    };
  }

  /**
   * Format Server-Sent Event payload for real-time queue position progress updates.
   */
  public formatSseEvent(queuePosition: number): string {
    const eta = this.calculateEta(queuePosition);
    return `event: queue_update\ndata: ${JSON.stringify(eta)}\n\n`;
  }
}
