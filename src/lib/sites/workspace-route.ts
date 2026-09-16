import { SitesBillingError, type SitesGenerationReply } from '../billing/sites-generation';
import { FreeQuotaError } from '../billing/free-generation-quota';
import { FreeGenerationGateError } from '../billing/free-generation-gate';
import { boundedDomainJson } from './cloudflare-dns';
import { SiteDomainError } from './domains';
import { readSiteSummary, type SiteDocument, type SitesAccess, type SiteIntent } from './workspace-contract';
import { conversationMessages, readConversationResult, ConversationInputError, type ConversationContext } from './conversation-context';
import { FairUsageError } from './fair-policy';
import type { IncludedGenerationReply } from './included-generation';
import { SitesWorkspaceRepository, WorkspaceError, workspaceView } from './workspace-repository';
import { requireSessionMutation, sessionBearer, SessionAccessError, withSessionCookies, type SessionCookie } from '../auth/session-http';

export interface WorkspaceDependencies {
  authenticate(request: Request): Promise<{ id: string; cookies?: SessionCookie[] }>;
  repository(): SitesWorkspaceRepository;
  requireAccess(owner: string): Promise<void | 'pro' | 'free'>;
  prepare(owner: string, signal: AbortSignal): Promise<{ free?: boolean; generate(operation: string, brief: string, document: SiteDocument | null, context?: ConversationContext): Promise<IncludedGenerationReply> }>;
  recover(owner: string, operation: string, signal: AbortSignal, mode: 'legacy' | 'included'): Promise<SitesGenerationReply | IncludedGenerationReply>;
  canPublish?(owner: string): boolean;
  publish?(owner: string, id: string, revision: number, username: string): Promise<Parameters<typeof workspaceView>[0]>;
}
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const fail = (status: number, publicCode?: 'free_generation_paused' | 'free_generation_busy' | 'free_quota_exhausted' | 'free_site_limit' | 'invalid_username' | 'username_unavailable' | 'rate_limited' | 'request_too_long', retry?:number) => Response.json({ error: { code: publicCode || ({401:'sign_in_required',403:'paid_plan_required',404:'site_not_found',409:'site_changed',429:'site_limit_reached'} as Record<number,string>)[status] || 'site_unavailable' } }, { status, headers:{...headers,...(retry?{'Retry-After':String(retry)}:{})} });
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const keys = (v: Record<string, unknown>, names: string) => Object.keys(v).sort().join(',') === names;
const title = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 90 && !/[\u0000-\u001f\u007f]/.test(v);
export function sitesWorkspaceRoute(deps: WorkspaceDependencies) {
  return async (request: Request): Promise<Response> => {
    let owner: string, cookies: SessionCookie[];
    try {
      sessionBearer(request); // Reject malformed explicit credentials; verified cookies are also supported.
      if (!['GET', 'HEAD'].includes(request.method)) requireSessionMutation(request);
      const actor = await deps.authenticate(request); owner = actor.id; cookies = actor.cookies || [];
    } catch (error) {
      return withSessionCookies(fail(error instanceof SessionAccessError ? error.status : 503), error instanceof SessionAccessError ? error.cookies : []);
    }
    const response = await (async () => {
    try {
      const url = new URL(request.url), repo = deps.repository();
      const reply = (row: Parameters<typeof workspaceView>[0]) => Response.json({ site: workspaceView(row) }, { headers });
      if (request.method === 'GET') {
        const positive=(v:string|null)=>v!==null && /^[1-9][0-9]{0,8}$/.test(v)?Number(v):undefined;
        const setup = async () => {
          let access: SitesAccess = 'unavailable';
          try { const prepared=await deps.prepare(owner,request.signal); access=prepared.free ? 'free' : 'included'; }
          catch(error) { if(error instanceof FairUsageError && error.status===403)access='paid_plan_required'; }
          return { access, publishing: (access==='included' || access==='free') && deps.canPublish?.(owner) ? 'available' : 'unavailable', username:await repo.username(owner) };
        };
        if (url.searchParams.get('view') === 'bootstrap') {
          const names = [...url.searchParams.keys()].sort().join(',');
          const id = url.searchParams.get('id');
          if (!(names === 'view' || (names === 'id,view' && uuid(id)))) return fail(400);
          const [sites, state, row] = await Promise.all([
            repo.library(owner), setup(), id ? repo.get(owner,id) : Promise.resolve(null),
          ]);
          return Response.json({ sites: sites.map(readSiteSummary), setup: state, site: row ? workspaceView(row) : null }, { headers });
        }
        if (url.searchParams.has('id')) {
          const id=url.searchParams.get('id'); if(!uuid(id))return fail(400);
          const names=[...url.searchParams.keys()].sort().join(','),view=url.searchParams.get('view');
          if(names==='id')return reply(await repo.get(owner,id));
          if(names==='id,version' && positive(url.searchParams.get('version')))return Response.json(await repo.version(owner,id,positive(url.searchParams.get('version'))!),{headers});
          if((names==='id,view' || names==='before,id,view') && ['history','versions'].includes(view || '')){
            const before=positive(url.searchParams.get('before'));if(url.searchParams.has('before') && !before)return fail(400);
            return Response.json(view==='history'?await repo.history(owner,id,before):await repo.versions(owner,id,before),{headers});
          }
          return fail(400);
        }
        if(url.searchParams.size>1)return fail(400);
        if(url.searchParams.get('view')==='library')return Response.json({sites:await repo.library(owner)},{headers});
        if (url.searchParams.get('view') === 'setup') {
          return Response.json(await setup(), { headers });
        }
        if (url.search) return fail(400);
        return Response.json({ sites: (await repo.list(owner)).map(workspaceView) }, { headers });
      }
      if (request.method !== 'POST') return fail(405);
      if (url.search || !request.headers.get('content-type')?.startsWith('application/json')) return fail(400);
      const body = await boundedDomainJson(new Response(request.body), 12000, AbortSignal.any([request.signal, AbortSignal.timeout(5000)])) as Record<string, any>;
      if (!body || Array.isArray(body) || !uuid(body.id)) return fail(400);
      if (body.action === 'create' && keys(body,'action,id,title') && title(body.title)) { const plan=await deps.requireAccess(owner); return reply(await repo.create(owner,body.id,body.title.trim(),plan==='free')); }
      if (body.action === 'rename' && keys(body,'action,id,revision,title') && title(body.title) && Number.isSafeInteger(body.revision))
        return reply(await repo.update(owner,body.id,body.revision,{title:body.title.trim()}));
      if (body.action === 'archive' && keys(body,'action,archived,id,revision') && typeof body.archived === 'boolean' && Number.isSafeInteger(body.revision))
        return reply(await repo.update(owner,body.id,body.revision,{archived:body.archived}));
      if(body.action === 'publish' && keys(body,'action,audience,id,revision,username') && body.audience==='public' && Number.isSafeInteger(body.revision) && typeof body.username==='string'){
        await repo.get(owner,body.id);
        if (await deps.requireAccess(owner)==='free') await repo.requireFreeSite(owner,body.id);
        if(!deps.canPublish?.(owner) || !deps.publish)return fail(503);
        return reply(await deps.publish(owner,body.id,body.revision,body.username));
      }
      if(body.action === 'unpublish' && keys(body,'action,id,revision') && Number.isSafeInteger(body.revision))return reply(await repo.unpublish(owner,body.id,body.revision));
      if(body.action==='context' && keys(body,'action,id,notes,revision') && Number.isSafeInteger(body.revision) && typeof body.notes==='string' && Buffer.byteLength(body.notes)<=2000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.notes))
        return reply(await repo.update(owner,body.id,body.revision,{notes:body.notes.trim()}));
      if(body.action==='restore' && keys(body,'action,id,revision,version') && Number.isSafeInteger(body.revision) && Number.isSafeInteger(body.version) && body.version>0)
        return reply(await repo.restore(owner,body.id,body.revision,body.version));
      const finish = async (operation: string, result: SitesGenerationReply | IncludedGenerationReply, intent:SiteIntent='build') => {
        if ('completed' in result ? !result.completed : !result.cost) return reply(await repo.get(owner,body.id));
        if ('notStarted' in result && result.notStarted) return reply(await repo.finish(owner,body.id,operation,null,
          'This update did not start. Please try again later.',null,true,true));
        const parsed=readConversationResult(result.text,intent);
        return reply(await repo.finish(owner,body.id,operation,parsed?.document || null,parsed?.message ||
          'This reply could not be saved. Your previous draft is safe. Please try again.',parsed?.memory ?? null,!parsed));
      };
      if (body.action === 'recover' && keys(body,'action,id')) {
        const row = await repo.get(owner,body.id); if (!row.operation_id) return reply(row);
        try { return await finish(row.operation_id, await deps.recover(owner,`${body.id}:${row.operation_id}`,request.signal,row.operation_mode || 'legacy'),row.operation_intent || 'build'); }
        catch (error) {
          if (((error instanceof SitesBillingError && error.code === 'billing_receipt_unavailable') || (error instanceof FairUsageError && error.reason==='invocation_missing')) && row.operation_started_at && Date.now()-row.operation_started_at.getTime()>120000)
            return reply(await repo.finish(owner,body.id,row.operation_id,null,'This update did not start. You can try again.',null,true));
          return reply(row); // Never resubmit an uncertain generation.
        }
      }
      if (body.action !== 'generate' || !(keys(body,'action,brief,id,operationId,revision') || keys(body,'action,brief,id,intent,operationId,revision')) || !uuid(body.operationId) ||
        !Number.isSafeInteger(body.revision) || typeof body.brief !== 'string' || !body.brief.trim() || Buffer.byteLength(body.brief)>2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.brief) || (body.intent!==undefined && !['build','discuss'].includes(body.intent))) return fail(400);
      const current=await repo.get(owner,body.id); // Ownership precedes admission and inference.
      const intent:SiteIntent=body.intent || 'build',brief=body.brief.trim();
      const previous=await repo.turn(owner,body.id,body.operationId);
      if(previous){
        if(previous.user_text!==brief || previous.intent!==intent) return fail(409);
        return reply(current); // A repeated delivery never dispatches a second turn.
      }
      const context:ConversationContext={document:current.document,notes:current.project_notes || '',summary:current.context_summary || '',
        messages:current.messages.filter(m=>(m.turn || 0)>(current.context_start_turn || 0)),intent};
      conversationMessages(brief,context); // Validate the complete input before reserving this turn.
      const prepared = await deps.prepare(owner,request.signal);
      context.recalled=await repo.recall(owner,body.id,body.revision,brief);
      const row = await repo.begin(owner,body.id,body.revision,body.operationId,brief,intent,prepared.free);
      try { return await finish(body.operationId,await prepared.generate(`${body.id}:${body.operationId}`,brief,row.document,context),intent); }
      catch (error) {
        // Only proven pre-admission deferrals can clear the workspace operation.
        if (error instanceof FairUsageError && error.beforeAdmission) {
          await repo.finish(owner,body.id,body.operationId,null,'This update did not start. Please try again later.',null,true,true);
          return fail(error.status,error.reason==='free_capacity'?'free_generation_busy':error.status===429?'rate_limited':undefined,error.retryAfter);
        }
        return reply(await repo.get(owner,body.id));
      }
    } catch (error) {
      if(error instanceof FreeGenerationGateError)return fail(429,error.code);
      if(error instanceof FreeQuotaError)return fail(402,error.code);
      if(error instanceof ConversationInputError)return fail(400,'request_too_long');
      if(error instanceof FairUsageError)return fail(error.status,error.status===429?'rate_limited':undefined,error.retryAfter);
      if (error instanceof SiteDomainError && error.code === 'invalid_username') return fail(400,'invalid_username');
      if (error instanceof SiteDomainError && ['username_unavailable','username_conflict','address_unavailable'].includes(error.code)) return fail(409,'username_unavailable');
      return fail(error instanceof WorkspaceError ? error.status : 503);
    }
    })();
    return withSessionCookies(response, cookies);
  };
}
