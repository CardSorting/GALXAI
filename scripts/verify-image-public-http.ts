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
for (const path of ['/api/relay/status', '/api/internal/telemetry', '/api/queues']) {
  const denied = await fetch(`${base}${path}`); assert.equal(denied.status, 404);
  assert.doesNotMatch(await denied.text(), forbidden);
}
const browserAssets = new Set<string>();
for (const path of ['/', '/models/openai-gpt-image-latest', '/models/gpt-5.6-sol', '/llms.txt', '/api/openapi.json']) {
  const page = await fetch(`${base}${path}`); assert.equal(page.status, 200, path);
  const html = await page.text();
  assert.doesNotMatch(html, forbidden, path);
  for (const match of html.matchAll(/(?:src|href)="([^"?#]*\/_next\/static\/[^"?#]+\.(?:js|css))"/g)) {
    const asset = new URL(match[1], base);
    assert.equal(asset.origin, new URL(base).origin);
    browserAssets.add(asset.href);
  }
}
assert.ok(browserAssets.size > 0, 'Rendered pages must expose browser assets for verification');
for (const url of browserAssets) {
  const asset = await fetch(url);
  assert.equal(asset.status, 200);
  assert.doesNotMatch(await asset.text(), forbidden, new URL(url).pathname);
}
console.log(`PASS: compiled HTTP responses, preflight, protected diagnostics, rendered pages, public schema, and ${browserAssets.size} browser assets.`);
