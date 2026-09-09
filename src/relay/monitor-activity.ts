import { randomUUID } from 'node:crypto';

export type ActivityLevel = 'info' | 'warning' | 'error';
export interface ActivityEvent {
  id: string; at: number; category: 'fleet' | 'request' | 'telemetry'; level: ActivityLevel; code: string;
  shardId?: string; generation?: string; requestId?: string; traceId?: string; model?: string;
  count?: number; retryAt?: number; httpStatus?: number; durationMs?: number;
}
/** Local diagnostic journal. Callers supply fixed codes and explicit fields, never exception messages. */
export class MonitorActivity {
  readonly startedAt: number;
  readonly capacity = 500;
  readonly retentionMs = 3600000;
  private entries: ActivityEvent[] = [];
  private evicted = 0;
  constructor(private readonly now = Date.now) { this.startedAt = now(); }
  record(event: Omit<ActivityEvent, 'id' | 'at'>) {
    const entry: ActivityEvent = { id: randomUUID(), at: this.now(), category: event.category, level: event.level, code: event.code };
    // Runtime callers may carry extra context. Never journal payloads, headers or errors.
    for (const key of ['shardId', 'generation', 'requestId', 'traceId', 'model'] as const) {
      if (typeof event[key] === 'string') entry[key] = event[key].slice(0, 256);
    }
    for (const key of ['count', 'retryAt', 'httpStatus', 'durationMs'] as const) {
      if (typeof event[key] === 'number' && Number.isFinite(event[key])) entry[key] = event[key];
    }
    this.entries.push(entry);
    this.prune();
  }
  private prune() {
    while (this.entries.length && (this.entries.length > this.capacity || this.entries[0].at < this.now() - this.retentionMs)) { this.entries.shift(); this.evicted++; }
  }
  snapshot() { this.prune(); return { startedAt: this.startedAt, capacity: this.capacity, retentionMs: this.retentionMs, evicted: this.evicted, events: this.entries.slice().reverse().map(e => ({ ...e })) }; }
}
