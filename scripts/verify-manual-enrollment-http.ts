import assert from 'node:assert/strict';

const base = new URL(process.env.GALX_VERIFY_ORIGIN || 'http://127.0.0.1:3427');
assert.ok(['127.0.0.1', 'localhost', 'galx.ai', 'www.galx.ai'].includes(base.hostname), 'Use the local build or canonical deployment.');
const routes = [
  ['POST', '/api/auth/openai'],
  ['POST', '/api/auth/ingest'],
  ['POST', '/api/ingest'],
  ['POST', '/api/auth/oauth/callback'],
  ['GET', '/api/auth/oauth/callback'],
  ['GET', '/api/auth/oauth/url'],
  ['POST', '/api/auth/oauth/par'],
  ['POST', '/api/auth/oauth/refresh'],
] as const;
for (const [method, path] of routes) {
  for (const authorization of ['', 'Bearer forged-enrollment-session']) {
    const response = await fetch(new URL(path, base), {
      method, redirect: 'manual',
      headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
      ...(method === 'POST' ? { body: '{malformed' } : {}),
    });
    assert.equal(response.status, 410, `${method} ${path}`);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('location'), null);
    const body = await response.text();
    assert.deepEqual(JSON.parse(body), { error: 'Provider connections are unavailable.' });
    assert.doesNotMatch(body + JSON.stringify(Object.fromEntries(response.headers)), /shard|relay|codex|credential|stack_trace|stackTrace|DATABASE_URL/i);
  }
}
console.log(`PASS: ${routes.length * 2} external enrollment requests return the closed, sanitized, uncached contract.`);
