import type { ProviderType } from '../contracts/GalxContracts';

export interface MetricSample {
  readonly timestampMs: number;
  readonly latencyMs: number;
  readonly tokensConsumed: number;
  readonly success: boolean;
  readonly provider: ProviderType;
  readonly model: string;
  readonly shardId: string;
  readonly statusCode: number;
}

export interface AggregatedMetrics {
  readonly totalRequests: number;
  readonly totalTokens: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly errorRatePercentage: number;
  readonly requestsPerMinute: number;
  readonly tokensPerMinute: number;
  readonly latency: {
    readonly p50Ms: number;
    readonly p90Ms: number;
    readonly p99Ms: number;
    readonly averageMs: number;
    readonly minMs: number;
    readonly maxMs: number;
  };
  readonly providerBreakdown: Record<ProviderType, {
    requests: number;
    tokens: number;
    avgLatencyMs: number;
    errorRate: number;
  }>;
  readonly modelBreakdown: Record<string, {
    requests: number;
    tokens: number;
    avgLatencyMs: number;
  }>;
  readonly recentSamples: MetricSample[];
}

/**
 * Enterprise In-Memory Telemetry & Latency Histogram Engine.
 * Implements a high-throughput circular ring buffer for real-time percentile calculus (P50, P90, P99).
 */
export class GalxMetricsEngine {
  private static instance: GalxMetricsEngine;
  private readonly bufferSize: number;
  private readonly buffer: MetricSample[];
  private head = 0;
  private count = 0;

  // Lifetime cumulative counters
  private lifetimeRequests = 0;
  private lifetimeTokens = 0;
  private lifetimeErrors = 0;

  constructor(bufferSize = 2000) {
    this.bufferSize = bufferSize;
    this.buffer = new Array<MetricSample>(bufferSize);
  }

  static getInstance(): GalxMetricsEngine {
    if (!GalxMetricsEngine.instance) {
      GalxMetricsEngine.instance = new GalxMetricsEngine();
    }
    return GalxMetricsEngine.instance;
  }

  /**
   * Records a request sample into the circular ring buffer.
   */
  recordSample(sample: MetricSample): void {
    this.buffer[this.head] = sample;
    this.head = (this.head + 1) % this.bufferSize;
    if (this.count < this.bufferSize) {
      this.count++;
    }

    this.lifetimeRequests++;
    this.lifetimeTokens += sample.tokensConsumed;
    if (!sample.success) {
      this.lifetimeErrors++;
    }
  }

  /**
   * Calculates real-time sliding-window percentiles and aggregation across recent samples (default: last 5 minutes).
   */
  getMetrics(windowMs = 300_000, nowMs = Date.now()): AggregatedMetrics {
    const cutoff = nowMs - windowMs;
    const activeSamples: MetricSample[] = [];

    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + this.bufferSize) % this.bufferSize;
      const s = this.buffer[idx];
      if (s && s.timestampMs >= cutoff) {
        activeSamples.push(s);
      } else if (s && s.timestampMs < cutoff) {
        break; // Samples are chronological
      }
    }

    const n = activeSamples.length;
    if (n === 0) {
      return {
        totalRequests: this.lifetimeRequests,
        totalTokens: this.lifetimeTokens,
        successfulRequests: this.lifetimeRequests - this.lifetimeErrors,
        failedRequests: this.lifetimeErrors,
        errorRatePercentage: this.lifetimeRequests > 0 ? Number(((this.lifetimeErrors / this.lifetimeRequests) * 100).toFixed(2)) : 0,
        requestsPerMinute: 0,
        tokensPerMinute: 0,
        latency: {
          p50Ms: 0,
          p90Ms: 0,
          p99Ms: 0,
          averageMs: 0,
          minMs: 0,
          maxMs: 0
        },
        providerBreakdown: {
          openai: { requests: 0, tokens: 0, avgLatencyMs: 0, errorRate: 0 },
          'xai-grok': { requests: 0, tokens: 0, avgLatencyMs: 0, errorRate: 0 }
        },
        modelBreakdown: {},
        recentSamples: []
      };
    }

    let tokensSum = 0;
    let errorsCount = 0;
    let latencySum = 0;
    let minLatency = Infinity;
    let maxLatency = -Infinity;

    const latencies: number[] = new Array(n);
    const providerMap: Record<ProviderType, { req: number; tok: number; latSum: number; err: number }> = {
      openai: { req: 0, tok: 0, latSum: 0, err: 0 },
      'xai-grok': { req: 0, tok: 0, latSum: 0, err: 0 }
    };
    const modelMap: Record<string, { req: number; tok: number; latSum: number }> = {};

    for (let i = 0; i < n; i++) {
      const s = activeSamples[i];
      tokensSum += s.tokensConsumed;
      latencySum += s.latencyMs;
      latencies[i] = s.latencyMs;

      if (!s.success) errorsCount++;
      if (s.latencyMs < minLatency) minLatency = s.latencyMs;
      if (s.latencyMs > maxLatency) maxLatency = s.latencyMs;

      // Provider
      const p = providerMap[s.provider] || { req: 0, tok: 0, latSum: 0, err: 0 };
      p.req++;
      p.tok += s.tokensConsumed;
      p.latSum += s.latencyMs;
      if (!s.success) p.err++;
      providerMap[s.provider] = p;

      // Model
      const m = modelMap[s.model] || { req: 0, tok: 0, latSum: 0 };
      m.req++;
      m.tok += s.tokensConsumed;
      m.latSum += s.latencyMs;
      modelMap[s.model] = m;
    }

    // Sort latencies for percentiles
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(n * 0.50)] || 0;
    const p90 = latencies[Math.floor(n * 0.90)] || 0;
    const p99 = latencies[Math.floor(n * 0.99)] || 0;

    const windowMinutes = Math.max(0.1, windowMs / 60000.0);
    const rpm = Math.round(n / windowMinutes);
    const tpm = Math.round(tokensSum / windowMinutes);

    const providerBreakdown: Record<ProviderType, { requests: number; tokens: number; avgLatencyMs: number; errorRate: number }> = {
      openai: {
        requests: providerMap.openai.req,
        tokens: providerMap.openai.tok,
        avgLatencyMs: providerMap.openai.req > 0 ? Math.round(providerMap.openai.latSum / providerMap.openai.req) : 0,
        errorRate: providerMap.openai.req > 0 ? Number(((providerMap.openai.err / providerMap.openai.req) * 100).toFixed(1)) : 0
      },
      'xai-grok': {
        requests: providerMap['xai-grok'].req,
        tokens: providerMap['xai-grok'].tok,
        avgLatencyMs: providerMap['xai-grok'].req > 0 ? Math.round(providerMap['xai-grok'].latSum / providerMap['xai-grok'].req) : 0,
        errorRate: providerMap['xai-grok'].req > 0 ? Number(((providerMap['xai-grok'].err / providerMap['xai-grok'].req) * 100).toFixed(1)) : 0
      }
    };

    const modelBreakdown: Record<string, { requests: number; tokens: number; avgLatencyMs: number }> = {};
    for (const [k, v] of Object.entries(modelMap)) {
      modelBreakdown[k] = {
        requests: v.req,
        tokens: v.tok,
        avgLatencyMs: v.req > 0 ? Math.round(v.latSum / v.req) : 0
      };
    }

    return {
      totalRequests: this.lifetimeRequests,
      totalTokens: this.lifetimeTokens,
      successfulRequests: this.lifetimeRequests - this.lifetimeErrors,
      failedRequests: this.lifetimeErrors,
      errorRatePercentage: Number(((errorsCount / n) * 100).toFixed(2)),
      requestsPerMinute: rpm,
      tokensPerMinute: tpm,
      latency: {
        p50Ms: p50,
        p90Ms: p90,
        p99Ms: p99,
        averageMs: Math.round(latencySum / n),
        minMs: minLatency === Infinity ? 0 : minLatency,
        maxMs: maxLatency === -Infinity ? 0 : maxLatency
      },
      providerBreakdown,
      modelBreakdown,
      recentSamples: activeSamples.slice(0, 50)
    };
  }
}
