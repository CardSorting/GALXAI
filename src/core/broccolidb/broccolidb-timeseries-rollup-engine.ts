/**
 * GALXAI: BroccoliTimeSeriesRollupEngine (Zenith Tier)
 *
 * High-frequency time-series continuous metric rollups & percentile downsampling engine for BroccoliDB.
 * Supports windowed bucketing (1m, 5m, 1h, 1d) with statistical percentiles (P50, P90, P99), sum, min, max, avg.
 */

import type {
  IBroccoliTimeSeriesRollupEngine,
  TimeSeriesPoint,
  TimeSeriesWindowAggregation,
} from "./broccolidb.contracts";

export class BroccoliTimeSeriesRollupEngine implements IBroccoliTimeSeriesRollupEngine {
  // metricName -> array of TimeSeriesPoints
  private readonly metricStore = new Map<string, TimeSeriesPoint[]>();
  private readonly maxPointsPerMetric: number;

  constructor(maxPointsPerMetric = 10000) {
    if (!Number.isSafeInteger(maxPointsPerMetric) || maxPointsPerMetric <= 0) {
      throw new RangeError("maxPointsPerMetric must be a positive integer");
    }
    this.maxPointsPerMetric = maxPointsPerMetric;
  }

  public recordPoint(
    metricName: string,
    value: number,
    timestamp = Date.now(),
    tags?: Record<string, string>
  ): void {
    if (!metricName.trim()) throw new TypeError("metricName must be non-empty");
    if (!Number.isFinite(value) || !Number.isFinite(timestamp)) {
      throw new TypeError("value and timestamp must be finite numbers");
    }
    let points = this.metricStore.get(metricName);
    if (!points) {
      points = [];
      this.metricStore.set(metricName, points);
    }

    const point = { timestamp, value, tags: tags ? { ...tags } : undefined };
    let low = 0;
    let high = points.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (points[mid].timestamp <= timestamp) low = mid + 1;
      else high = mid;
    }
    points.splice(low, 0, point);

    if (points.length > this.maxPointsPerMetric) {
      // Evict oldest points
      points.splice(0, points.length - this.maxPointsPerMetric);
    }
  }

  public queryRollup(
    metricName: string,
    windowSizeMs: number,
    startTime: number,
    endTime: number
  ): readonly TimeSeriesWindowAggregation[] {
    if (!Number.isSafeInteger(windowSizeMs) || windowSizeMs <= 0) {
      throw new RangeError("windowSizeMs must be a positive integer");
    }
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime) {
      throw new RangeError("startTime and endTime must be finite and ordered");
    }
    const points = this.metricStore.get(metricName);
    if (!points || points.length === 0) return [];

    // Filter points in [startTime, endTime]
    const filtered = points.filter((p) => p.timestamp >= startTime && p.timestamp <= endTime);
    if (filtered.length === 0) return [];

    // Group into time windows
    const windows = new Map<number, number[]>(); // windowStart -> array of values

    for (const pt of filtered) {
      const windowStart = Math.floor(pt.timestamp / windowSizeMs) * windowSizeMs;
      let bucket = windows.get(windowStart);
      if (!bucket) {
        bucket = [];
        windows.set(windowStart, bucket);
      }
      bucket.push(pt.value);
    }

    const aggregations: TimeSeriesWindowAggregation[] = [];
    const sortedWindowStarts = Array.from(windows.keys()).sort((a, b) => a - b);

    for (const wStart of sortedWindowStarts) {
      const values = windows.get(wStart)!;
      values.sort((a, b) => a - b);

      let sum = 0;
      let min = Infinity;
      let max = -Infinity;

      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
      }

      const count = values.length;
      const avg = count > 0 ? sum / count : 0;
      const p50 = this.getPercentile(values, 0.50);
      const p90 = this.getPercentile(values, 0.90);
      const p99 = this.getPercentile(values, 0.99);

      aggregations.push({
        windowStart: wStart,
        windowEnd: wStart + windowSizeMs,
        count,
        sum,
        min: count > 0 ? min : 0,
        max: count > 0 ? max : 0,
        avg,
        p50,
        p90,
        p99,
      });
    }

    return aggregations;
  }

  public getMetricNames(): readonly string[] {
    return Array.from(this.metricStore.keys());
  }

  private getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(percentile * sortedValues.length) - 1));
    return sortedValues[index];
  }
}
