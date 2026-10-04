import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { connectHandlers } from '../src/lib/connect/http';
import { connectConfig, requestOrigin, validRedirect, type ConnectConfig } from '../src/lib/connect/config';
import { requireRequestSession } from '../src/lib/auth/request-session';
import { SessionAccessError } from '../src/lib/auth/session-http';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { isPublicProductPath } from '../src/lib/security/preview-policy';
import { safeAuthRedirect } from '../src/lib/auth/redirects';
import { GET as accountCallback } from '../src/app/auth/callback/route';

const config: ConnectConfig = { issuer: 'https://galx.test', resource: 'https://nova.test', clients: [
  { id: 'browser', name: 'Example Studio', kind: 'browser', redirectUris: ['https://studio.test/callback'], origins: ['https://studio.test'] },
  { id: 'native', name: 'Native Studio', kind: 'native', redirectUris: ['http://127.0.0.1/callback'], origins: [] },
] };
const authorization = { response_type: 'code', client_id: 'browser', redirect_uri: 'https://studio.test/callback', resource: config.resource, scope: 'inference:invoke', state: 'a'.repeat(32), code_challenge_method: 'S256', code_challenge: 'b'.repeat(43) };
const req = (path: string, values?: Record<string, string>, headers: Record<string, string> = {}) => new NextRequest(`${config.issuer}${path}`, values ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams(values) } : { headers });
function fixture(overrides: Record<string, unknown> = {}, session?: any) {
  let calls = 0;
  const repo = { begin: async () => { calls++; return '00000000-0000-4000-8000-000000000001'; }, ...overrides } as any;
  return { handlers: connectHandlers({ config: () => config, repository: () => repo, session: session || (async () => { throw new SessionAccessError(401); }) }), calls: () => calls };
}
test('NextRequest loopback normalization preserves exact authority and consent CSRF boundaries', async () => {
  const local = { ...config, issuer: 'http://127.0.0.1:3000', resource: 'http://127.0.0.1:3000' };
  let decisions = 0;
  const handlers = connectHandlers({ config: () => local, repository: () => ({
    decide: async () => { decisions++; return 'https://studio.test/callback'; },
  }) as any, session: (async () => ({ user: { id: 'owner' }, cookies: [] })) as any });
  const metadata = new NextRequest(`${local.issuer}/.well-known/oauth-authorization-server`);
  assert.equal(new URL(metadata.url).hostname, 'localhost');
  assert.equal(requestOrigin(metadata), local.issuer);
  assert.equal((await handlers.metadata(metadata)).status, 200);
  for (const wrong of ['http://localhost:3000', 'http://127.0.0.1:3001', 'https://evil.test']) {
    const spoof = new NextRequest(`${wrong}/.well-known/oauth-authorization-server`, { headers: { Host: '127.0.0.1:3000', 'X-Forwarded-Host': '127.0.0.1:3000' } });
    assert.equal((await handlers.metadata(spoof)).status, 400);
  }
  const decision = (origin: string) => new NextRequest(`${local.issuer}/api/connect/consent`, { method: 'POST', headers: {
    Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: `galx_connect_flow=${'a'.repeat(43)}`,
  }, body: new URLSearchParams({ request: '00000000-0000-4000-8000-000000000001', decision: 'allow' }) });
  assert.equal((await handlers.decision(decision(local.issuer))).status, 200);
  assert.equal((await handlers.decision(decision('http://localhost:3000'))).status, 403);
  assert.equal((await handlers.decision(decision('http://127.0.0.1:4400'))).status, 403);
  assert.equal(decisions, 1);
  const callback = await accountCallback(new NextRequest(`${local.issuer}/auth/callback?error=access_denied&next=/connect`));
  assert.equal(new URL(callback.headers.get('location')!).origin, local.issuer);
});
test('authorization validates exact client, resource, narrow scope, state and S256 before storage or redirects', async () => {
  for (const changed of [{ redirect_uri: 'https://evil.test/' }, { client_id: 'missing' }, { scope: '*' }, { resource: 'https://galx.test' }, { response_type: 'token' }, { code_challenge_method: 'plain' }, { code_challenge: 'short' }, { state: '' }]) {
    const f = fixture(); const r = await f.handlers.authorize(req(`/oauth/authorize?${new URLSearchParams({ ...authorization, ...changed })}`));
    assert.equal(r.status, 400); assert.equal(f.calls(), 0); assert.equal(r.headers.get('location'), null);
    assert.doesNotMatch(await r.text(), /evil\.test|stack|postgres|code_challenge/);
  }
  for (const suffix of ['&client_id=browser', '&scope=inference%3Ainvoke', '&prompt=none']) {
    const f = fixture(); assert.equal((await f.handlers.authorize(req(`/oauth/authorize?${new URLSearchParams(authorization)}${suffix}`))).status, 400); assert.equal(f.calls(), 0);
  }
});
test('valid authorization binds a private browser cookie and returns only a same-origin consent reference', async () => {
  const f = fixture(); const r = await f.handlers.authorize(req(`/oauth/authorize?${new URLSearchParams(authorization)}`));
  assert.equal(r.status, 303); assert.equal(f.calls(), 1); assert.match(r.headers.get('location')!, /^https:\/\/galx\.test\/connect\/consent\?request=/);
  assert.match(r.headers.get('set-cookie')!, /__Host-galx_connect_flow=/); assert.match(r.headers.get('set-cookie')!, /HttpOnly/); assert.match(r.headers.get('set-cookie')!, /Secure/);
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer'); assert.equal(r.headers.get('x-frame-options'), 'DENY'); assert.match(r.headers.get('cache-control')!, /no-store/);
});
test('native callback allows only the registered IP and path with an ephemeral port', () => {
  const c = config.clients[1];
  assert(validRedirect(c, 'http://127.0.0.1:47213/callback'));
  for (const u of ['http://localhost:47213/callback', 'http://127.0.0.1:47213/other', 'http://127.0.0.1:47213/callback?to=evil', 'http://127.0.0.1:47213/callback#code', 'http://127.0.0.1.evil.test/callback', 'http://user@127.0.0.1/callback']) assert(!validRedirect(c, u), u);
  assert(!validRedirect(config.clients[0], 'https://studio.test:443/callback'));
});
test('consent and management require the existing account session; ambient-cookie mutations require same-origin intent', async () => {
  const f = fixture({ authorization: async () => ({ client_id: 'browser' }) });
  const path = '/api/connect/consent?request=00000000-0000-4000-8000-000000000001';
  assert.equal((await f.handlers.consent(req(path, undefined, { Cookie: '__Host-galx_connect_flow=' + 'a'.repeat(43) }))).status, 401);
  assert.equal((await f.handlers.connections(req('/api/connect/connections'))).status, 401);
  for (const origin of ['https://studio.test','https://evil.test','null']) assert.equal((await f.handlers.decision(req('/api/connect/consent', { request: '00000000-0000-4000-8000-000000000001', decision: 'allow' }, { Origin: origin }))).status, 403);
  assert.equal((await f.handlers.disconnect(req('/api/connect/connections', { connection: '00000000-0000-4000-8000-000000000001' }))).status, 403);
});
test('token endpoint checks origin, verifier, redirect, resource and duplicate fields; it never echoes diagnostics', async () => {
  let exchanges = 0;
  const f = fixture({ exchange: async () => { exchanges++; throw new Error('PRIVATE_DATABASE_SENTINEL secret'); } });
  const body = { grant_type: 'authorization_code', client_id: 'browser', code: 'a'.repeat(43), code_verifier: 'a'.repeat(43), redirect_uri: 'https://studio.test/callback', resource: config.resource };
  const denied = await f.handlers.token(req('/oauth/token', body, { Origin: 'https://evil.test' }));
  assert.equal(denied.status, 403); assert.equal(denied.headers.get('access-control-allow-origin'), null); assert.equal(exchanges, 0);
  for (const changed of [{ code_verifier: '' }, { redirect_uri: 'https://evil.test/' }, { resource: 'https://galx.test' }, { refresh_token: 'unexpected' }]) assert.equal((await f.handlers.token(req('/oauth/token', { ...body, ...changed }, { Origin: 'https://studio.test' }))).status, 400);
  const r = await f.handlers.token(req('/oauth/token', body, { Origin: 'https://studio.test' }));
  assert.equal(r.status, 503); assert.equal(r.headers.get('access-control-allow-origin'), 'https://studio.test'); assert.equal(r.headers.get('access-control-allow-credentials'), null); assert.doesNotMatch(await r.text(), /PRIVATE|secret|database/i);
});
test('metadata and preflights describe only the supported public-client contract', async () => {
  const f = fixture(); const m = await (await f.handlers.metadata(req('/.well-known/oauth-authorization-server'))).json();
  assert.deepEqual(m.scopes_supported, ['inference:invoke']); assert.deepEqual(m.grant_types_supported, ['authorization_code','refresh_token']);
  assert.equal((await f.handlers.options(req('/oauth/token', undefined, { Origin: 'https://studio.test' }))).status, 204);
  assert.equal((await f.handlers.options(req('/oauth/token', undefined, { Origin: 'null' }))).status, 403);
});
test('delegated credentials cannot become account, media, billing, publishing, or administrator identity', async () => {
  const engine = Object.create(GalxAuthEngine.prototype) as GalxAuthEngine;
  for (const prefix of ['galx_connect_at_', 'galx_connect_rt_']) {
    const token = prefix + 'a'.repeat(43), request = req('/api/auth/session', undefined, { Authorization: `Bearer ${token}`, Cookie: 'galx_session=galx_sess_other' });
    assert.equal((await engine.resolveAuthIdentity(request)).authenticated, false);
    await assert.rejects(requireRequestSession(request), (e: any) => e instanceof SessionAccessError && e.status === 401);
  }
});
test('only finite Connect routes leave preview; login returns to consent without media enrollment', () => {
  for (const path of ['/connect','/connect/consent','/oauth/token','/api/connect/consent','/v1/inference']) assert(isPublicProductPath(path));
  for (const path of ['/oauth/admin','/api/connect/grant','/v1/inference/images','/connect/publish']) assert(!isPublicProductPath(path));
  assert.equal(safeAuthRedirect('/connect/consent?request=00000000-0000-4000-8000-000000000001'), '/connect/consent?request=00000000-0000-4000-8000-000000000001');
});
test('registration fails closed and has no default clients or entitlement', () => {
  const before = process.env.GALX_CONNECT_ENABLED;
  try { delete process.env.GALX_CONNECT_ENABLED; assert.throws(connectConfig); }
  finally { if (before === undefined) delete process.env.GALX_CONNECT_ENABLED; else process.env.GALX_CONNECT_ENABLED = before; }
});

test('Connect entry never opens application routes on published Site hostnames', async () => {
  const { middleware } = await import('../src/middleware');
  for (const path of ['/connect','/connect/consent','/oauth/token','/v1/inference']) {
    const response = await middleware(new NextRequest(`https://app.owner.galx.ai${path}`, {headers:{host:'app.owner.galx.ai'}}));
    assert.equal(response.status,404);assert.equal(await response.text(),'Site unavailable.');
  }
  const entry=await middleware(new NextRequest('https://galx.ai/connect', {headers:{host:'galx.ai'}}));
  assert.equal(entry.headers.get('x-middleware-next'),'1');assert.equal(entry.headers.get('referrer-policy'),'no-referrer');assert.equal(entry.headers.get('x-frame-options'),'DENY');
});

test('Mac listener uses configured issuer for consent and callback while keeping browser intent mandatory', async t => {
  const values = { GALX_REQUEST_ORIGIN_MODE: 'mac-loopback-v1', GALX_SELF_HOST_AUTHORITY: '0.0.0.0:3000', NEXT_PUBLIC_APP_URL: config.issuer, GALX_CONNECT_ORIGIN: config.issuer, GALX_NOVA_RESOURCE: config.resource };
  const saved = Object.fromEntries(Object.keys(values).map(k => [k, process.env[k]])); Object.assign(process.env, values);
  t.after(() => { for (const [k,v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
  let decisions = 0;
  const f = fixture({ decide: async () => { decisions++; return 'https://studio.test/callback'; } }, async () => ({ user: { id: 'owner' }, cookies: [] }));
  for (const [origin, status] of [[config.issuer, 200], ['https://evil.test', 403], ['http://galx.test', 403], ['https://galx.test:444', 403]] as const) {
    const r = new NextRequest('http://0.0.0.0:3000/api/connect/consent', { method: 'POST', headers: { Host: 'galx.test', Origin: origin, 'X-Forwarded-Host': 'evil.test', 'Content-Type': 'application/x-www-form-urlencoded', Cookie: '__Host-galx_connect_flow=' + 'a'.repeat(43) }, body: new URLSearchParams({ request: '00000000-0000-4000-8000-000000000001', decision: 'allow' }) });
    assert.equal((await f.handlers.decision(r)).status, status);
  }
  assert.equal(decisions, 1);
  const nativeParameters = { ...authorization, client_id: 'native', redirect_uri: 'http://127.0.0.1:4401/callback' };
  const nativeRequest = new NextRequest('http://0.0.0.0:3000/oauth/authorize?' + new URLSearchParams(nativeParameters), { headers: { Host: 'galx.test' } });
  const nativeAuthorization = await f.handlers.authorize(nativeRequest);
  assert.equal(nativeAuthorization.status, 303, 'An IP callback must remain exact through Next URL normalization');
  const callback = await accountCallback(new NextRequest('http://0.0.0.0:3000/auth/callback?error=access_denied&next=/connect', { headers: { Host: 'galx.test', 'X-Forwarded-Proto': 'http', 'X-Forwarded-Host': 'evil.test' } }));
  assert.equal(new URL(callback.headers.get('location')!).origin, config.issuer);
  const denied = await accountCallback(new NextRequest('http://0.0.0.0:3000/auth/callback', { headers: { Host: 'evil.test' } }));
  assert.equal(denied.status, 400); assert.equal(denied.headers.get('location'), null);
});
