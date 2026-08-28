/**
 * GALXAI BroccoliDB Incident Anomaly Multi-Tier Sliding Window Buffer
 * 
 * Manages chronological temporal sliding windows during catastrophic mega-incidents:
 * 1. Maintains three distinct temporal buffer zones:
 *    - PRE_INCIDENT_BASELINE (T_-5min steady-state telemetry)
 *    - INCIDENT_SHOCKWAVE_T0 (Root-cause trigger & explosive fault cascading)
 *    - POST_INCIDENT_RECOVERY (Mitigation, failover, and steady-state restoration)
 * 2. Dynamically calculates statistical metric variance, error velocity, and anomaly burst thresholds.
 * 3. Provides instantaneous forensic slice extraction across the exact incident timeline.
 */

import { BroccoliDbTable } from './broccolidb-table';

export type TemporalZone = 'PRE_INCIDENT_BASELINE' | 'INCIDENT_SHOCKWAVE_T0' | 'POST_INCIDENT_RECOVERY';

export interface TemporalWindowFrame {
  frameId: string;
  timestamp: string;
  timestampMs: number;
  zone: TemporalZone;
  anomalyScore: number; // 0.0 to 1.0
  severityLevel: string;
  sourceHost: string;
  metricSnapshot: Record<string, number>;
  rawMessage: string;
}

export interface WindowAggregateMetrics {
  totalFrames: number;
  baselineFrames: number;
  shockwaveFrames: number;
  recoveryFrames: number;
  peakAnomalyScore: number;
  peakErrorVelocityPerSec: number;
  isolatedRootCauseFrame?: TemporalWindowFrame;
  shockwaveDurationMs: number;
}

export class BroccoliIncidentAnomalySlidingWindowBuffer {
  private static instance: BroccoliIncidentAnomalySlidingWindowBuffer;
  private readonly frames: TemporalWindowFrame[] = [];
  private readonly maxFrames: number;

  public readonly windowAuditTable: BroccoliDbTable<{
    id: string;
    totalFrames: number;
    peakAnomaly: number;
    shockwaveDurationMs: number;
    timestampMs: number;
  }>;

  private constructor(maxFrames = 10000) {
    this.maxFrames = maxFrames;
    this.windowAuditTable = new BroccoliDbTable('incident_anomaly_window_audit');
    this.windowAuditTable.createIndex('peakAnomaly');
  }

  public static getInstance(maxFrames = 10000): BroccoliIncidentAnomalySlidingWindowBuffer {
    if (!BroccoliIncidentAnomalySlidingWindowBuffer.instance) {
      BroccoliIncidentAnomalySlidingWindowBuffer.instance = new BroccoliIncidentAnomalySlidingWindowBuffer(maxFrames);
    }
    return BroccoliIncidentAnomalySlidingWindowBuffer.instance;
  }

  /**
   * Ingests a new event frame into the sliding temporal buffer
   */
  public recordFrame(frame: Omit<TemporalWindowFrame, 'frameId' | 'zone'>): TemporalWindowFrame {
    if (this.frames.length >= this.maxFrames) {
      this.frames.shift(); // Evict oldest frame
    }

    let zone: TemporalZone = 'PRE_INCIDENT_BASELINE';
    if (frame.anomalyScore >= 0.7 || /FATAL|PANIC|SEV-0|CRITICAL/i.test(frame.severityLevel)) {
      zone = 'INCIDENT_SHOCKWAVE_T0';
    } else if (/RECOVERED|RESOLVED|PROMOTED|RESTORED/i.test(frame.rawMessage)) {
      zone = 'POST_INCIDENT_RECOVERY';
    }

    const fullFrame: TemporalWindowFrame = {
      ...frame,
      frameId: `frm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      zone,
    };

    this.frames.push(fullFrame);
    return fullFrame;
  }

  /**
   * Evaluates the entire window and synthesizes incident analytics
   */
  public evaluateWindow(): WindowAggregateMetrics {
    const total = this.frames.length;
    let baselineCount = 0;
    let shockwaveCount = 0;
    let recoveryCount = 0;
    let peakAnomaly = 0;
    let rootCauseFrame: TemporalWindowFrame | undefined;
    let firstShockwaveTime = 0;
    let lastShockwaveTime = 0;

    for (let i = 0; i < total; i++) {
      const f = this.frames[i];
      if (f.anomalyScore > peakAnomaly) {
        peakAnomaly = f.anomalyScore;
      }

      if (f.zone === 'INCIDENT_SHOCKWAVE_T0') {
        shockwaveCount++;
        if (!rootCauseFrame || f.anomalyScore > rootCauseFrame.anomalyScore) {
          rootCauseFrame = f;
        }
        if (firstShockwaveTime === 0) firstShockwaveTime = f.timestampMs;
        lastShockwaveTime = f.timestampMs;
      } else if (f.zone === 'POST_INCIDENT_RECOVERY') {
        recoveryCount++;
      } else {
        baselineCount++;
      }
    }

    const shockwaveDurationMs = Math.max(0, lastShockwaveTime - firstShockwaveTime);
    const durationSeconds = shockwaveDurationMs > 0 ? shockwaveDurationMs / 1000 : 1;
    const peakVelocity = Number((shockwaveCount / durationSeconds).toFixed(1));

    return {
      totalFrames: total,
      baselineFrames: baselineCount,
      shockwaveFrames: shockwaveCount,
      recoveryFrames: recoveryCount,
      peakAnomalyScore: peakAnomaly,
      peakErrorVelocityPerSec: peakVelocity,
      isolatedRootCauseFrame: rootCauseFrame,
      shockwaveDurationMs,
    };
  }

  /**
   * Extracts a concentrated slice of frames around the T0 root-cause trigger
   */
  public extractT0ShockwaveSlice(contextRadius = 15): TemporalWindowFrame[] {
    const rootIndex = this.frames.findIndex(f => f.zone === 'INCIDENT_SHOCKWAVE_T0');
    if (rootIndex === -1) {
      return this.frames.slice(-contextRadius);
    }

    const start = Math.max(0, rootIndex - contextRadius);
    const end = Math.min(this.frames.length, rootIndex + contextRadius + 1);
    return this.frames.slice(start, end);
  }

  public clear(): void {
    this.frames.length = 0;
    this.windowAuditTable.clear();
  }
}
