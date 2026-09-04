/**
 * @file AdaptiveConcurrencyLimiter.ts
 * @description Netflix / Envoy TCP Vegas Gradient Adaptive Concurrency Limiter.
 * Dynamically adjusts gateway concurrency limits based on Round-Trip Time (RTT) gradients,
 * preventing upstream saturation and 429 collapses before static limits are hit.
 */

import { AdaptiveConcurrencyConfig, AdaptiveConcurrencyState } from './types';

export class AdaptiveConcurrencyLimiter {
  private readonly config: AdaptiveConcurrencyConfig;
  private currentLimit: number;
  private minRttMs = Infinity;
  private smoothedRttMs = 0;
  private inFlight = 0;
  private sampleCount = 0;
  private lastAdjustmentMs = Date.now();
  private minRttObservedAtMs = Date.now();

  constructor(
    initialLimit = 150,
    config: Partial<AdaptiveConcurrencyConfig> = {}
  ) {
    this.currentLimit = initialLimit;
    this.config = {
      minLimit: config.minLimit ?? 10,
      maxLimit: config.maxLimit ?? 500,
      smoothingFactor: config.smoothingFactor ?? 0.2, // EWMA alpha
      toleranceBeta: config.toleranceBeta ?? 2,       // Additive probe headroom
      probeIntervalMs: config.probeIntervalMs ?? 100 // Evaluate gradient every 100ms
    };
  }

  public getLimit(): number {
    return this.currentLimit;
  }

  public getInFlight(): number {
    return this.inFlight;
  }

  public canAcquire(): boolean {
    return this.inFlight < this.currentLimit;
  }

  public acquire(): boolean {
    if (this.inFlight >= this.currentLimit) {
      return false;
    }
    this.inFlight++;
    return true;
  }

  public release(rttMs: number): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
    this.recordSample(rttMs);
  }

  /**
   * Record execution latency and update EWMA + Vegas gradient.
   */
  public recordSample(rttMs: number, now = Date.now()): void {
    if (rttMs <= 0) return;
    this.sampleCount++;

    // Track physical latency floor (minRTT)
    if (rttMs < this.minRttMs) {
      this.minRttMs = rttMs;
      this.minRttObservedAtMs = now;
    }

    // Decay minRTT every 15s to allow adaptation if upstream base latency changes
    if (now - this.minRttObservedAtMs > 15000) {
      this.minRttMs = Math.max(this.minRttMs * 1.05, rttMs);
      this.minRttObservedAtMs = now;
    }

    // EWMA Smoothed RTT: S_t = alpha * RTT + (1 - alpha) * S_{t-1}
    if (this.smoothedRttMs === 0) {
      this.smoothedRttMs = rttMs;
    } else {
      this.smoothedRttMs =
        this.config.smoothingFactor * rttMs +
        (1 - this.config.smoothingFactor) * this.smoothedRttMs;
    }

    // Periodic gradient adjustment
    if (now - this.lastAdjustmentMs >= this.config.probeIntervalMs && this.sampleCount >= 5) {
      this.adjustLimit(now);
    }
  }

  /**
   * Vegas Gradient Calculation:
   * Gradient = minRTT / smoothedRTT
   * New Limit = currentLimit * Gradient + Beta
   */
  private adjustLimit(now: number): void {
    if (this.minRttMs <= 0 || this.smoothedRttMs <= 0) return;

    const gradient = Math.min(1.0, this.minRttMs / this.smoothedRttMs);

    // If gradient < 0.9, upstream is experiencing queuing / latency inflation
    let newLimit: number;
    if (gradient < 0.9) {
      // Contract concurrency aggressively
      newLimit = Math.floor(this.currentLimit * gradient);
    } else {
      // Near minRTT: expand by beta headroom to probe higher throughput
      newLimit = Math.floor(this.currentLimit * gradient + this.config.toleranceBeta);
    }

    // Clamp between minLimit and maxLimit
    this.currentLimit = Math.max(
      this.config.minLimit,
      Math.min(this.config.maxLimit, newLimit)
    );

    this.lastAdjustmentMs = now;
    this.sampleCount = 0;
  }

  public getState(): AdaptiveConcurrencyState {
    return {
      currentLimit: this.currentLimit,
      minRttMs: this.minRttMs === Infinity ? 0 : this.minRttMs,
      smoothedRttMs: Math.round(this.smoothedRttMs),
      sampleCount: this.sampleCount,
      lastAdjustmentMs: this.lastAdjustmentMs
    };
  }
}
