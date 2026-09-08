import assert from 'node:assert/strict';

const base = process.env.GALX_VERIFY_ORIGIN || 'http://127.0.0.1:3419';
const forbidden = /codex|shardId|relayId|executionModel|routingMode|VM_RELAY_URL|GALX_VAULT_|stack_trace|stackTrace/i;
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
const options = await fetch(`${base}/v1/images/generations`, { method: 'OPTIONS' });
assert.equal(options.status, 204);
assert.doesNotMatch(JSON.stringify(Object.fromEntries(options.headers)), /X-Galx-Queue|X-Deployment-Id|X-Edge-FastPath|Server-Timing/i);
for (const path of ['/api/relay/status', '/api/internal/telemetry', '/api/queues']) {
  const denied = await fetch(`${base}${path}`); assert.equal(denied.status, 404);
  assert.doesNotMatch(await denied.text(), forbidden);
}
for (const path of ['/models/openai-gpt-image-latest', '/models/gpt-5.6-sol', '/llms.txt', '/api/openapi.json']) {
  const page = await fetch(`${base}${path}`); assert.equal(page.status, 200, path);
  assert.doesNotMatch(await page.text(), forbidden, path);
}
console.log('PASS: compiled HTTP responses, preflight, protected diagnostics, model pages, and public schema.');
