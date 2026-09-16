import { readSessionProfile } from './browser-session';

/** A read-only check, bounded across both attempts. Cookie refresh stays server-owned. */
export async function fetchBrowserSession(signal: AbortSignal) {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(25_000)]);
  for (let attempt = 0; ; attempt++) {
    let response: Response | undefined;
    try {
      response = await fetch('/api/auth/session', {
        credentials: 'same-origin', cache: 'no-store', signal: deadline,
        // Do not pin an SDK snapshot in Authorization: it can outlive a cookie refresh.
      });
    } catch {
      if (deadline.aborted || attempt > 0) throw new Error('Session unavailable');
    }
    if (response?.status === 401) return null;
    if (response?.ok) {
      const profile = readSessionProfile(await response.json());
      if (!profile) throw new Error('Invalid session response');
      return profile;
    }
    if (attempt > 0 || (response && response.status !== 429 && response.status < 500)) throw new Error('Session unavailable');
    const retryAfter = response?.headers.get('retry-after');
    const delay = retryAfter == null ? 500 : /^\d+$/.test(retryAfter)
      ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now();
    // Respect longer server backoff by leaving recovery to a later explicit check.
    if (!Number.isFinite(delay) || delay > 3000) throw new Error('Session unavailable');
    await new Promise<void>((resolve, reject) => {
      deadline.throwIfAborted();
      const abort = () => { clearTimeout(timer); reject(new Error('Session check cancelled')); };
      const timer = setTimeout(() => { deadline.removeEventListener('abort', abort); resolve(); }, Math.max(250, delay));
      deadline.addEventListener('abort', abort, { once: true });
    });
  }
}
