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
  private frameSequence = 0;

  public readonly windowAuditTable: BroccoliDbTable<{
    id: string;
    totalFrames: number;
    peakAnomaly: number;
    shockwaveDurationMs: number;
    timestampMs: number;
  }>;

  private constructor(maxFrames = 10000) {
    if (!Number.isSafeInteger(maxFrames) || maxFrames <= 0) {
      throw new RangeError('Incident window maxFrames must be a positive safe integer.');
    }
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

  /** Creates an isolated incident window for a single stream or request. */
  public static create(maxFrames = 10000): BroccoliIncidentAnomalySlidingWindowBuffer {
    return new BroccoliIncidentAnomalySlidingWindowBuffer(maxFrames);
  }

  /**
   * Ingests a new event frame into the sliding temporal buffer
   */
  public recordFrame(frame: Omit<TemporalWindowFrame, 'frameId' | 'zone'>): TemporalWindowFrame {
    if (!Number.isFinite(frame.timestampMs)) {
      throw new RangeError('Incident frame timestampMs must be finite.');
    }
    if (!Number.isFinite(frame.anomalyScore)) {
      throw new RangeError('Incident frame anomalyScore must be finite.');
    }

    if (this.frames.length >= this.maxFrames) {
      this.frames.shift(); // Evict oldest frame
    }

    const anomalyScore = Math.max(0, Math.min(1, frame.anomalyScore));
    let zone: TemporalZone = 'PRE_INCIDENT_BASELINE';
    if (/RECOVERED|RESOLVED|PROMOTED|RESTORED/i.test(frame.rawMessage)) {
      zone = 'POST_INCIDENT_RECOVERY';
    } else if (anomalyScore >= 0.7 || /FATAL|PANIC|SEV-?0|CRITICAL/i.test(frame.severityLevel)) {
      zone = 'INCIDENT_SHOCKWAVE_T0';
    }

    const fullFrame: TemporalWindowFrame = {
      ...frame,
      anomalyScore,
      frameId: `frm_${frame.timestampMs}_${++this.frameSequence}`,
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
    let firstShockwaveTime = Number.POSITIVE_INFINITY;
    let lastShockwaveTime = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < total; i++) {
      const f = this.frames[i];
      if (f.anomalyScore > peakAnomaly) {
        peakAnomaly = f.anomalyScore;
      }

      if (f.zone === 'INCIDENT_SHOCKWAVE_T0') {
        shockwaveCount++;
        if (!rootCauseFrame || f.timestampMs < rootCauseFrame.timestampMs) {
          rootCauseFrame = f;
        }
        firstShockwaveTime = Math.min(firstShockwaveTime, f.timestampMs);
        lastShockwaveTime = Math.max(lastShockwaveTime, f.timestampMs);
      } else if (f.zone === 'POST_INCIDENT_RECOVERY') {
        recoveryCount++;
      } else {
        baselineCount++;
      }
    }

    const shockwaveDurationMs = shockwaveCount > 0
      ? Math.max(0, lastShockwaveTime - firstShockwaveTime)
      : 0;
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
    if (!Number.isSafeInteger(contextRadius) || contextRadius < 0) {
      throw new RangeError('contextRadius must be a non-negative safe integer.');
    }

    const rootCauseFrame = this.evaluateWindow().isolatedRootCauseFrame;
    const rootIndex = rootCauseFrame
      ? this.frames.findIndex(frame => frame.frameId === rootCauseFrame.frameId)
      : -1;
    if (rootIndex === -1) {
      return this.frames.slice(-contextRadius);
    }

    const start = Math.max(0, rootIndex - contextRadius);
    const end = Math.min(this.frames.length, rootIndex + contextRadius + 1);
    return this.frames.slice(start, end);
  }

  public clear(): void {
    this.frames.length = 0;
    this.frameSequence = 0;
    this.windowAuditTable.clear();
  }
}
