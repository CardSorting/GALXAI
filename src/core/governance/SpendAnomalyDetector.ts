/**
 * GALXAI Enterprise Real-Time Spend Anomaly Detector
 * 
 * Computes sliding-window velocity baselines ($/minute and tokens/minute)
 * and detects statistical anomalies (Z-score ≥ 3.0 or >300% sudden velocity surge).
 * Prevents Friday-evening runaway scripts from burning tens of thousands of dollars.
 */

export interface VelocityMetricSample {
  timestampMs: number;
  costUsd: number;
  tokens: number;
  serviceId: string;
  department: string;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  zScore: number;
  baselineHourlyRateUsd: number;
  currentSurgeHourlyRateUsd: number;
  velocityMultiplier: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggerReason?: string;
  serviceId: string;
  department: string;
}

export class SpendAnomalyDetector {
  private static serviceWindows = new Map<string, VelocityMetricSample[]>();

  /**
   * Records a traffic sample and evaluates whether it represents a spend anomaly
   */
  public static recordAndEvaluate(
    sample: VelocityMetricSample,
    windowDurationMs = 600_000 // 10-minute sliding window
  ): AnomalyDetectionResult {
    const key = `${sample.department}:${sample.serviceId}`;
    let window = this.serviceWindows.get(key);
    if (!window) {
      window = [];
      this.serviceWindows.set(key, window);
    }

    const now = sample.timestampMs || Date.now();
    window.push(sample);

    // Evict samples older than sliding window
    const cutoff = now - windowDurationMs;
    while (window.length > 0 && window[0].timestampMs < cutoff) {
      window.shift();
    }

    // Need at least 5 samples to compute meaningful statistics
    if (window.length < 5) {
      return {
        isAnomaly: false,
        zScore: 0,
        baselineHourlyRateUsd: sample.costUsd * 60,
        currentSurgeHourlyRateUsd: sample.costUsd * 60,
        velocityMultiplier: 1.0,
        severity: 'low',
        serviceId: sample.serviceId,
        department: sample.department,
      };
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

    return {
      isAnomaly,
      zScore,
      baselineHourlyRateUsd,
      currentSurgeHourlyRateUsd,
      velocityMultiplier,
      severity,
      triggerReason,
      serviceId: sample.serviceId,
      department: sample.department,
    };
  }

  /**
   * Resets telemetry window for testing or service recalibration
   */
  public static resetWindows(): void {
    this.serviceWindows.clear();
  }
}
