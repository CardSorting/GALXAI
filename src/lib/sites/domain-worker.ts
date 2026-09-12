import { timingSafeEqual } from 'node:crypto';
import { requireSitesCohort } from '../billing/sites-activation';
import { SiteDomainRegistry } from './domain-registry';
import { SiteDomainError, type DomainPlan } from './domains';

export interface DomainWorkerDependencies {
  token(): string | undefined;
  enabled(): boolean;
  accounts(): string | undefined;
  includeManaged?(): boolean;
  registry(): SiteDomainRegistry;
  dns(): { ensure(plan: DomainPlan, reservationId: string, signal: AbortSignal): Promise<void> };
  verifyHttps(hostname: string, signal: AbortSignal): Promise<boolean>;
  prepareManagedHost?(plan: DomainPlan, signal: AbortSignal): Promise<void>;
  verifyManagedHttps?(hostname: string, signal: AbortSignal): Promise<boolean>;
}
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
async function emptyBody(request: Request): Promise<boolean> {
  if (!request.body) return true;
  const reader = request.body.getReader();
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(3000)]);
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const part = await reader.read(); signal.throwIfAborted();
      if (part.done) return true;
      if (part.value.byteLength) { await reader.cancel(); return false; }
    }
  } catch { return false; }
  finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}
/** Dedicated machine authority, never a cookie, customer JWT or claimed admin role. */
export function domainWorkerRoute(deps: DomainWorkerDependencies) {
  return async (request: Request): Promise<Response> => {
    const fail = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
    const token = deps.token(), supplied = request.headers.get('authorization') || '';
    if (!token || !/^[a-f0-9]{64}$/.test(token) || !/^Bearer [a-f0-9]{64}$/.test(supplied) ||
        !timingSafeEqual(Buffer.from(supplied.slice(7)), Buffer.from(token))) return fail(401, 'sign_in_required');
    if (request.method !== 'POST') return fail(405, 'method_not_allowed');
    // No submitted account, plan, target, callback or batch-size authority.
    if (new URL(request.url).search || !await emptyBody(request)) return fail(400, 'invalid_request');
    if (!deps.enabled()) return fail(503, 'domain_unavailable');
    try {
      const raw = deps.accounts(), includeManaged = deps.includeManaged?.() === true;
      if ((raw && raw.length > 16384) || (!raw && !includeManaged)) throw new Error();
      const accounts: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(accounts)) throw new Error();
      if (accounts.length) {
        if(typeof accounts[0] !== 'string')throw new Error();
        requireSitesCohort(raw, accounts[0]); // Native companion scope remains explicit.
      } else if (!includeManaged) throw new Error();
      const registry = deps.registry();
      const rows = await registry.claimDue(accounts, 4, includeManaged);
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
      const completed = await Promise.allSettled(rows.map(async row => {
        let active = false, diagnostic: string | null = null;
        try {
          signal.throwIfAborted();
          if (row.plan?.kind === 'managed') {
            if (!deps.prepareManagedHost || !deps.verifyManagedHttps) throw new Error();
            await deps.prepareManagedHost(row.plan,signal);
          }
          await deps.dns().ensure(row.plan!, row.id, signal);
          active = row.plan?.kind === 'managed' ? await deps.verifyManagedHttps!(row.hostname,signal) : await deps.verifyHttps(row.hostname, signal);
          if (!active) diagnostic = 'https_pending';
        } catch (error) { diagnostic = error instanceof SiteDomainError ? error.code : 'domain_unavailable'; }
        await registry.finish(row, active, diagnostic);
      }));
      if (completed.some(result => result.status === 'rejected')) throw new Error();
      return new Response(null, { status: 204, headers });
    } catch { return fail(503, 'domain_unavailable'); }
  };
}
