import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { CONNECT_SCOPE, ConnectError, clientById, connectConfig, requestOrigin, requireClientOrigin, uniqueParams, validRedirect, type ConnectConfig } from './config';
import { ConnectRepository, connectHash, connectSecret } from '@/lib/supabase/repositories/ConnectRepository';
import { requireRequestSession } from '@/lib/auth/request-session';
import { requireSessionMutation, SessionAccessError, withSessionCookies } from '@/lib/auth/session-http';
import { authEntryPath } from '@/lib/auth/redirects';
import { canonicalRequestUrl } from '@/lib/security/request-origin';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SECRET = /^[A-Za-z0-9_-]{43}$/;
export const connectHeaders = () => new Headers({ 'Cache-Control': 'private, no-store', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "frame-ancestors 'none'" });
export function connectJson(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: connectHeaders() }); }
const messages: Record<ConnectError['code'], string> = {
  invalid_request: 'This connection request is invalid or expired. Start again in your application.',
  invalid_client: 'This application is not supported.', invalid_scope: 'This permission is not supported.',
  invalid_target: 'This service is not supported.', invalid_grant: 'Connect the application again to continue.',
  access_denied: 'Access was not granted.', temporarily_unavailable: 'Connections are temporarily unavailable. Try again shortly.',
};
function failure(error: unknown): Response {
  if (error instanceof SessionAccessError) return withSessionCookies(connectJson({ error: error.status === 401 ? 'authentication_required' : 'access_denied', error_description: error.message }, error.status), error.cookies);
  const e = error instanceof ConnectError ? error : new ConnectError('temporarily_unavailable', 503);
  const response = connectJson({ error: e.code, error_description: messages[e.code] }, e.status);
  if (e.status === 503 || e.status === 429) response.headers.set('Retry-After', '3');
  return response;
}
export async function boundedText(request: Request, max = 8192): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new ConnectError('invalid_request');
  const chunks: Uint8Array[] = []; let length = 0;
  let expired = false;
  const timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, 10_000);
  let ended = false;
  try {
    for (;;) { const part = await reader.read(); if (part.done) { ended = true; break; } length += part.value.byteLength; if (length > max) throw new ConnectError('invalid_request'); chunks.push(part.value); }
    if (!ended || expired || request.signal.aborted) throw new ConnectError('invalid_request');
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } finally { clearTimeout(timer); await reader.cancel().catch(() => {}); }
}
async function form(request: Request): Promise<URLSearchParams> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/x-www-form-urlencoded') throw new ConnectError('invalid_request');
  return new URLSearchParams(await boundedText(request));
}
function flowCookie(config: ConnectConfig) { return config.issuer.startsWith('https:') ? '__Host-galx_connect_flow' : 'galx_connect_flow'; }
function browserHash(request: NextRequest, config: ConnectConfig): string {
  const value = request.cookies.get(flowCookie(config))?.value;
  if (!value || !SECRET.test(value)) throw new ConnectError('invalid_request');
  return connectHash(value);
}
function requestId(value: string | null): string { if (!value || !UUID.test(value)) throw new ConnectError('invalid_request'); return value; }
export function connectCors(response: Response, request: Request, config: ConnectConfig): Response {
  const origin = request.headers.get('origin');
  response.headers.set('Vary', 'Origin');
  if (origin && config.clients.some(c => c.origins.includes(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
    response.headers.set('Access-Control-Expose-Headers', 'Retry-After');
  }
  return response;
}
type Dependencies = { config: () => ConnectConfig; repository: (config: ConnectConfig) => ConnectRepository; session: typeof requireRequestSession };
const defaults: Dependencies = { config: connectConfig, repository: config => new ConnectRepository(config), session: requireRequestSession };

/** OAuth 2 authorization code/S256 PKCE endpoints on the existing account service. */
export function connectHandlers(deps: Dependencies = defaults) {
  async function handle(request: NextRequest, work: (config: ConnectConfig, repo: ConnectRepository) => Promise<Response>, cors = false) {
    let config: ConnectConfig | undefined;
    try {
      config = deps.config();
      if (requestOrigin(request) !== config.issuer) throw new ConnectError('invalid_request');
      const response = await work(config, deps.repository(config));
      return cors ? connectCors(response, request, config) : response;
    } catch (error) { const response = failure(error); return cors && config ? connectCors(response, request, config) : response; }
  }
  return {
    authorize: (request: NextRequest) => handle(request, async (config, repo) => {
      const p = canonicalRequestUrl(request).searchParams;
      uniqueParams(p, ['response_type','client_id','redirect_uri','scope','resource','state','code_challenge','code_challenge_method']);
      const client = clientById(config, p.get('client_id'));
      if (p.get('response_type') !== 'code' || p.get('code_challenge_method') !== 'S256' || !SECRET.test(p.get('code_challenge') || '') || !/^[A-Za-z0-9_-]{16,256}$/.test(p.get('state') || '') || !validRedirect(client, p.get('redirect_uri') || '')) throw new ConnectError('invalid_request');
      if (p.get('scope') !== CONNECT_SCOPE) throw new ConnectError('invalid_scope');
      if (p.get('resource') !== config.resource) throw new ConnectError('invalid_target');
      const cookie = request.cookies.get(flowCookie(config))?.value;
      const browser = cookie && SECRET.test(cookie) ? cookie : connectSecret();
      const id = await repo.begin({ client_id: client.id, redirect_uri: p.get('redirect_uri')!, resource: config.resource, state: p.get('state')!, challenge: p.get('code_challenge')! }, connectHash(browser));
      const response = NextResponse.redirect(new URL(`/connect/consent?request=${id}`, config.issuer), { status: 303, headers: connectHeaders() });
      response.cookies.set(flowCookie(config), browser, { httpOnly: true, secure: config.issuer.startsWith('https:'), sameSite: 'lax', path: '/', maxAge: 600 });
      return response;
    }),
    consent: (request: NextRequest) => handle(request, async (config, repo) => {
      const p = canonicalRequestUrl(request).searchParams; uniqueParams(p, ['request']);
      const id = requestId(p.get('request'));
      const authorization = await repo.authorization(id, browserHash(request, config));
      const actor = await deps.session(request);
      return withSessionCookies(connectJson({ application: clientById(config, authorization.client_id).name, inference_access: await repo.entitled(actor.user.id) }), actor.cookies);
    }),
    decision: (request: NextRequest) => handle(request, async (config, repo) => {
      requireSessionMutation(request);
      const p = await form(request); uniqueParams(p, ['request','decision']);
      if (!['allow','cancel'].includes(p.get('decision') || '')) throw new ConnectError('invalid_request');
      const actor = await deps.session(request);
      const redirect = await repo.decide(requestId(p.get('request')), browserHash(request, config), actor.user.id, p.get('decision') === 'allow');
      return withSessionCookies(connectJson({ redirect_uri: redirect }), actor.cookies);
    }),
    token: (request: NextRequest) => handle(request, async (config, repo) => {
      const p = await form(request);
      uniqueParams(p, ['grant_type','client_id','redirect_uri','resource','code','code_verifier','refresh_token']);
      const client = clientById(config, p.get('client_id')); requireClientOrigin(request, client);
      if (request.headers.has('authorization')) throw new ConnectError('invalid_client');
      if (p.get('resource') !== config.resource) throw new ConnectError('invalid_target');
      if (p.get('grant_type') === 'authorization_code') {
        if (p.has('refresh_token') || !SECRET.test(p.get('code') || '') || !/^[A-Za-z0-9._~-]{43,128}$/.test(p.get('code_verifier') || '') || !validRedirect(client, p.get('redirect_uri') || '')) throw new ConnectError('invalid_request');
        const challenge = createHash('sha256').update(p.get('code_verifier')!).digest('base64url');
        return connectJson(await repo.exchange({ clientId: client.id, code: p.get('code')!, redirectUri: p.get('redirect_uri')!, challenge }));
      }
      if (p.get('grant_type') === 'refresh_token' && !p.has('code') && !p.has('code_verifier') && !p.has('redirect_uri') && /^galx_connect_rt_[A-Za-z0-9_-]{43}$/.test(p.get('refresh_token') || '')) return connectJson(await repo.refresh(p.get('refresh_token')!, client.id));
      throw new ConnectError('invalid_request');
    }, true),
    revoke: (request: NextRequest) => handle(request, async (config, repo) => {
      const p = await form(request); uniqueParams(p, ['client_id','token','token_type_hint']);
      const client = clientById(config, p.get('client_id')); requireClientOrigin(request, client);
      if (request.headers.has('authorization') || !p.get('token')) throw new ConnectError('invalid_request');
      await repo.revokeToken(p.get('token')!, client.id);
      return new Response(null, { status: 200, headers: connectHeaders() });
    }, true),
    connections: (request: NextRequest) => handle(request, async (_config, repo) => {
      const actor = await deps.session(request);
      return withSessionCookies(connectJson({ connections: await repo.connections(actor.user.id), inference_access: await repo.entitled(actor.user.id) }), actor.cookies);
    }),
    disconnect: (request: NextRequest) => handle(request, async (config, repo) => {
      requireSessionMutation(request);
      const p = await form(request); uniqueParams(p, ['connection']);
      const actor = await deps.session(request);
      await repo.disconnect(requestId(p.get('connection')), actor.user.id);
      return withSessionCookies(new Response(null, { status: 204, headers: connectHeaders() }), actor.cookies);
    }),
    options: (request: NextRequest) => handle(request, async config => {
      const origin = request.headers.get('origin');
      if (!origin || !config.clients.some(c => c.origins.includes(origin))) throw new ConnectError('access_denied', 403);
      return new Response(null, { status: 204, headers: connectHeaders() });
    }, true),
    metadata: (request: NextRequest) => handle(request, async config => connectJson({
      issuer: config.issuer, authorization_endpoint: `${config.issuer}/oauth/authorize`, token_endpoint: `${config.issuer}/oauth/token`, revocation_endpoint: `${config.issuer}/oauth/revoke`,
      response_types_supported: ['code'], grant_types_supported: ['authorization_code','refresh_token'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], revocation_endpoint_auth_methods_supported: ['none'], scopes_supported: [CONNECT_SCOPE], authorization_response_iss_parameter_supported: true,
    })),
  };
}
export const connectRoutes = connectHandlers();
export function connectSignInPath(id?: string) { return authEntryPath(id && UUID.test(id) ? `/connect/consent?request=${id}` : '/connect'); }
