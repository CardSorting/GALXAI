import assert from 'node:assert/strict';

const base = process.env.GALX_VERIFY_ORIGIN || 'http://127.0.0.1:3419';
const forbidden = /\bcodex\b|shardId|relayId|executionModel|routingMode|VM_RELAY_URL|GALX_VAULT_|\bstack_trace\b|\bstackTrace\b/i;
const response = await fetch(`${base}/v1/images/generations`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"prompt":"verification"}',
});
assert.equal(response.status, 401);
const raw = await response.text();
assert.doesNotMatch(raw, forbidden);
const error = JSON.parse(raw);
assert.deepEqual(Object.keys(error.error).sort(), ['code', 'message', 'request_id']);
assert.equal(error.error.code, 'unauthorized');
for (const key of ['server-timing', 'x-edge-fastpath', 'x-galx-router', 'x-powered-by', 'content-security-policy']) assert.equal(response.headers.get(key), null, key);
for (const token of [
  '00000000-0000-4000-8000-000000000000', 'user_security_probe', 'session_security_probe',
  `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'security_probe', exp: 4102444800, scopes: ['*'] })).toString('base64url')}.forged`,
]) {
  const denied = await fetch(`${base}/v1/images/generations`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt: 'verification' }),
  });
  assert.equal(denied.status, 401, 'unverified identity must be rejected');
  assert.doesNotMatch(await denied.text(), forbidden);
}
const options = await fetch(`${base}/v1/images/generations`, { method: 'OPTIONS' });
assert.equal(options.status, 204);
assert.doesNotMatch(JSON.stringify(Object.fromEntries(options.headers)), /X-Galx-Queue|X-Deployment-Id|X-Edge-FastPath|Server-Timing/i);
for (const [path, status] of [['/api/relay/status',401], ['/api/internal/telemetry',404], ['/api/queues',401]] as const) {
  // Machine routes retain their own admin guard; other private APIs hit the preview gate first.
  const denied = await fetch(`${base}${path}`); assert.equal(denied.status, status);
  assert.doesNotMatch(await denied.text(), forbidden);
}
for (const suffix of ['', '/thumbnail']) {
  const denied = await fetch(`${base}/v1/images/assets/invalid-capability${suffix}`);
  assert.equal(denied.status, 404, 'image capabilities reach their artifact guard without a developer-preview grant');
  assert.equal((await denied.json()).error.code, 'not_found');
}
for (const path of ['/models/openai-gpt-image-latest','/models/gpt-5.6-sol','/llms.txt']) {
  const denied = await fetch(`${base}${path}`, { redirect: 'manual' });
  assert.equal(denied.status, 307);
  assert.equal(new URL(denied.headers.get('location')!, base).pathname, '/developers');
}
const browserAssets = new Set<string>();
for (const path of ['/images', '/sites', '/sites/00000000-0000-4000-8000-000000000000']) {
  const page = await fetch(`${base}${path}`, { redirect: 'manual' });
  assert.equal(page.status, 307, path);
  assert.equal(new URL(page.headers.get('location')!, base).pathname, '/login');
  assert.equal(page.headers.get('cache-control'), 'private, no-store');
  assert.doesNotMatch(await page.text(), forbidden, path);
}
for (const path of ['/', '/login', '/pricing/galx-pro', '/knowledge-base/getting-started', '/api/openapi.json']) {
  const page = await fetch(`${base}${path}`); assert.equal(page.status, 200, path);
  const html = await page.text();
  assert.doesNotMatch(html, forbidden, path);
  for (const match of html.matchAll(/(?:src|href)="([^"?#]*\/_next\/static\/[^"?#]+\.(?:js|css))"/g)) {
    const asset = new URL(match[1], base);
    assert.equal(asset.origin, new URL(base).origin);
    browserAssets.add(asset.href);
  }
}
for (const authorization of ['', 'Bearer forged-quota-session']) {
  const denied=await fetch(`${base}/api/billing/generation-quota`,{headers:authorization?{authorization}:{}});
  assert.equal(denied.status,401);
  assert.equal(denied.headers.get('cache-control'),'private, no-store');
  const body=await denied.text();
  assert.doesNotMatch(body,forbidden);
  assert.deepEqual(JSON.parse(body),{error:'Sign in again to view your account.'},'quota requests must reach account authority, not developer-preview middleware');
}
assert.ok(browserAssets.size > 0, 'Rendered pages must expose browser assets for verification');
for (const url of browserAssets) {
  const asset = await fetch(url);
  assert.equal(asset.status, 200);
  assert.doesNotMatch(await asset.text(), forbidden, new URL(url).pathname);
}
console.log(`PASS: compiled HTTP responses, preflight, protected diagnostics, rendered pages, public schema, and ${browserAssets.size} browser assets.`);
