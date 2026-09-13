/** One request at a time; hidden/offline time never produces catch-up bursts. */
export interface PollingEnvironment {
  active(): boolean;
  now(): number;
  schedule(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  cancel(timer: ReturnType<typeof setTimeout>): void;
  subscribe(callback: () => void): () => void;
}

export const browserPollingEnvironment: PollingEnvironment = {
  active: () => document.visibilityState === 'visible' && navigator.onLine,
  now: () => Date.now(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: timer => clearTimeout(timer),
  subscribe(callback) {
    document.addEventListener('visibilitychange', callback);
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
      document.removeEventListener('visibilitychange', callback);
      window.removeEventListener('online', callback);
      window.removeEventListener('offline', callback);
    };
  },
};

export function startActivityPolling(
  task: (signal: AbortSignal) => Promise<number | null>,
  environment = browserPollingEnvironment,
  initialDelayMs = 0,
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let nextAt = environment.now() + Math.max(0, initialDelayMs), running = false, done = false;
  const schedule = () => {
    if (timer !== undefined) environment.cancel(timer);
    timer = undefined;
    if (done || running || !environment.active()) return;
    timer = environment.schedule(() => { void run(); }, Math.min(2_147_483_647, Math.max(0, nextAt - environment.now())));
  };
  const run = async () => {
    timer = undefined;
    if (done || running || !environment.active()) return;
    if (environment.now() < nextAt) { schedule(); return; }
    running = true;
    try {
      const delay = await task(controller.signal);
      if (delay === null || !Number.isFinite(delay) || delay < 0) done = true;
      else nextAt = environment.now() + Math.max(1000, delay);
    } catch { done = true; } // The caller owns the visible error and explicit retry.
    finally { running = false; schedule(); }
  };
  const unsubscribe = environment.subscribe(schedule);
  schedule();
  return () => {
    done = true;
    if (timer !== undefined) environment.cancel(timer);
    unsubscribe();
    controller.abort();
  };
}

export function retryAfterDelay(retryAfter: string | null, now = Date.now()): number {
  const server = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000
    : retryAfter ? Date.parse(retryAfter) - now : 0;
  return Number.isFinite(server) ? Math.max(0, server) : 0;
}

/** A server's Retry-After is a floor, including when a tab becomes visible. */
export function imageStatusDelay(attempt: number, retryAfter: string | null, now = Date.now()): number {
  const adaptive = Math.min(10_000, 2500 * 2 ** Math.min(2, Math.floor(Math.max(0, attempt) / 4)));
  return Math.max(adaptive, retryAfterDelay(retryAfter, now));
}

/** Back off failed recovery reads; jitter spreads reconnects without shortening server hints. */
export function recoveryDelay(failures: number, retryAfter: string | null, now = Date.now(), random = Math.random()): number {
  const base = Math.min(50_000, 8000 * 2 ** Math.min(3, Math.max(0, failures - 1)));
  const delay = Math.min(60_000, Math.ceil(base * (1 + Math.max(0, Math.min(1, random)) * 0.2)));
  return Math.max(delay, retryAfterDelay(retryAfter, now));
}
