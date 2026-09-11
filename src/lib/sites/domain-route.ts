import { SiteDomainRegistry } from './domain-registry';
import { boundedDomainJson } from './cloudflare-dns';
import { SiteDomainError, domainPlan, domainView, exactDomainFields, requireDomain, siteProjectId, type DomainPlan } from './domains';

export interface SiteDomainDependencies {
  authenticate(request: Request): Promise<{ id: string }>;
  registry(): SiteDomainRegistry;
  authorizeMutation(accountId: string): void;
  dns(): { ensure(plan: DomainPlan, reservationId: string, signal: AbortSignal): Promise<void> };
  verifyHttps(hostname: string, signal: AbortSignal): Promise<boolean>;
}
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export function sitesDomainRoute(deps: SiteDomainDependencies) {
  return async (request: Request): Promise<Response> => {
    const fail = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
    if (!['GET', 'POST'].includes(request.method)) return fail(405, 'method_not_allowed');
    if (!/^Bearer [^\s]{1,8192}$/.test(request.headers.get('authorization') || '')) return fail(401, 'sign_in_required');
    let account: { id: string };
    try { account = await deps.authenticate(request); } catch { return fail(401, 'sign_in_required'); }
    try {
      const registry = deps.registry();
      if (request.method === 'GET') {
        const id = new URL(request.url).searchParams.get('projectId'); siteProjectId(id);
        return Response.json(domainView(await registry.get(account.id, id)), { headers });
      }
      deps.authorizeMutation(account.id);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return fail(415, 'json_required');
      let body: any;
      try { body = await boundedDomainJson(new Response(request.body), 8192,
        AbortSignal.any([request.signal, AbortSignal.timeout(10000)])); } catch { return fail(400, 'invalid_request'); }
      requireDomain(body && typeof body === 'object'); siteProjectId(body.projectId);
      if (body.action === 'reserve') {
        exactDomainFields(body, ['action', 'projectId', 'username', 'appName']);
        return Response.json(domainView(await registry.reserve(account.id, body.projectId, body.username, body.appName)), { headers });
      }
      if (body.action === 'attach') {
        exactDomainFields(body, ['action', 'projectId']);
        const first = await registry.startAttachment(account.id, body.projectId);
        return Response.json(domainView(await registry.get(account.id, body.projectId)), { status: first ? 201 : 200, headers });
      }
      requireDomain(body.action === 'configure' || body.action === 'reconcile');
      exactDomainFields(body, body.action === 'configure' ? ['action', 'projectId', 'registration'] : ['action', 'projectId']);
      const original = await registry.get(account.id, body.projectId);
      const plan = body.action === 'configure' ? domainPlan(body.registration, original.hostname) : undefined;
      const row = await registry.claim(account.id, body.projectId, plan);
      let active = false, error: string | null = null;
      try {
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
        await deps.dns().ensure(row.plan!, row.id, signal);
        active = await deps.verifyHttps(row.hostname, signal);
      } catch (caught) { error = caught instanceof SiteDomainError ? caught.code : 'domain_unavailable'; }
      return Response.json(domainView(await registry.finish(row, active, error)), { headers });
    } catch (error) {
      const allowed = new Set(['invalid_request', 'invalid_username', 'invalid_app_name', 'username_unavailable', 'username_conflict',
        'address_unavailable', 'domain_limit_reached', 'domain_not_found', 'domain_pending', 'check_later', 'domain_attachment_required', 'domain_conflict', 'invalid_domain_records']);
      return error instanceof SiteDomainError && allowed.has(error.code) ? fail(error.status, error.code) : fail(503, 'domain_unavailable');
    }
  };
}
