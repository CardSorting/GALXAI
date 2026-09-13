import { BroccoliDbTable } from './broccolidb-table';

/** Process-local acceleration only. Callers retain authority and durable writes elsewhere. */
export class BroccoliBoundedCache<T extends Record<string, any>> {
  readonly table: BroccoliDbTable<T>;
  private readonly entries = new Map<string, { bytes: number; expires: number }>();
  private bytes = 0;

  constructor(name: string, private readonly limits: { entries: number; bytes: number; ttlMs: number }, private readonly now = Date.now) {
    this.table = new BroccoliDbTable<T>(name);
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) { this.delete(key); return undefined; }
    this.entries.delete(key); this.entries.set(key, entry);
    return this.table.get(key) ?? undefined;
  }

  put(key: string, value: T, bytes = Buffer.byteLength(JSON.stringify(value))): boolean {
    this.delete(key);
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > this.limits.bytes) return false;
    this.prune();
    while (this.entries.size >= this.limits.entries || this.bytes + bytes > this.limits.bytes) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) return false;
      this.delete(oldest);
    }
    this.table.put(key, value);
    this.entries.set(key, { bytes, expires: this.now() + this.limits.ttlMs }); this.bytes += bytes;
    return true;
  }

  delete(key: string): void {
    const entry = this.entries.get(key);
    if (entry) this.bytes -= entry.bytes;
    this.entries.delete(key); this.table.delete(key);
  }

  deleteWhere(matches: (key: string) => boolean): void {
    for (const key of this.entries.keys()) if (matches(key)) this.delete(key);
  }

  private prune(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) if (entry.expires <= now) this.delete(key);
  }

  get size(): number { this.prune(); return this.entries.size; }
  get retainedBytes(): number { this.prune(); return this.bytes; }
}

export class BroccoliReadBusy extends Error {
  constructor() { super('Read capacity temporarily unavailable'); }
}

/** Bounded identical-work coalescing; queued tasks hold closures, never decoded images. */
export class BroccoliReadCoordinator {
  private readonly flights = new Map<string, Promise<unknown>>();
  private readonly waiters: Array<{ start: () => void }> = [];
  private active = 0;
  constructor(private readonly concurrency: number, private readonly capacity: number, private readonly queueWaitMs = 8_000) {}

  run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const existing = this.flights.get(key);
    if (existing) return existing as Promise<T>;
    if (this.flights.size >= this.capacity) return Promise.reject(new BroccoliReadBusy());
    const task = (async () => {
      if (this.active >= this.concurrency) await new Promise<void>((resolve, reject) => {
        const waiter = { start: () => { clearTimeout(timer); resolve(); } };
        const timer = setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index !== -1) this.waiters.splice(index, 1);
          reject(new BroccoliReadBusy());
        }, this.queueWaitMs);
        this.waiters.push(waiter);
      });
      else this.active++;
      try { return await work(); }
      finally {
        const next = this.waiters.shift();
        if (next) next.start(); else this.active--;
      }
    })();
    this.flights.set(key, task);
    void task.finally(() => { if (this.flights.get(key) === task) this.flights.delete(key); }).catch(() => {});
    return task;
  }
}
