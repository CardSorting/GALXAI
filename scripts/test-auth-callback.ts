import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET } from '../src/app/auth/callback/route';
import { BroccoliAuthoritativeGovernor } from '../src/core/broccolidb/BroccoliAuthoritativeGovernor';
import { middleware } from '../src/middleware';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
const encode = (value: unknown) => `base64-${Buffer.from(JSON.stringify(value)).toString('base64url')}`;
const request = (query: string, options: RequestInit = {}) => new NextRequest(`https://galx.ai/auth/callback?${query}`, {
  ...options, headers: { cookie: `sb-auth-auth-token-code-verifier=${encode('fixture-verifier')}`, ...options.headers },
});
const clean = async (response: Response, path: string) => {
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), `https://galx.ai${path}`);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.doesNotMatch(await response.text(), /PRIVATE_SENTINEL|fixture-verifier|fixture-code/);
};

test('entry and callback middleware never wait for or refresh the previous account', async t => {
  t.mock.method(globalThis, 'fetch', async () => { assert.fail('Entry middleware must not contact Auth'); });
  for (const path of ['/login?reauth=1', '/signup', '/auth/callback?code=fixture-code']) {
    const response = await middleware(new NextRequest(`https://galx.ai${path}`, { headers: { cookie: 'sb-auth-auth-token=expired; galx_session=old' } }));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.match(response.headers.get('cache-control') || '', /private.*no-store/);
    if (path.startsWith('/auth/callback')) assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  }
});

test('successful PKCE exchange survives an unrelated open data circuit and writes cookies to its private redirect', async t => {
  t.mock.method(BroccoliAuthoritativeGovernor, 'getInstance', () => { throw new Error('Data circuit must not gate sign-in'); });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    calls++; assert.equal(String(input), 'https://auth.example.test/auth/v1/token?grant_type=pkce');
    assert.equal(init?.cache, 'no-store'); assert(init?.signal);
    assert.deepEqual(JSON.parse(String(init?.body)), { auth_code: 'fixture-code', code_verifier: 'fixture-verifier' });
    return Response.json({ access_token: 'fixture-token', refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user: { id: 'owner' } });
  });
  const response = await GET(request('code=fixture-code&next=/images/library'));
  await clean(response, '/images/library'); assert.equal(calls, 1);
  const cookies = response.headers.get('set-cookie') || '';
  assert.match(cookies, /sb-auth-auth-token=base64-/);
  assert.match(cookies, /sb-auth-auth-token-code-verifier=;/);
  assert.match(cookies, /galx_session=;.*Max-Age=0/);
  assert.match(cookies, /galx_user_role=;/);
});

test('failed callbacks preserve safe destinations and reach the form even with another existing session', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ msg: 'PRIVATE_SENTINEL', code: 'bad_code' }, { status: 400 }); });
  const failed = await GET(request('code=fixture-code&next=/sites/project'));
  await clean(failed, '/login?next=/sites/project&error=auth_exchange_failed&reauth=1');
  assert.equal(calls, 1);
  assert.doesNotMatch(failed.headers.get('set-cookie') || '', /sb-auth-auth-token=base64-/);
  for (const [query, notice] of [
    ['error=PRIVATE_SENTINEL&error_description=PRIVATE_SENTINEL&next=//evil.test', 'auth_cancelled'],
    ['next=/login', 'no_auth_code_provided'],
    ['code=one&code=two', 'no_auth_code_provided'],
  ]) await clean(await GET(request(query)), `/login?error=${notice}&reauth=1`);
  assert.equal(calls, 1, 'invalid callback parameters do not exchange a code');
});

test('callback exchange has one overall deadline, honors cancellation and does not replay failed mutations', async t => {
  const controller = new AbortController();
  t.mock.method(AbortSignal, 'timeout', ms => { assert.equal(ms, 10_000); return controller.signal; });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_input, init) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('PRIVATE_SENTINEL', 'AbortError')), { once: true });
      controller.abort();
    });
  });
  await clean(await GET(request('code=fixture-code')), '/login?error=auth_exchange_failed&reauth=1');
  assert.equal(calls, 1);
  await clean(await GET(request('code=fixture-code')), '/login?error=auth_exchange_failed&reauth=1');
  assert.equal(calls, 1, 'already cancelled exchange cannot start another request');
});
