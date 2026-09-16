import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchBrowserSession } from '../src/lib/auth/browser-verification';

const valid = { valid: true, user: { id: 'owner', name: 'Account', token: 'PRIVATE_SENTINEL', role: 'admin' } };

test('browser checks use current cookies, retry one transient read and allowlist the profile', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls++; assert.equal(url, '/api/auth/session'); assert.equal(init.credentials, 'same-origin');
    assert.equal(init.cache, 'no-store'); assert.equal(new Headers(init.headers).get('authorization'), null);
    return calls === 1 ? Response.json({ error: 'PRIVATE_SENTINEL' }, { status: 503, headers: { 'Retry-After': '0' } }) : Response.json(valid);
  });
  assert.deepEqual(await fetchBrowserSession(new AbortController().signal), { user: { id: 'owner', name: 'Account' } });
  assert.equal(calls, 2);
});

test('401 terminates without replay; denied, malformed and long-backoff responses never retry', async t => {
  for (const status of [401, 403, 200, 429]) {
    let calls = 0;
    const mock = t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ error: 'PRIVATE_SENTINEL' }, { status, headers: { 'Retry-After': '120' } }); });
    if (status === 401) assert.equal(await fetchBrowserSession(new AbortController().signal), null);
    else await assert.rejects(fetchBrowserSession(new AbortController().signal));
    assert.equal(calls, 1); mock.mock.restore();
  }
});

test('network recovery is finite and cancellation stops the delayed second read', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new TypeError('PRIVATE_SENTINEL'); });
  await assert.rejects(fetchBrowserSession(new AbortController().signal), /Session unavailable/);
  assert.equal(calls, 2);
  calls = 0;
  const controller = new AbortController();
  const pending = fetchBrowserSession(controller.signal);
  controller.abort();
  await assert.rejects(pending);
  assert.equal(calls, 1);
});
