import 'next/dist/server/node-environment.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';
import { authEntryPath, legacyAuthPath, safeAuthRedirect } from '../src/lib/auth/redirects';
import { workspaceReturnPath, workspaceSignInPath } from '../src/lib/security/workspace-policy';
import { isPublicProductPath } from '../src/lib/security/preview-policy';
import { GET as callback } from '../src/app/auth/callback/route';

test('readable login links round-trip nested destinations without query injection', () => {
  assert.equal(authEntryPath('/sites'), '/login?next=/sites');
  assert.equal(authEntryPath('/images'), '/login');
  assert.equal(authEntryPath('/images/favorites', 'signup'), '/signup?next=/images/favorites');
  for (const path of ['/sites?starter=portfolio&refine=1', '/billing#plan', '/device?code=A%26B', '/images/library']) {
    const url = new URL(authEntryPath(path), 'https://galx.ai');
    assert.equal(url.searchParams.get('next'), path);
    assert.equal(url.hash, '');
    assert.deepEqual([...url.searchParams.keys()], ['next']);
  }
  for (const path of ['/login', '/signup', '/login?next=/sites', '/%6cogin', '/%2573ignup', '/safe/../login', '//evil.test', '/%252f%252fevil.test', '/\\evil.test', 'https://evil.test', '/%0d%0aLocation:evil']) {
    assert.equal(safeAuthRedirect(path), '/images', path);
    assert.equal(authEntryPath(path), '/login', path);
  }
});

test('all image destinations retain exact auth context and public-product classification', () => {
  for (const path of ['/images/library', '/images/favorites']) {
    assert.equal(workspaceReturnPath(path, new URLSearchParams('token=PRIVATE_CANARY')), path);
    assert.equal(new URL(workspaceSignInPath(path), 'https://galx.ai').searchParams.get('next'), path);
    assert(isPublicProductPath(path));
  }
  for (const path of ['/login', '/signup']) assert(isPublicProductPath(path));
  for (const path of ['/login/private', '/signup/private', '/images/library/private']) assert(!isPublicProductPath(path));
  assert.equal(safeAuthRedirect('/images?view=library'), '/images/library');
  assert.equal(safeAuthRedirect('/images?view=favorites'), '/images/favorites');
});

test('canonical account entry retains explicit private no-store cache policy', async () => {
  for (const path of ['/login', '/signup']) {
    const response = await middleware(new NextRequest('https://galx.ai' + path));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.match(response.headers.get('cache-control')!, /private, no-store/);
  }
});

test('legacy aliases return one finite private redirect, including RSC and HEAD', async () => {
  for (const [from, to] of [
    ['/images?view=library&token=PRIVATE_CANARY', '/images/library'],
    ['/images?view=favorites', '/images/favorites'],
    ['/images?view=unknown', '/images'],
    ['/images?view=library&view=favorites', '/images'],
    ['/auth/signin?next=%2Fsites&token=PRIVATE_CANARY', '/login?next=/sites'],
    ['/auth/signup?returnUrl=%2Fimages%3Fview%3Dlibrary', '/signup?next=/images/library'],
    ['/auth/signin?next=//evil.test&error=PRIVATE_CANARY', '/login?error=auth_failed'],
    ['/auth/signin?next=/sites&next=//evil.test', '/login'],
  ]) for (const method of ['GET', 'HEAD']) {
    const response = await middleware(new NextRequest('https://galx.ai' + from, { method, headers: { rsc: '1', 'next-router-prefetch': '1' } }));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), 'https://galx.ai' + to);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(await response.text(), '');
    assert.doesNotMatch(JSON.stringify([...response.headers]), /PRIVATE_CANARY/);
  }
  assert.equal(legacyAuthPath('/auth/callback', new URLSearchParams('code=keep')), null);
});

test('OAuth cancellation and missing-code recovery use canonical finite login links', async () => {
  for (const query of ['error=PRIVATE_CANARY&next=/images/favorites', 'next=/images/favorites']) {
    const response = await callback(new Request('https://galx.ai/auth/callback?' + query));
    const location = new URL(response.headers.get('location')!);
    assert.equal(location.pathname, '/login');
    assert.equal(location.searchParams.get('next'), '/images/favorites');
    assert.doesNotMatch(location.href + await response.text(), /PRIVATE_CANARY/);
  }
});
