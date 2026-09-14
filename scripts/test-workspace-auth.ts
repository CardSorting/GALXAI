import 'next/dist/server/node-environment.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';
import { verifyWorkspaceSession } from '../src/lib/auth/workspace-session';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
const jwt = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'forged', exp: 4102444800 })).toString('base64url')}.forged`;
const cookie = (expires = 4102444800) => `base64-${Buffer.from(JSON.stringify({ access_token: jwt, refresh_token: 'fixture-refresh', expires_at: expires, user: { id: 'forged' } })).toString('base64url')}`;
const sessionCookie = `sb-auth-auth-token=${cookie()}`;
const paths = ['/images', '/images/', '/%69mages', '/images/future', '/sites', '/sites/', '/%73ites', '/sites/00000000-0000-4000-8000-000000000000', '/sites/draft.js', '/sites/deep/path', '/library'];

test('anonymous navigation, RSC, prefetch and misleading paths never pass the workspace gate', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Anonymous requests must not query identity or storage'); };
  try {
    for (const path of paths) for (const headers of [{}, { rsc: '1', 'next-router-prefetch': '1' }, { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware', 'x-user-id': 'forged', 'x-galx-approved': 'true' }, { cookie: 'sb-pretend=true; admin=true', authorization: 'Bearer forged' }]) {
      const response = await middleware(new NextRequest(`https://galx.ai${path}`, { headers }));
      assert.equal(response.status, 307, path);
      const redirect = new URL(response.headers.get('location')!);
      assert.equal(redirect.pathname, '/auth/signin');
      assert.equal(redirect.origin, 'https://galx.ai');
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.equal(response.headers.get('x-middleware-next'), null);
      assert.equal(await response.text(), '');
    }
    for (const method of ['HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const response = await middleware(new NextRequest('https://galx.ai/sites', { method }));
      assert.equal(response.status, method === 'HEAD' ? 307 : 401);
    }
    const response = await middleware(new NextRequest('https://galx.ai/sites?starter=portfolio&refine=1&token=PRIVATE_SENTINEL&next=https://evil.test'));
    assert.equal(new URL(response.headers.get('location')!).searchParams.get('next'), '/sites?starter=portfolio&refine=1');
    assert(!response.headers.get('location')!.includes('PRIVATE_SENTINEL'));
    for (const path of ['/', '/auth/signin', '/images/studio/desert.webp', '/images/studio/glass.webp', '/images/studio/paper.webp', '/api/sites/published/example', '/v1/images/assets/invalid', '/api/sites/workspace']) {
      assert.equal((await middleware(new NextRequest(`https://galx.ai${path}`))).headers.get('x-middleware-next'), '1', path);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('forged sessions, anonymous Auth users and verification outages fail closed with sanitized responses', async () => {
  const originalFetch = globalThis.fetch;
  let status = 401, anonymous = false, calls = 0;
  globalThis.fetch = async (input, init) => {
    calls++;
    if (String(input).endsWith('/fn_account_session_active')) return Response.json(true);
    assert(String(input).includes('/auth/v1/user'));
    assert(init?.signal);
    assert.equal(init?.cache, 'no-store');
    return new Response(JSON.stringify(status === 200 ? { id: 'verified', is_anonymous: anonymous } : { code: 'invalid_token', msg: 'PRIVATE_AUTH_DIAGNOSTIC' }), { status, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    for (const badCookie of [sessionCookie, `galx_session=${jwt}`, 'sb-auth-auth-token=garbage']) {
      const response = await middleware(new NextRequest('https://galx.ai/images', { headers: { cookie: badCookie } }));
      assert.equal(response.status, 307);
      assert(!(await response.text()).includes('PRIVATE_AUTH_DIAGNOSTIC'));
    }
    for (status of [429, 503]) {
      const response = await middleware(new NextRequest('https://galx.ai/sites', { headers: { cookie: sessionCookie } }));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('retry-after'), '3');
      assert.equal(response.headers.get('location'), null);
      assert(!(await response.text()).includes('PRIVATE_AUTH_DIAGNOSTIC'));
    }
    status = 200; anonymous = true;
    assert.equal((await middleware(new NextRequest('https://galx.ai/images', { headers: { cookie: sessionCookie } }))).status, 307);
    anonymous = false;
    const split = cookie(), mid = Math.floor(split.length / 2);
    for (const value of [sessionCookie, `sb-auth-auth-token.1=${split.slice(mid)}; sb-auth-auth-token.0=${split.slice(0, mid)}`, `galx_session=${jwt}`]) {
      const response = await middleware(new NextRequest('https://galx.ai/images', { headers: { cookie: value } }));
      assert.equal(response.headers.get('x-middleware-next'), '1');
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
    }
    assert(calls > 0);
    globalThis.fetch = async () => { throw new Error('PRIVATE_AUTH_DIAGNOSTIC'); };
    assert.equal(await verifyWorkspaceSession({ getAll: () => [{ name: 'galx_session', value: jwt }] }), 'unavailable');
  } finally { globalThis.fetch = originalFetch; }
});

test('expired sessions refresh through Auth and propagate cookies to the request and response', async () => {
  const originalFetch = globalThis.fetch;
  let refreshes = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/fn_account_session_active')) return Response.json(true);
    if (url.includes('/auth/v1/token')) {
      refreshes++;
      return Response.json({ access_token: jwt, refresh_token: 'fixture-refreshed', expires_in: 3600, token_type: 'bearer', user: { id: 'verified' } });
    }
    assert(url.includes('/auth/v1/user'));
    return Response.json({ id: 'verified', is_anonymous: false });
  };
  try {
    const request = new NextRequest('https://galx.ai/sites', { headers: { cookie: `sb-auth-auth-token=${cookie(1)}` } });
    const response = await middleware(request);
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(refreshes, 1);
    assert(response.cookies.getAll().some(value => value.name.startsWith('sb-auth-auth-token') && value.value));
    assert.notEqual(request.cookies.get('sb-auth-auth-token')?.value, cookie(1));
  } finally { globalThis.fetch = originalFetch; }
});

test('native sessions use verified active session authority, never cookie presence', async () => {
  const original = GalxAuthEngine.getInstance;
  let valid = false;
  GalxAuthEngine.getInstance = () => ({ verifySession: async token => {
    assert.equal(token, 'galx_sess_fixture');
    return { valid, claims: { sub: 'verified', accountVerified: true }, session: { id: 'sess_fixture', userId: 'verified', scopes: ['*'] } };
  } }) as any;
  try {
    const request = () => new NextRequest('https://galx.ai/sites', { headers: { cookie: 'galx_session=galx_sess_fixture' } });
    assert.equal((await middleware(request())).status, 307);
    valid = true;
    assert.equal((await middleware(request())).headers.get('x-middleware-next'), '1');
  } finally { GalxAuthEngine.getInstance = original; }
});

test('server page guard independently denies anonymous entry when middleware did not run', async () => {
  // Use Next's request context to exercise cookies() and the real redirect signal.
  (globalThis as any).AsyncLocalStorage ??= AsyncLocalStorage;
  const { workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external.js');
  const { workUnitAsyncStorage } = await import('next/dist/server/app-render/work-unit-async-storage.external.js');
  const { requireWorkspaceSession } = await import('../src/lib/auth/require-workspace-session');
  const store = { type: 'request', phase: 'render', cookies: new NextRequest('https://galx.ai/images').cookies };
  await workAsyncStorage.run({} as any, () => workUnitAsyncStorage.run(store as any, async () => {
    for (const path of ['/images', '/sites', '/sites/00000000-0000-4000-8000-000000000000']) {
      await assert.rejects(requireWorkspaceSession(path), error => (error as any).digest === `NEXT_REDIRECT;replace;/auth/signin?next=${encodeURIComponent(path)};307;`);
    }
  }));
  for (const path of ['src/app/images/page.tsx', 'src/app/sites/page.tsx', 'src/app/sites/[id]/page.tsx']) {
    const page = readFileSync(path, 'utf8');
    assert.match(page, /<WorkspacePageGate pathname=/, path);
    assert.match(page, /export const dynamic = 'force-dynamic'/, path);
    assert.match(page, /<WorkspacePageGate[^>]+>[\s\S]*<\/WorkspacePageGate>/, path);
  }
});


test('independent page verification distinguishes an outage from an invalid session', async () => {
  (globalThis as any).AsyncLocalStorage ??= AsyncLocalStorage;
  const { workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external.js');
  const { workUnitAsyncStorage } = await import('next/dist/server/app-render/work-unit-async-storage.external.js');
  const { requireWorkspaceSession, WorkspaceSessionUnavailableError } = await import('../src/lib/auth/require-workspace-session');
  const store = { type: 'request', phase: 'render', cookies: new NextRequest('https://galx.ai/images', { headers: { cookie: sessionCookie } }).cookies };
  const originalFetch = globalThis.fetch;
  let active: boolean | null = null;
  globalThis.fetch = async input => String(input).includes('/auth/v1/user')
    ? Response.json({ id: 'verified', is_anonymous: false })
    : active === null ? Response.json({ error: 'PRIVATE_AUTH_SENTINEL' }, { status: 503 }) : Response.json(active);
  try {
    await workAsyncStorage.run({} as any, () => workUnitAsyncStorage.run(store as any, async () => {
      await assert.rejects(requireWorkspaceSession('/images'), WorkspaceSessionUnavailableError);
      active = false;
      await assert.rejects(requireWorkspaceSession('/images'), error => String((error as any).digest).startsWith('NEXT_REDIRECT;'));
      active = true;
      await requireWorkspaceSession('/images');
    }));
  } finally { globalThis.fetch = originalFetch; }
});
