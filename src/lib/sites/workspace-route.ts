import { SitesBillingError, type SitesGenerationReply } from '../billing/sites-generation';
import { boundedDomainJson } from './cloudflare-dns';
import { SiteDomainError } from './domains';
import { readSiteDocument, type SiteDocument, type SitesAccess } from './workspace-contract';
import { FairUsageError } from './fair-policy';
import type { IncludedGenerationReply } from './included-generation';
import { SitesWorkspaceRepository, WorkspaceError, workspaceView } from './workspace-repository';

export interface WorkspaceDependencies {
  authenticate(request: Request): Promise<{ id: string }>;
  repository(): SitesWorkspaceRepository;
  requireAccess(owner: string): Promise<void>;
  prepare(owner: string, signal: AbortSignal): Promise<{ generate(operation: string, brief: string, document: SiteDocument | null): Promise<IncludedGenerationReply> }>;
  recover(owner: string, operation: string, signal: AbortSignal, mode: 'legacy' | 'included'): Promise<SitesGenerationReply | IncludedGenerationReply>;
  canPublish?(owner: string): boolean;
  publish?(owner: string, id: string, revision: number, username: string): Promise<Parameters<typeof workspaceView>[0]>;
}
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const fail = (status: number, publicCode?: 'invalid_username' | 'username_unavailable' | 'rate_limited', retry?:number) => Response.json({ error: { code: publicCode || ({401:'sign_in_required',403:'paid_plan_required',404:'site_not_found',409:'site_changed',429:'site_limit_reached'} as Record<number,string>)[status] || 'site_unavailable' } }, { status, headers:{...headers,...(retry?{'Retry-After':String(retry)}:{})} });
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const keys = (v: Record<string, unknown>, names: string) => Object.keys(v).sort().join(',') === names;
const title = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 90 && !/[\u0000-\u001f\u007f]/.test(v);
export function sitesWorkspaceRoute(deps: WorkspaceDependencies) {
  return async (request: Request): Promise<Response> => {
    if (!/^Bearer [^\s]{1,8192}$/.test(request.headers.get('authorization') || '')) return fail(401);
    let owner: string; try { owner = (await deps.authenticate(request)).id; } catch { return fail(401); }
    try {
      const url = new URL(request.url), repo = deps.repository();
      const reply = (row: Parameters<typeof workspaceView>[0]) => Response.json({ site: workspaceView(row) }, { headers });
      if (request.method === 'GET') {
        if (url.searchParams.size > 1) return fail(400);
        if (url.searchParams.has('id')) { const id = url.searchParams.get('id'); if (!uuid(id)) return fail(400); return reply(await repo.get(owner,id)); }
        if (url.searchParams.get('view') === 'setup') {
          let access: SitesAccess = 'unavailable';
          try { await deps.prepare(owner,request.signal); access='included'; }
          catch(error) { if(error instanceof FairUsageError && error.status===403)access='paid_plan_required'; }
          return Response.json({ access, publishing: access==='included' && deps.canPublish?.(owner) ? 'available' : 'unavailable',username:await repo.username(owner) }, { headers });
        }
        if (url.search) return fail(400);
        return Response.json({ sites: (await repo.list(owner)).map(workspaceView) }, { headers });
      }
      if (request.method !== 'POST') return fail(405);
      if (url.search || !request.headers.get('content-type')?.startsWith('application/json')) return fail(400);
      const body = await boundedDomainJson(new Response(request.body), 12000, AbortSignal.any([request.signal, AbortSignal.timeout(5000)])) as Record<string, any>;
      if (!body || Array.isArray(body) || !uuid(body.id)) return fail(400);
      if (body.action === 'create' && keys(body,'action,id,title') && title(body.title)) { await deps.requireAccess(owner); return reply(await repo.create(owner,body.id,body.title.trim())); }
      if (body.action === 'rename' && keys(body,'action,id,revision,title') && title(body.title) && Number.isSafeInteger(body.revision))
        return reply(await repo.update(owner,body.id,body.revision,{title:body.title.trim()}));
      if (body.action === 'archive' && keys(body,'action,archived,id,revision') && typeof body.archived === 'boolean' && Number.isSafeInteger(body.revision))
        return reply(await repo.update(owner,body.id,body.revision,{archived:body.archived}));
      if(body.action === 'publish' && keys(body,'action,audience,id,revision,username') && body.audience==='public' && Number.isSafeInteger(body.revision) && typeof body.username==='string'){
        await repo.get(owner,body.id);
        await deps.requireAccess(owner);
        if(!deps.canPublish?.(owner) || !deps.publish)return fail(503);
        return reply(await deps.publish(owner,body.id,body.revision,body.username));
      }
      if(body.action === 'unpublish' && keys(body,'action,id,revision') && Number.isSafeInteger(body.revision))return reply(await repo.unpublish(owner,body.id,body.revision));
      const finish = async (operation: string, result: SitesGenerationReply | IncludedGenerationReply) => {
        if ('completed' in result ? !result.completed : !result.cost) return reply(await repo.get(owner,body.id));
        let document: SiteDocument | null = null;
        try { document = readSiteDocument(JSON.parse(result.text)); } catch { /* Keep the last valid draft. */ }
        return reply(await repo.finish(owner,body.id,operation,document,document ? 'Your draft is ready to preview. Tell me what you’d like to change.'
          : 'This update could not produce a usable draft. Your previous draft is safe. You can try again.'));
      };
      if (body.action === 'recover' && keys(body,'action,id')) {
        const row = await repo.get(owner,body.id); if (!row.operation_id) return reply(row);
        try { return await finish(row.operation_id, await deps.recover(owner,`${body.id}:${row.operation_id}`,request.signal,row.operation_mode || 'legacy')); }
        catch (error) {
          if (((error instanceof SitesBillingError && error.code === 'billing_receipt_unavailable') || (error instanceof FairUsageError && error.reason==='invocation_missing')) && row.operation_started_at && Date.now()-row.operation_started_at.getTime()>120000)
            return reply(await repo.finish(owner,body.id,row.operation_id,null,'This update did not start. You can try again.'));
          return reply(row); // Never resubmit an uncertain generation.
        }
      }
      if (body.action !== 'generate' || !keys(body,'action,brief,id,operationId,revision') || !uuid(body.operationId) ||
        !Number.isSafeInteger(body.revision) || typeof body.brief !== 'string' || !body.brief.trim() || Buffer.byteLength(body.brief)>2000 || /[\u0000-\u001f\u007f]/.test(body.brief)) return fail(400);
      await repo.get(owner,body.id); // Check ownership before any admission or inference.
      const prepared = await deps.prepare(owner,request.signal);
      const row = await repo.begin(owner,body.id,body.revision,body.operationId,body.brief.trim());
      try { return await finish(body.operationId,await prepared.generate(`${body.id}:${body.operationId}`,body.brief.trim(),row.document)); }
      catch (error) {
        // Only proven pre-admission deferrals can clear the workspace operation.
        if (error instanceof FairUsageError && error.beforeAdmission) {
          await repo.finish(owner,body.id,body.operationId,null,'This update did not start. Please try again later.');
          return fail(error.status,error.status===429?'rate_limited':undefined,error.retryAfter);
        }
        return reply(await repo.get(owner,body.id));
      }
    } catch (error) {
      if(error instanceof FairUsageError)return fail(error.status,error.status===429?'rate_limited':undefined,error.retryAfter);
      if (error instanceof SiteDomainError && error.code === 'invalid_username') return fail(400,'invalid_username');
      if (error instanceof SiteDomainError && ['username_unavailable','username_conflict','address_unavailable'].includes(error.code)) return fail(409,'username_unavailable');
      return fail(error instanceof WorkspaceError ? error.status : 503);
    }
  };
}
