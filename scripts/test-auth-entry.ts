import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { safeAuthRedirect, authRecoveryPath } from '../src/lib/auth/redirects';
import { authDestinationLabel, authNotice, signInErrorMessage } from '../src/lib/auth/signin';
import { workspaceReturnPath } from '../src/lib/security/workspace-policy';
import { workspaceUnavailableResponse } from '../src/lib/security/workspace-unavailable';
import { workspaceFetch, WORKSPACE_SESSION_REJECTED } from '../src/lib/auth/workspace-client';

test('return destinations reject external URLs and recursive auth while preserving workspace context', () => {
  for (const path of ['/auth/signin', '/auth/signup?next=/auth/signin', '/%61uth/signin', '/auth%252fsignin', '//evil.test', 'javascript:alert(1)', '/\\evil.test', '/%2f%2fevil.test']) assert.equal(safeAuthRedirect(path), '/images', path);
  assert.equal(workspaceReturnPath('/images', new URLSearchParams('view=library&token=private&prompt=private')), '/images/library');
  assert.equal(workspaceReturnPath('/images'), '/explore');
  assert.equal(workspaceReturnPath('/sites', new URLSearchParams('starter=portfolio&refine=1&key=private')), '/sites?starter=portfolio&refine=1');
  assert.equal(workspaceReturnPath('/sites', new URLSearchParams('starter=private&refine=private')), '/sites');
  assert.equal(workspaceReturnPath('/sites/owned', new URLSearchParams('token=private')), '/sites/owned');
  assert.equal(authDestinationLabel('/sites/owned'), 'Sites');
  assert.equal(authDestinationLabel('/images?view=library'), 'Images');
  assert.equal(authDestinationLabel('https://evil.test'), 'Images');
});

test('legacy Images links lead to public discovery while selected library views remain private', () => {
  assert.equal(safeAuthRedirect('/images'), '/explore');
  assert.equal(safeAuthRedirect('/images?view=library'), '/images/library');
  assert.equal(safeAuthRedirect('/images?view=favorites'), '/images/favorites');
});

test('explicit sign-in recovery preserves only safe destinations and bypasses existing-session redirects', () => {
  assert.equal(authRecoveryPath('/images/library'), '/login?next=/images/library&reauth=1');
  assert.equal(authRecoveryPath('//evil.test'), '/login?reauth=1');
  assert.equal(authRecoveryPath('/login?reauth=1'), '/login?reauth=1');
  assert.equal(authRecoveryPath('/sites/owned', 'session_expired'), '/login?next=/sites/owned&error=session_expired&reauth=1');
});

test('sign-in notices and failures use finite public copy, never account existence or diagnostics', () => {
  const secret = 'PRIVATE_UPSTREAM_SESSION_SENTINEL';
  for (const method of ['password', 'provider', 'link'] as const) {
    for (const error of [new Error(secret), { code: secret, message: secret }, { status: 503, message: secret }, { status: 429, message: secret }]) {
      assert(!signInErrorMessage(error, method).includes(secret));
    }
  }
  assert.equal(signInErrorMessage({ code: 'user_not_found' }, 'password'), signInErrorMessage({ code: 'invalid_credentials' }, 'password'));
  assert(!authNotice(secret)!.includes(secret));
  assert.match(authNotice('session_expired')!, /Sign in again/);
});

test('verification outage has an accessible document recovery response without auth or query disclosure', async () => {
  const response = workspaceUnavailableResponse(new NextRequest('https://galx.ai/sites?starter=portfolio&refine=1&token=PRIVATE_SENTINEL', { headers: { accept: 'text/html' } }));
  assert.equal(response.status, 503); assert.equal(response.headers.get('retry-after'), '3');
  const html = await response.text();
  assert.match(html, /<html lang="en">/); assert.match(html, /<main>/);
  assert.match(html, /href="\/sites\?starter=portfolio&amp;refine=1"/);
  assert(!html.includes('PRIVATE_SENTINEL')); assert(!html.includes('script'));
  for (const headers of [{ accept: 'application/json' }, { accept: 'text/html', rsc: '1' }]) {
    const response = workspaceUnavailableResponse(new NextRequest('https://galx.ai/images', { headers }));
    assert.equal(response.status, 503); assert.equal(await response.text(), 'Your session could not be checked. Try again shortly.');
  }
});

test('only an active owner request receiving 401 suspends the workspace; 403, outages and aborts do not', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const target = new EventTarget(), events: unknown[] = [];
  (globalThis as any).window = target;
  target.addEventListener(WORKSPACE_SESSION_REJECTED, event => events.push((event as CustomEvent).detail));
  try {
    for (const status of [200, 403, 429, 503, 401]) {
      globalThis.fetch = async () => new Response('', { status });
      assert.equal((await workspaceFetch('owner-a', '/api/sites/workspace')).status, status);
    }
    assert.deepEqual(events, [{ owner: 'owner-a' }]);
    await workspaceFetch(null, '/api/sites/workspace');
    await workspaceFetch('owner-b', '/api/sites/workspace', { signal: AbortSignal.abort() });
    assert.equal(events.length, 1);
  } finally { globalThis.fetch = originalFetch; (globalThis as any).window = originalWindow; }
});
