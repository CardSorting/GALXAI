/** Durable, bounded browser recovery. An acknowledgement is not completion,
 * and client idempotency keys do not guarantee exactly-once server execution. */
import { OutboxCoordinator, OUTBOX_KEY, browserOutboxLock, retryDelay } from './outbox-coordinator';

export interface OutboxMutation extends Record<string, unknown> {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  payload?: unknown;
  idempotencyKey: string;
  status: 'pending' | 'inflight' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: number;
  nextAttemptAt?: number;
  lastError?: string;
  timestamp: number;
  checksum: string;
  ownerId?: string;
}

function browserStorage(): Storage | undefined {
  try { return typeof window !== 'undefined' ? window.localStorage : undefined; } catch { return undefined; }
}
export class BroccoliOutboxEngineImpl {
  private items: OutboxMutation[] = [];
  private drainPromise: Promise<void> | null = null;
  private listeners = new Set<(mutations: readonly OutboxMutation[]) => void>();
  private channel?: BroadcastChannel;
  private recoveryBlocked = false;
  constructor(private readonly coordinator = new OutboxCoordinator(browserStorage(), browserOutboxLock()),
    private readonly options: { now?: () => number; random?: () => number; fetch?: typeof fetch;
      online?: () => boolean; visible?: () => boolean; origin?: string; background?: boolean } = {}) {
    this.refresh();
    if (typeof window !== 'undefined' && options.background !== false) {
      try {
        this.channel = new BroadcastChannel('galx_outbox_sync_channel');
        this.channel.onmessage = () => this.refresh();
      } catch {}
      window.addEventListener('storage', event => { if (event.key === OUTBOX_KEY || event.key === null) this.refresh(); });
      window.addEventListener('online', () => { void this.drain(); });
      document.addEventListener('visibilitychange', () => { if (this.visible()) void this.drain(); });
      setInterval(() => { if (this.online() && this.visible()) void this.drain(); }, 15_000);
    }
  }
  private now() { return (this.options.now ?? Date.now)(); }
  private online() { return this.options.online?.() ?? (typeof navigator !== 'undefined' && navigator.onLine); }
  private visible() { return this.options.visible?.() ?? (typeof document === 'undefined' || document.visibilityState === 'visible'); }
  private refresh() {
    try { this.items = this.coordinator.read(); }
    catch { this.recoveryBlocked = true; }
    for (const listener of this.listeners) { try { listener(this.getPendingMutations()); } catch {} }
  }
  private changed() { this.refresh(); try { this.channel?.postMessage({ type: 'OUTBOX_CHANGED' }); } catch {} }
  private ownerId(): string {
    const raw = this.coordinator.storage?.getItem('galx_custom_auth_user');
    if (!raw) return '';
    const user = JSON.parse(raw);
    if (typeof user?.id !== 'string') throw new Error('Sign in again before recovering saved actions.');
    return user.id;
  }
  private safeUrl(raw: string): string {
    const origin = this.options.origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://galx.invalid');
    const url = new URL(raw, origin);
    if (url.origin !== origin || url.username || url.password || url.hash || !url.pathname.startsWith('/api/')) {
      throw new Error('This action cannot be retried automatically.');
    }
    return url.pathname + url.search;
  }
  async enqueue(params: { url: string; method?: OutboxMutation['method']; headers?: Record<string, string>;
    payload?: unknown; idempotencyKey?: string; priority?: number; maxAttempts?: number }): Promise<OutboxMutation> {
    const timestamp = this.now();
    const id = 'outbox_' + crypto.randomUUID();
    const mutation: OutboxMutation = { id, url: this.safeUrl(params.url), method: params.method ?? 'POST',
      headers: Object.fromEntries(new Headers(params.headers ?? { 'Content-Type': 'application/json' })),
      payload: params.payload, idempotencyKey: params.idempotencyKey || 'idem_' + id,
      status: 'pending', priority: Math.min(10, Math.max(1, params.priority ?? 5)), attempts: 0,
      maxAttempts: Math.min(5, Math.max(1, Number.isSafeInteger(params.maxAttempts) ? params.maxAttempts! : 5)),
      timestamp, checksum: '', ownerId: this.ownerId() };
    if (new TextEncoder().encode(JSON.stringify(mutation)).byteLength > 64 * 1024) throw new Error('This action is too large to save for automatic recovery.');
    await this.coordinator.transaction(items => { items.push(mutation); });
    this.recoveryBlocked = false;
    this.changed();
    if (this.online() && this.visible()) void this.drain();
    return structuredClone(mutation);
  }
  drain(): Promise<void> {
    return this.drainPromise ??= this.runDrain().catch(() => { this.recoveryBlocked = true; })
      .finally(() => { this.drainPromise = null; this.changed(); });
  }
  private async runDrain() {
    if (!this.online() || !this.visible()) return;
    await this.coordinator.drain(async () => {
      // Only the drain lease owner can recover a prior owner's interrupted work.
      await this.coordinator.transaction(items => {
        for (const item of items) if (item.status === 'inflight') item.status = 'failed';
      });
      this.recoveryBlocked = false;
      const deadline = this.now() + 8000;
      for (let sent = 0; sent < 20 && this.now() < deadline && this.online() && this.visible(); sent++) {
        const item = await this.coordinator.transaction((items, budget) => {
          if (budget.tokens < 1) return undefined;
          const owner = this.ownerId();
          const next = items.filter(row => row.attempts < row.maxAttempts && (row.nextAttemptAt ?? 0) <= this.now())
            .filter(row => row.ownerId === owner)
            .sort((a, b) => a.priority - b.priority || a.timestamp - b.timestamp)[0];
          if (!next) return undefined;
          next.status = 'inflight'; next.attempts++; next.lastAttemptAt = this.now();
          next.nextAttemptAt = this.now() + retryDelay(next.attempts, null, this.now(), this.options.random);
          budget.tokens--;
          return structuredClone(next);
        });
        if (!item) break;
        this.changed();
        let success = false;
        let permanent = false;
        let error = 'Request could not be completed.';
        let delay = retryDelay(item.attempts, null, this.now(), this.options.random);
        let target: string;
        try { target = this.safeUrl(item.url); }
        catch {
          await this.coordinator.transaction(items => {
            const found = items.find(row => row.id === item.id);
            if (found) { found.status = 'failed'; found.attempts = found.maxAttempts; found.lastError = 'This action needs review before it can be sent.'; }
          });
          this.changed(); continue;
        }
        try {
          const response = await (this.options.fetch ?? fetch)(target, {
            method: item.method, headers: { ...item.headers, 'Idempotency-Key': item.idempotencyKey,
              'x-idempotency-key': item.idempotencyKey, 'x-outbox-replay': 'true' },
            body: item.payload === undefined ? undefined : JSON.stringify(item.payload),
            signal: AbortSignal.timeout(15_000), redirect: 'error',
          });
          await response.body?.cancel().catch(() => {});
          success = response.ok;
          permanent = response.headers.get('x-should-retry') === 'false'
            || !(response.status >= 500 || [408, 409, 425, 429].includes(response.status));
          error = 'Request failed (HTTP ' + response.status + ').';
          delay = retryDelay(item.attempts, response.headers.get('retry-after'), this.now(), this.options.random);
        } catch { /* Keep the reserved attempt; never retain upstream diagnostics. */ }
        await this.coordinator.transaction(items => {
          const index = items.findIndex(row => row.id === item.id);
          if (index < 0) return;
          if (success) items.splice(index, 1);
          else items[index] = { ...item, status: 'failed', attempts: permanent ? item.maxAttempts : item.attempts,
            nextAttemptAt: this.now() + delay, lastError: error };
        });
        this.changed();
      }
    });
  }
  getPendingCount() { return this.items.length; }
  getPendingMutations(): readonly OutboxMutation[] { return structuredClone(this.items); }
  getRecoverySummary() {
    let owner: string | undefined;
    try { owner = this.ownerId(); } catch { this.recoveryBlocked = true; }
    const visible = this.items.filter(item => item.ownerId === owner || item.ownerId === undefined);
    return { pending: visible.length,
      active: visible.filter(item => item.status === 'inflight').length,
      needsAttention: visible.filter(item => item.ownerId === undefined || item.attempts >= item.maxAttempts || item.nextAttemptAt === Number.MAX_SAFE_INTEGER).length,
      paused: this.recoveryBlocked || !this.coordinator.supported };
  }
  subscribe(callback: (mutations: readonly OutboxMutation[]) => void) {
    this.listeners.add(callback); callback(this.getPendingMutations());
    return () => { this.listeners.delete(callback); };
  }
}
export const BroccoliOutboxEngine = new BroccoliOutboxEngineImpl();
