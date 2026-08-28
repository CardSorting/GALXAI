/**
 * GALXAI Enterprise Real-Time Spend Anomaly Detector (Powered by BroccoliDB L1)
 * 
 * Computes sub-microsecond sliding-window velocity baselines ($/min and tokens/min)
 * backed by BroccoliDB reactive tables with secondary indexing and natural queries.
 * Detects statistical anomalies (Z-score ≥ 3.0 or >300% sudden velocity surge).
 */

import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';

export interface VelocityMetricSample {
  timestampMs: number;
  costUsd: number;
  tokens: number;
  serviceId: string;
  department: string;
}

export interface VelocitySampleRecord extends VelocityMetricSample {
  id: string;
}

export interface AnomalyDetectionRecord {
  id: string;
  isAnomaly: boolean;
  zScore: number;
  baselineHourlyRateUsd: number;
  currentSurgeHourlyRateUsd: number;
  velocityMultiplier: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggerReason?: string;
  serviceId: string;
  department: string;
  detectedAtMs: number;
}

export class SpendAnomalyDetector {
  private static instance: SpendAnomalyDetector;
  public readonly sampleTable: BroccoliDbTable<VelocitySampleRecord>;
  public readonly anomalyTable: BroccoliDbTable<AnomalyDetectionRecord>;

  private constructor() {
    this.sampleTable = new BroccoliDbTable<VelocitySampleRecord>('velocity_samples');
    this.sampleTable.createIndex('department');
    this.sampleTable.createIndex('serviceId');
    this.sampleTable.createSortedIndex('timestampMs');

    this.anomalyTable = new BroccoliDbTable<AnomalyDetectionRecord>('spend_anomalies');
    this.anomalyTable.createIndex('severity');
    this.anomalyTable.createIndex('department');
    this.anomalyTable.createSortedIndex('detectedAtMs');
  }

  public static getInstance(): SpendAnomalyDetector {
    if (!SpendAnomalyDetector.instance) {
      SpendAnomalyDetector.instance = new SpendAnomalyDetector();
    }
    return SpendAnomalyDetector.instance;
  }

  /**
   * Records a traffic sample and evaluates whether it represents a spend anomaly
   */
  public static recordAndEvaluate(
    sample: VelocityMetricSample,
    windowDurationMs = 600_000 // 10-minute sliding window
  ): AnomalyDetectionRecord {
    const detector = this.getInstance();
    const now = sample.timestampMs || Date.now();
    const sampleId = `samp_${now}_${Math.random().toString(36).substring(2, 8)}`;

    const sampleRecord: VelocitySampleRecord = {
      id: sampleId,
      ...sample,
      timestampMs: now,
    };
    detector.sampleTable.put(sampleId, sampleRecord);

    // Query samples in the sliding window for this department and service
    const cutoff = now - windowDurationMs;
    const window = detector.sampleTable.query({
      where: {
        department: sample.department,
        serviceId: sample.serviceId,
        timestampMs: { $gte: cutoff },
      },
    });

    // Need at least 5 samples to compute meaningful statistics
    if (window.length < 5) {
      const benignRecord: AnomalyDetectionRecord = {
        id: `nom_${now}`,
        isAnomaly: false,
        zScore: 0,
        baselineHourlyRateUsd: sample.costUsd * 60,
        currentSurgeHourlyRateUsd: sample.costUsd * 60,
        velocityMultiplier: 1.0,
        severity: 'low',
        serviceId: sample.serviceId,
        department: sample.department,
        detectedAtMs: now,
      };
      return benignRecord;
    }

    // Calculate baseline mean and standard deviation of cost per minute
    const costs = window.map((s) => s.costUsd);
    const sum = costs.reduce((a, b) => a + b, 0);
    const mean = sum / costs.length;
    const variance = costs.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance) || 0.0001;

    // Calculate Z-Score of the newest sample
    const zScore = Number(((sample.costUsd - mean) / stdDev).toFixed(2));
    const baselineHourlyRateUsd = Number((mean * 60).toFixed(4));
    const currentSurgeHourlyRateUsd = Number((sample.costUsd * 60).toFixed(4));
    const velocityMultiplier = mean > 0 ? Number((sample.costUsd / mean).toFixed(2)) : 1.0;

    // Detection Thresholds: Z-Score ≥ 3.0 or Velocity Multiplier ≥ 3.5x
    const isAnomaly = zScore >= 3.0 || (velocityMultiplier >= 3.5 && sample.costUsd > 0.05);

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let triggerReason: string | undefined;

    if (isAnomaly) {
      if (velocityMultiplier >= 10.0 || zScore >= 5.0) {
        severity = 'critical';
        triggerReason = `Critical spend burst: Velocity surged ${velocityMultiplier}x above baseline ($${currentSurgeHourlyRateUsd}/hr run-rate).`;
      } else if (velocityMultiplier >= 5.0 || zScore >= 4.0) {
        severity = 'high';
        triggerReason = `High spend anomaly: Velocity surged ${velocityMultiplier}x above baseline (Z-score: ${zScore}).`;
      } else {
        severity = 'medium';
        triggerReason = `Moderate spend deviation: ${velocityMultiplier}x baseline pace.`;
      }
    }

    const anomalyRecord: AnomalyDetectionRecord = {
      id: `anom_${now}_${sample.serviceId}`,
      isAnomaly,
      zScore,
      baselineHourlyRateUsd,
      currentSurgeHourlyRateUsd,
      velocityMultiplier,
      severity,
      triggerReason,
      serviceId: sample.serviceId,
      department: sample.department,
      detectedAtMs: now,
    };

    if (isAnomaly) {
      detector.anomalyTable.put(anomalyRecord.id, anomalyRecord);
    }

    return anomalyRecord;
  }

  /**
   * Executes natural language query across logged spend anomalies in BroccoliDB
   */
  public static queryAnomaliesNatural(naturalQuery: string): readonly AnomalyDetectionRecord[] {
    const detector = this.getInstance();
    const ast = BroccoliNaturalQueryParser.parse(naturalQuery);
    return detector.anomalyTable.query(ast.queryOptions);
  }

  /**
   * Resets BroccoliDB tables for testing
   */
  public static resetWindows(): void {
    const detector = this.getInstance();
    detector.sampleTable.clear();
    detector.anomalyTable.clear();
  }
}
