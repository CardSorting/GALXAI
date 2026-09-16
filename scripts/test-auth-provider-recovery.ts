/** DOM-only integration: synthetic SDK and fetch; no credentials or external network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const { JSDOM } = await import(process.env.GALX_JSDOM_MODULE || 'jsdom');
test('session hydration, coalescing, account switching, outage retention and logout are race-safe', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true });
  const replacements = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    localStorage: dom.window.localStorage, location: dom.window.location, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, value });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.invalid';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  let calls = 0, mode = 'valid', listener: (event: string, session: any) => void = () => {};
  let logoutCalls = 0;
  let release: ((response: Response) => void) | undefined;
  const profile = (id = 'owner') => Response.json({ valid: true, user: { id, name: 'Account' } });
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    if (init?.method === 'DELETE') { logoutCalls++; return Response.json({ error: 'PRIVATE_SENTINEL' }, { status: 503 }); }
    calls++; assert.equal(new Headers(init?.headers).has('authorization'), false);
    if (mode === 'hold') return new Promise<Response>(resolve => { release = resolve; });
    if (mode === 'outage') return Response.json({ error: 'PRIVATE_SENTINEL' }, { status: 503, headers: { 'Retry-After': '0' } });
    if (mode === 'revoked') return Response.json({ valid: false }, { status: 401 });
    return profile(mode === 'other' ? 'other' : 'owner');
  });
  const { createClient } = await import('../src/utils/supabase/client');
  const client = createClient();
  t.mock.method(client.auth, 'onAuthStateChange', callback => { listener = callback as any; return { data: { subscription: { unsubscribe() {} } } } as any; });
  t.mock.method(client.auth, 'getSession', () => { throw new Error('Hydration must not wait for SDK getSession'); });
  t.mock.method(client.auth, 'stopAutoRefresh', async () => {});
  const { LOGOUT_STATE_KEY, markLogout } = await import('../src/lib/auth/browser-session');
  const { AuthProvider, useAuth } = await import('../src/contexts/AuthContext');
  let state: ReturnType<typeof useAuth>;
  function Probe() { state = useAuth(); return React.createElement('p', null, `${state.status}:${state.user?.id || 'none'}`); }
  const root = createRoot(document.getElementById('root')!);
  const candidate = (id = 'owner', token = 'old-snapshot') => ({ access_token: token, user: { id } });
  const settle = () => new Promise(resolve => setTimeout(resolve, 20));
  try {
    await act(async () => { root.render(React.createElement(React.StrictMode, null, React.createElement(AuthProvider, null, React.createElement(Probe)))); await settle(); });
    assert.equal(state!.status, 'ready'); assert.equal(state!.user?.id, 'owner');
    assert.equal(state!.user?.token, undefined);
    mode = 'hold';
    await act(async () => { listener('TOKEN_REFRESHED', candidate()); await settle(); });
    const before = calls;
    let one!: Promise<void>, two!: Promise<void>;
    await act(async () => { one = state!.retrySession(); two = state!.retrySession(); await settle(); });
    assert.equal(calls, before, 'manual retries join the current check');
    await act(async () => { release!(profile()); await Promise.all([one, two]); });
    mode = 'hold'; let oldTokenRead!: Promise<void>;
    await act(async () => { oldTokenRead = state!.retrySession(); await settle(); });
    const oldTokenRelease = release!;
    act(() => { listener('TOKEN_REFRESHED', candidate('owner', 'fresh-token')); });
    await act(async () => { oldTokenRelease(Response.json({ valid: false }, { status: 401 })); await oldTokenRead; await settle(); });
    assert.equal(state!.user?.id, 'owner', 'obsolete 401 cannot clear the refreshed account');
    await act(async () => { release!(profile()); await settle(); });
    mode = 'outage';
    await act(async () => { await state!.retrySession(); });
    assert.equal(state!.status, 'reconnecting'); assert.equal(state!.user?.id, 'owner');
    const now = Date.now();
    const clock = t.mock.method(Date, 'now', () => now + 31_000);
    await act(async () => { window.dispatchEvent(new dom.window.Event('focus')); await new Promise(resolve => setTimeout(resolve, 300)); });
    const afterOutage = calls;
    await act(async () => { for (let index = 0; index < 10; index++) window.dispatchEvent(new dom.window.Event('focus')); await settle(); });
    assert.equal(calls, afterOutage, 'focus events cannot create an outage retry storm');
    mode = 'valid';
    await act(async () => { window.dispatchEvent(new dom.window.Event('offline')); window.dispatchEvent(new dom.window.Event('online')); await settle(); });
    assert.equal(state!.status, 'ready', 'coming online bypasses the focus cooldown');
    clock.mock.restore();
    // Account changes fence old reads synchronously, before the deferred SDK work.
    mode = 'hold';
    let obsolete!: Promise<void>;
    await act(async () => { obsolete = state!.retrySession(); await settle(); });
    const oldRelease = release!;
    act(() => { listener('SIGNED_IN', candidate('other', 'other-token')); });
    assert.equal(state!.user, null, 'old owner must disappear before the next timer');
    await act(async () => { oldRelease(profile()); await obsolete; });
    assert.notEqual(state!.user?.id, 'owner', 'old response cannot restore the previous owner');
    await act(async () => { listener('SIGNED_IN', candidate('other', 'other-token')); await settle(); });
    assert.equal(state!.user, null); assert.equal(state!.status, 'loading');
    await act(async () => { release!(profile('other')); await settle(); });
    assert.equal(state!.user?.id, 'other');
    // A late success from a read that ignored cancellation must not resurrect a signed-out account.
    mode = 'hold'; let late!: Promise<void>;
    await act(async () => { late = state!.retrySession(); await settle(); });
    await act(async () => { listener('SIGNED_OUT', null); release!(profile('other')); await late; });
    assert.equal(state!.user, null); assert.equal(state!.status, 'ready');
    mode = 'outage'; await act(async () => { await state!.retrySession(); });
    assert.equal(state!.status, 'unavailable');
    mode = 'valid'; await act(async () => { await state!.retrySession(); });
    assert.equal(state!.status, 'ready'); assert.equal(state!.user?.id, 'owner');
    // History restoration must not reuse a successful check from seconds ago.
    mode = 'revoked';
    const beforeHistory = calls;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => {
      window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide', { persisted: true }));
      window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow', { persisted: true }));
      await settle();
    });
    assert.equal(calls, beforeHistory, 'a background restoration waits until visible');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => { document.dispatchEvent(new dom.window.Event('visibilitychange')); await settle(); });
    assert.equal(state!.user, null, 'restoring a cached page revalidates its session');
    mode = 'valid'; await act(async () => { await state!.retrySession(); });
    mode = 'revoked'; await act(async () => { await state!.retrySession(); });
    assert.equal(state!.user, null); assert.equal(state!.status, 'ready');
    mode = 'valid'; await act(async () => { await state!.retrySession(); });
    localStorage.setItem(LOGOUT_STATE_KEY, 'pending');
    await act(async () => { window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow', { persisted: true })); await settle(); });
    assert.equal(state!.user, null); assert.equal(state!.status, 'signout_failed');
    markLogout(null);
    await act(async () => { await state!.retrySession(); });
    mode = 'hold'; let beforeLogout!: Promise<void>;
    await act(async () => { beforeLogout = state!.retrySession(); await settle(); });
    await act(async () => { await Promise.all([state!.signOut(), state!.signOut()]); });
    assert.equal(logoutCalls, 1, 'sign-out is neither duplicated nor automatically retried');
    await act(async () => { listener('SIGNED_OUT', null); release!(profile()); await beforeLogout; await state!.retrySession(); });
    assert.equal(state!.user, null); assert.equal(state!.status, 'signout_failed', 'failed revocation remains explicit and retryable');
    assert(!document.body.textContent?.includes('PRIVATE_SENTINEL'));
  } finally {
    await act(async () => root.unmount()); await client.auth.dispose(); dom.window.close();
    for (const [key, original] of originals) { if (original) Object.defineProperty(globalThis, key, original); else Reflect.deleteProperty(globalThis, key); }
  }
});
