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

for (const path of ['/images', '/images/library', '/images/favorites', '/sites', '/library', '/images/private.css', '/sites/private.js', '/library/private.png']) {
  for (const method of ['GET', 'HEAD']) {
    for (const headers of [{}, { cookie: 'galx_session=galx_sess_retired', rsc: '1', 'next-router-prefetch': '1' }]) {
      const response = await request(path, { method, headers });
      assert.equal(response.status, 307, path);
      const location = new URL(response.headers.get('location'), origin);
      assert.equal(location.origin, origin.origin, path);
      assert.equal(location.pathname, '/login', path);
      privateCache(response, path);
      await response.arrayBuffer();
      result.checks.push({ path, method, legacy_prefetch: Boolean(headers.cookie), status: response.status, cache: response.headers.get('cache-control') });
    }
  }
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
