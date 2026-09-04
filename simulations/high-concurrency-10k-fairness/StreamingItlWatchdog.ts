/**
 * @file StreamingItlWatchdog.ts
 * @description Sliding Window Inter-Token Latency (ITL) and TTFT Early Deadlock Watchdog.
 * Mirrors Envoy Streaming Rate Filters & Cloudflare AI Gateway ITL monitoring:
 * - Detects upstream stalls at TTFT (Time To First Token) within 12 seconds.
 * - Tracks EWMA of inter-token intervals; catches silent slow poison (degraded GPU generation <2 tokens/sec).
 */

import { ItlMetrics } from './types';

export class StreamingItlWatchdog {
  private readonly maxTtftMs: number;
  private readonly maxItlMs: number;
  private readonly minTokensPerSec: number;

  private startedAtMs: number;
  private firstTokenAtMs: number | null = null;
  private lastTokenAtMs: number | null = null;
  private totalTokens = 0;
  private ewmaItlMs = 0;
  private p99ItlMs = 0;
  private itlSamples: number[] = [];

  private isStalled = false;
  private isThrottled = false;

  public static forModelProfile(profile: 'fast' | 'standard' | 'deep_reasoning'): StreamingItlWatchdog {
    switch (profile) {
      case 'fast':
        return new StreamingItlWatchdog({ maxTtftMs: 15_000, maxItlMs: 5_000, minTokensPerSec: 4.0 });
      case 'standard':
        return new StreamingItlWatchdog({ maxTtftMs: 30_000, maxItlMs: 8_000, minTokensPerSec: 2.0 });
      case 'deep_reasoning':
        return new StreamingItlWatchdog({ maxTtftMs: 60_000, maxItlMs: 20_000, minTokensPerSec: 0.5 });
    }
  }

  constructor(options?: { maxTtftMs?: number; maxItlMs?: number; minTokensPerSec?: number; profile?: 'fast' | 'standard' | 'deep_reasoning' }) {
    if (options?.profile) {
      const p = StreamingItlWatchdog.forModelProfile(options.profile);
      this.maxTtftMs = options.maxTtftMs ?? p.maxTtftMs;
      this.maxItlMs = options.maxItlMs ?? p.maxItlMs;
      this.minTokensPerSec = options.minTokensPerSec ?? p.minTokensPerSec;
    } else {
      this.maxTtftMs = options?.maxTtftMs ?? 12_000;
      this.maxItlMs = options?.maxItlMs ?? 10_000;
      this.minTokensPerSec = options?.minTokensPerSec ?? 2.0;
    }
    this.startedAtMs = Date.now();
  }

  /**
   * Called on every chunk or token emitted by the upstream provider.
   */
  public recordTokenArrival(tokenCount = 1, nowMs = Date.now()): void {
    if (this.firstTokenAtMs === null) {
      this.firstTokenAtMs = nowMs;
      this.ewmaItlMs = nowMs - this.startedAtMs;
      this.lastTokenAtMs = nowMs;
      this.totalTokens += tokenCount;
      return;
    }

    const deltaMs = Math.max(1, nowMs - (this.lastTokenAtMs ?? this.startedAtMs));
    this.lastTokenAtMs = nowMs;
    this.totalTokens += tokenCount;

    // Running EWMA with alpha = 0.15
    this.ewmaItlMs = 0.15 * deltaMs + 0.85 * this.ewmaItlMs;
    this.itlSamples.push(deltaMs);
    if (this.itlSamples.length > 50) this.itlSamples.shift();

    if (deltaMs > this.p99ItlMs) {
      this.p99ItlMs = deltaMs;
    }
  }

  /**
   * Check if the stream has stalled or is severely throttled.
   */
  public checkHealth(nowMs = Date.now()): { healthy: boolean; reason?: string } {
    // 1. TTFT check
    if (this.firstTokenAtMs === null) {
      const elapsed = nowMs - this.startedAtMs;
      if (elapsed > this.maxTtftMs) {
        this.isStalled = true;
        return { healthy: false, reason: `TTFT_DEADLOCK: No tokens received in ${elapsed}ms (limit: ${this.maxTtftMs}ms)` };
      }
      return { healthy: true };
    }

    // 2. Inter-token stall check
    const sinceLastToken = nowMs - (this.lastTokenAtMs ?? this.startedAtMs);
    if (sinceLastToken > this.maxItlMs) {
      this.isStalled = true;
      return { healthy: false, reason: `ITL_STALL: Inter-token latency ${sinceLastToken}ms exceeded limit ${this.maxItlMs}ms` };
    }

    // 3. Sustained throughput throttling check (after first 10 tokens)
    if (this.totalTokens >= 10 && this.firstTokenAtMs !== null) {
      const durationSec = Math.max(0.1, (nowMs - this.firstTokenAtMs) / 1000);
      const rate = this.totalTokens / durationSec;
      if (rate < this.minTokensPerSec && durationSec >= 8.0) {
        this.isThrottled = true;
        return { healthy: false, reason: `SLOW_POISON_THROTTLE: Generation rate ${rate.toFixed(2)} tokens/sec below ${this.minTokensPerSec}` };
      }
    }

    return { healthy: true };
  }

  public getMetrics(nowMs = Date.now()): ItlMetrics {
    const ttft = this.firstTokenAtMs ? this.firstTokenAtMs - this.startedAtMs : nowMs - this.startedAtMs;
    const durationSec = this.firstTokenAtMs ? Math.max(0.1, (nowMs - this.firstTokenAtMs) / 1000) : 0.1;
    const rate = this.firstTokenAtMs ? this.totalTokens / durationSec : 0;

    return {
      totalTokensReceived: this.totalTokens,
      ttftMs: ttft,
      ewmaItlMs: Math.round(this.ewmaItlMs),
      p99ItlMs: Math.round(this.p99ItlMs),
      isStalled: this.isStalled,
      isThrottled: this.isThrottled,
      tokensPerSec: Number(rate.toFixed(2))
    };
  }
}
