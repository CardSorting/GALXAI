type PrefetchRouter = { prefetch(href: string): void };
type Connection = { saveData?: boolean; effectiveType?: string };

export function createIntentPrefetchBudget() {
  const recent = new Map<string, number>();
  return (href: string, now: number) => {
    for (const [key, time] of recent) if (now - time >= 30_000) recent.delete(key);
    if (recent.has(href)) return false;
    if ([...recent.values()].filter(time => now - time < 10_000).length >= 3) return false;
    recent.set(href, now);
    return true;
  };
}
const claim = createIntentPrefetchBudget();

export function prefetchOnIntent(router: PrefetchRouter, href: string) {
  if (typeof window === 'undefined' || document.visibilityState !== 'visible' || !navigator.onLine) return;
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType || '')) return;
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('\\')) return;
  const target = new URL(href, window.location.origin);
  if (/^\/(?:api|v1|auth|admin)(?:\/|$)/.test(target.pathname)) return;
  if (target.pathname === window.location.pathname && target.search === window.location.search) return;
  const route = target.pathname + target.search;
  if (claim(route, Date.now())) { try { router.prefetch(route); } catch { /* Navigation remains available. */ } }
}
