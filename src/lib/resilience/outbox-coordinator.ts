import type { OutboxMutation } from './BroccoliOutboxEngine';

export const OUTBOX_KEY = 'galx_broccolidb_outbox_v1';
export const OUTBOX_BUDGET_KEY = 'galx_outbox_budget_v1';
const MAX_ITEMS = 500;
const MAX_BYTES = 2 * 1024 * 1024;
const BURST = 20;
const REFILL_MS = 3000;
export interface OutboxBudget { tokens: number; updatedAt: number; }
export type OutboxLock = <T>(name: string, onlyIfAvailable: boolean, work: () => Promise<T>) => Promise<T | undefined>;

export function browserOutboxLock(): OutboxLock | undefined {
  if (typeof navigator === 'undefined' || !navigator.locks) return undefined;
  return async (name, onlyIfAvailable, work) => await navigator.locks.request(name,
    onlyIfAvailable ? { ifAvailable: true } : { signal: AbortSignal.timeout(5000) },
    async lock => lock ? await work() : undefined);
}

/** State transactions never hold a lock across HTTP I/O. Read authoritative
 * storage inside the lock, not a stale tab cache or a broadcast payload. */
export class OutboxCoordinator {
  constructor(readonly storage: Pick<Storage, 'getItem' | 'setItem'> | undefined,
    readonly lock: OutboxLock | undefined, private readonly now = Date.now) {}
  get supported() { return Boolean(this.storage && this.lock); }
  read(): OutboxMutation[] {
    const raw = this.storage?.getItem(OUTBOX_KEY);
    if (!raw) return [];
    if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) throw new Error('Saved actions need attention.');
    const rows: OutboxMutation[] = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.length > MAX_ITEMS || new Set(rows.map(item => item?.id)).size !== rows.length
      || rows.some(item => !item || typeof item.id !== 'string' || typeof item.url !== 'string'
        || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(item.method)
        || !['pending', 'inflight', 'failed', 'completed'].includes(item.status)
        || !Number.isSafeInteger(item.attempts) || item.attempts < 0
        || typeof item.idempotencyKey !== 'string' || !item.idempotencyKey)) throw new Error('Saved actions need attention.');
    return rows.filter(item => item.status !== 'completed').map(item => ({ ...item,
      maxAttempts: Math.min(5, Math.max(1, Number.isSafeInteger(item.maxAttempts) ? item.maxAttempts : 5)),
      nextAttemptAt: Number.isFinite(item.nextAttemptAt) && item.nextAttemptAt! >= 0 ? item.nextAttemptAt : 0,
    }));
  }
  async transaction<T>(change: (items: OutboxMutation[], budget: OutboxBudget) => T): Promise<T> {
    if (!this.supported) throw new Error('Automatic recovery is unavailable in this browser.');
    return await this.lock!('galx-outbox-state-v2', false, async () => {
      const items = this.read();
      const raw = this.storage!.getItem(OUTBOX_BUDGET_KEY);
      if (raw && raw.length > 1024) throw new Error('Saved actions need attention.');
      const budget: OutboxBudget = raw ? JSON.parse(raw) : { tokens: BURST, updatedAt: this.now() };
      if (!Number.isFinite(budget.tokens) || budget.tokens < 0 || budget.tokens > BURST
        || !Number.isFinite(budget.updatedAt) || budget.updatedAt < 0) throw new Error('Saved actions need attention.');
      budget.tokens = Math.min(BURST, budget.tokens + Math.max(0, this.now() - budget.updatedAt) / REFILL_MS);
      budget.updatedAt = Math.max(this.now(), budget.updatedAt);
      const result = change(items, budget);
      const serialized = JSON.stringify(items);
      if (items.length > MAX_ITEMS || new TextEncoder().encode(serialized).byteLength > MAX_BYTES) {
        throw new Error('Your saved-action queue is full. Existing actions have been kept.');
      }
      // Persist reservations first. Partial writes can only spend extra budget.
      // Storage failure never falls back to a non-durable retry allowance.
      this.storage!.setItem(OUTBOX_BUDGET_KEY, JSON.stringify(budget));
      this.storage!.setItem(OUTBOX_KEY, serialized);
      return result;
    }) as T;
  }
  async drain(work: () => Promise<void>): Promise<void> {
    if (this.supported) await this.lock!('galx-outbox-drain-v2', true, work);
  }
}

export function retryDelay(attempts: number, retryAfter: string | null, now: number, random = Math.random): number {
  const exponential = Math.min(60_000, 1000 * 2 ** Math.min(5, attempts));
  const jitter = 1000 + Math.floor(random() * exponential);
  const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined;
  const delay = seconds !== undefined ? seconds * 1000 : retryAfter ? Date.parse(retryAfter) - now : 0;
  // Never shorten Retry-After. Unrepresentable deadlines pause for review.
  if (delay === Infinity || delay > Number.MAX_SAFE_INTEGER - now) return Number.MAX_SAFE_INTEGER - now;
  return Math.max(jitter, Number.isFinite(delay) ? delay : 0);
}
