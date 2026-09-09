import { BroccoliResilienceSubstrate } from './BroccoliResilienceSubstrate';

/** A browser-to-website check, never service availability, an SLA, or fleet health. */
export interface SlaProbeResult {
  status: 'unknown' | 'healthy' | 'degraded' | 'offline';
  responseLatencyMs: number | null;
  checkedAtMs: number | null;
}

export const CONNECTION_CHECK_INTERVAL_MS = 60_000;
const STALE_AFTER_MS = 120_000;

export class SlaHealthEngine {
  private static instance: SlaHealthEngine | null = null;
  private readonly listeners = new Set<(status: SlaProbeResult) => void>();
  private inFlight: Promise<SlaProbeResult> | null = null;
  private lastStartedAtMs = -Infinity;
  private latest: SlaProbeResult | null = null;

  constructor(private readonly dependencies: {
    now?: () => number;
    monotonicNow?: () => number;
    online?: () => boolean;
    visible?: () => boolean;
    fetch?: typeof fetch;
    record?: (probe: Parameters<BroccoliResilienceSubstrate['recordSlaProbe']>[0]) => void;
  } = {}) {}

  public static getInstance(): SlaHealthEngine {
    return SlaHealthEngine.instance ??= new SlaHealthEngine();
  }

  private now() { return (this.dependencies.now ?? Date.now)(); }
  private online() { return this.dependencies.online?.() ?? (typeof navigator === 'undefined' || navigator.onLine); }
  private visible() { return this.dependencies.visible?.() ?? (typeof document !== 'undefined' && document.visibilityState === 'visible'); }

  public probe(): Promise<SlaProbeResult> {
    if (this.inFlight) return this.inFlight;
    if (!this.online() || !this.visible() || this.now() - this.lastStartedAtMs < CONNECTION_CHECK_INTERVAL_MS) {
      this.notify();
      return Promise.resolve(this.getStatus());
    }
    this.lastStartedAtMs = this.now();
    this.inFlight = this.measure().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async measure(): Promise<SlaProbeResult> {
    const monotonicNow = this.dependencies.monotonicNow ?? (() => performance.now());
    const start = monotonicNow();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    let success = false;
    let latencyMs: number | null = null;
    try {
      const response = await (this.dependencies.fetch ?? fetch)('/api/version', {
        method: 'HEAD', cache: 'no-store', redirect: 'error', signal: controller.signal,
      });
      latencyMs = Math.max(0, Math.round(monotonicNow() - start));
      success = response.ok;
      await response.body?.cancel();
    } catch {
      // No response time can be claimed when no response was received.
    } finally { clearTimeout(timeout); }
    const status = success ? 'healthy' : 'degraded';
    this.latest = { status, responseLatencyMs: latencyMs, checkedAtMs: this.now() };
    const record = this.dependencies.record ?? (probe => BroccoliResilienceSubstrate.getInstance().recordSlaProbe(probe));
    try {
      record({ timestampMs: this.latest.checkedAtMs!, latencyMs, success, status,
        endpoint: '/api/version', measurementSource: 'browser-http-v1' });
    } catch { /* Optional local history must not break the connection indicator. */ }
    this.notify();
    return this.getStatus();
  }

  public getStatus(): SlaProbeResult {
    // Restored/broadcast history is not a fresh measurement from this tab's network.
    if (!this.online()) {
      this.latest = null; // A network transition invalidates the previous measurement.
      return { status: 'offline', responseLatencyMs: null, checkedAtMs: null };
    }
    if (!this.latest || this.latest.checkedAtMs === null || this.now() < this.latest.checkedAtMs
      || this.now() - this.latest.checkedAtMs >= STALE_AFTER_MS) {
      return { status: 'unknown', responseLatencyMs: null, checkedAtMs: this.latest?.checkedAtMs ?? null };
    }
    return { ...this.latest };
  }

  public subscribe(callback: (status: SlaProbeResult) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => { this.listeners.delete(callback); };
  }

  private notify() {
    for (const callback of this.listeners) { try { callback(this.getStatus()); } catch {} }
  }
}
