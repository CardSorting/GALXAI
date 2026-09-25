/** Read-only deployment acceptance: private routes must survive CDN cache rules. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const origin = new URL(process.argv[2] || 'https://galx.ai');
assert(!origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash);
assert(origin.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(origin.hostname));
const result = { observed_at: new Date().toISOString(), origin: origin.origin, checks: [] };
const request = (path, init = {}) => fetch(new URL(path, origin), {
  ...init, redirect: 'manual', signal: AbortSignal.timeout(20000),
});
const privateCache = (response, label) => {
  const cache = response.headers.get('cache-control') || '';
  assert.match(cache, /(?:^|,)\s*private\s*(?:,|$)/, label);
  assert.match(cache, /(?:^|,)\s*no-store\s*(?:,|$)/, label);
  assert.doesNotMatch(cache, /(?:^|,)\s*(?:public|s-maxage)\b/i, label);
  assert(!['HIT', 'STALE', 'UPDATING'].includes(response.headers.get('cf-cache-status')), label);
};

// These are the active account workspaces. /images is a public legacy entry
// that redirects to /explore, and /sites is a retired public alias, so neither
// belongs in the private-workspace authentication assertions.
const privatePaths = [
  '/images/create',
  '/images/library',
  '/images/favorites',
  '/library',
  '/images/create/private.css',
  '/images/library/private.js',
  '/images/favorites/private.png',
  '/library/private.png',
];
for (const path of privatePaths) {
  for (const method of ['GET', 'HEAD']) {
    for (const headers of [{}, { cookie: 'galx_session=galx_sess_retired', rsc: '1', 'next-router-prefetch': '1' }]) {
      const response = await request(path, { method, headers });
      assert.equal(response.status, 307, path);
      const rawLocation = response.headers.get('location');
      assert(rawLocation, path);
      const location = new URL(rawLocation, origin);
      assert.equal(location.origin, origin.origin, path);
      assert.equal(location.pathname, '/login', path);
      assert.equal(location.searchParams.get('next'), path, path);
      privateCache(response, path);
      await response.arrayBuffer();
      result.checks.push({ path, method, legacy_prefetch: Boolean(headers.cookie), status: response.status, cache: response.headers.get('cache-control') });
    }
  }
}

// Keep the old Images entry usable as a discovery redirect and keep saved
// private-view bookmarks behind the private cache policy while they migrate.
for (const [path, destination] of [
  ['/images', '/explore'],
  ['/images?view=library', '/images/library'],
  ['/images?view=favorites', '/images/favorites'],
  ['/images?view=create', '/images/create'],
]) {
  const response = await request(path);
  assert.equal(response.status, 308, path);
  const rawLocation = response.headers.get('location');
  assert(rawLocation, path);
  const location = new URL(rawLocation, origin);
  assert.equal(location.origin, origin.origin, path);
  assert.equal(location.pathname, destination, path);
  privateCache(response, path);
  await response.arrayBuffer();
  result.checks.push({ path, status: response.status, cache: response.headers.get('cache-control') });
}

const signin = await request('/login');
assert.equal(signin.status, 200);
privateCache(signin, 'sign-in');
const html = await signin.text();
const asset = html.match(/(?:src|href)="(\/_next\/static\/[^"?#]+\.(?:js|css))"/)?.[1];
assert(asset, 'Expected a versioned browser asset');
const staticResponse = await request(asset, { method: 'HEAD' });
assert.equal(staticResponse.status, 200);
assert.match(staticResponse.headers.get('cache-control') || '', /public.*max-age=31536000.*immutable/);
result.checks.push({ path: '/login', status: signin.status, cache: signin.headers.get('cache-control') });
result.checks.push({ path: 'versioned browser asset', status: staticResponse.status, cache: staticResponse.headers.get('cache-control') });
result.result = 'passed';
if (process.env.GALX_AUTH_CACHE_RESULT) writeFileSync(process.env.GALX_AUTH_CACHE_RESULT, JSON.stringify(result, null, 2) + '\n');
console.log(`PASS ${result.checks.length} live cache checks; private routes uncached, versioned assets immutable`);
