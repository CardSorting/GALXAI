import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RequestError } from './request-policy.js';

export type PoolId = 'premium' | 'standard';
export type Workload = 'text' | 'sites' | 'images';
export const PROJECTS = { central: 'mazhcjisettrzbqhorvp', premium: 'prgjcyokylzcsqrjmkaa', standard: 'enbtzuxkguehtnrhuvlu' } as const;
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
export const equalSecret = (a: unknown, b: string) => typeof a === 'string' && timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
export function bearer(req: IncomingMessage) {
  const value = req.headers.authorization;
  if (typeof value !== 'string' || !/^Bearer [A-Za-z0-9_-]{32,256}$/.test(value)) throw new RequestError(401, 'unauthorized', 'Sign in to continue.');
  return value.slice(7);
}
export function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  res.end(JSON.stringify(value));
}
export function failure(res: ServerResponse, error: unknown) {
  const status = error instanceof RequestError ? error.status : 503;
  json(res, status, { error: { code: error instanceof RequestError ? error.code : 'service_unavailable', message: error instanceof RequestError ? error.message : 'This service is temporarily unavailable.' } });
}
export function exactKeys(body: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(body).some(key => !keys.includes(key))) throw new RequestError(400, 'invalid_request', 'The request contains unsupported fields.');
}
export function serviceOrigin(value: string) {
  const u = new URL(value);
  if (u.username || u.password || u.search || u.hash || u.pathname !== '/' || (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(u.hostname)))) throw Error('An exact HTTPS service origin is required.');
  return u.origin;
}
export function assertProjectDatabase(value: string, project: string) {
  const u = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || !(u.hostname === `db.${project}.supabase.co` || u.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(u.username).endsWith(`.${project}`))) throw Error('Database project mismatch.');
}
/** Standard accepts text contracts only. Tool aliases cannot bypass the workload boundary. */
export function requestWorkload(pool: PoolId, pathname: string, body: Record<string, any>): Workload {
  const image = pathname.includes('/images/') || /^(image:|gpt-image|dall-e)/i.test(body.model ?? '');
  const sites = body.sites_profile !== undefined || body.require_output_limit !== undefined;
  if (pool === 'standard' && (image || sites || ['tools','tool_choice','functions','function_call','modalities','image','images','response_format'].some(key => body[key] !== undefined)
    || body.messages?.some((m: any) => typeof m?.content !== 'string'))) throw new RequestError(403, 'capability_unavailable', 'This request is not supported.');
  return image ? 'images' : sites ? 'sites' : 'text';
}
export interface PoolIdentity { pool: PoolId; installationId: string; }
export class CentralClient {
  readonly origin: string;
  constructor(origin: string, private readonly token: string, readonly identity: PoolIdentity, private readonly transport: typeof fetch = fetch) {
    this.origin = serviceOrigin(origin);
    if (!['premium','standard'].includes(identity.pool) || !uuid(identity.installationId) || !/^[A-Za-z0-9_-]{32,256}$/.test(token)) throw Error('Invalid service identity.');
  }
  async call<T = any>(route: string, body: Record<string, unknown> = {}): Promise<T> {
    if (!/^\/(runtime|operator|registrar)\/[a-z_-]+$/.test(route)) throw Error('Invalid service route.');
    const response = await this.transport(this.origin + route, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, ...this.identity }) });
    // Bound credential-bearing replies; never include raw responses in errors or logs.
    const reader = response.body?.getReader(); let size = 0; const chunks: Uint8Array[] = [];
    try { if (reader) for (;;) { const r = await reader.read(); if (r.done) break; size += r.value.length; if (size > 8 * 1024 * 1024) throw Error(); chunks.push(r.value); } }
    finally { await reader?.cancel().catch(() => {}); }
    if (!response.ok) {
      let code:string|undefined;try{code=JSON.parse(Buffer.concat(chunks).toString('utf8'))?.error?.code;}catch{}
      const registrationErrors:Record<string,string>={
        account_type_mismatch:`Sign in with a ${this.identity.pool==='premium'?'paid':'free'} account for this registration.`,
        account_type_unverified:'The account type could not be verified. Sign in again, then review the account.',
        models_unverified:'Model access could not be verified. Review the account after its connection is restored.',
        account_check_unavailable:'Account review is unavailable. Restore the central account service before retrying.',
      };
      if(code==='record_changed')throw new RequestError(409,code,'This item changed while you were editing. Close this dialog, refresh, and try again.');
      if(code&&Object.hasOwn(registrationErrors,code))throw new RequestError(response.status===422?422:503,code,registrationErrors[code]);
      throw new RequestError([400,401,403,404,409,429].includes(response.status) ? response.status : 503, 'control_unavailable', 'The action could not be confirmed. Refresh its status before retrying.');
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Error('Invalid service response.'); }
  }
}
