/** Read-only deployed boundary check; no account creation, billing, DNS or Site mutation. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const origin = 'https://galx.ai';
const markers = ['galx_site_namespaces', 'galx_site_domains', 'GALX_SITES_DNS_API_TOKEN',
  'galx-sites-domain-v1', '_openai-site-verification', 'custom-domains.chatgpt.site',
  'sites-automation/durable', 'GALX_SITES_RELAY_ADMIN_KEY', 'workflow.sqlite',
  'publication_outcome_unknown', 'GALX_SITES_COHORT_ACCOUNT_IDS', 'sites-local-v1',
  'GALX_SITES_WORKER_TOKEN', 'GALX_SITES_DOMAINS_WORKER_ENABLED', 'site-addresses.sqlite'];
const workerMode = process.argv.includes('--worker');
const evidence = { checkedAt: new Date().toISOString(), origin, pages: [], assets: [], authorization: [],
  markers: markers.length, hits: [], authenticatedCustomerRoundTrip: false };
const assets = new Set();
function scan(url, text) {
  if (markers.some(marker => text.includes(marker))) evidence.hits.push(url);
}
async function get(url, init = {}) {
  const response = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const text = await response.text();
  assert(text.length <= 8 * 1024 * 1024, 'Unexpected response size');
  scan(url, text + JSON.stringify([...response.headers]));
  return { response, text };
}
for (const path of ['/', '/pricing', '/docs', '/auth/signin']) {
  const url = origin + path, { response, text } = await get(url);
  assert.equal(response.status, 200);
  evidence.pages.push({ path, status: response.status });
  for (const match of text.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)) {
    const asset = new URL(match[1].replaceAll('&amp;', '&'), origin);
    if (asset.origin === origin && asset.pathname.startsWith('/_next/static/')) assets.add(asset.href);
  }
}
for (const url of assets) {
  const { response } = await get(url); assert.equal(response.status, 200);
  evidence.assets.push(new URL(url).pathname);
}
for (const variant of ['missing', 'invalid', 'cookie-only', 'post']) {
  const headers = variant === 'invalid' ? { Authorization: 'Bearer invalid-test-session' }
    : variant === 'cookie-only' ? { Cookie: 'galx_session=invalid-test-session' } : {};
  const { response, text } = await get(origin + '/api/sites/domains?projectId=nonexistent-test-site',
    { headers, method: variant === 'post' ? 'POST' : 'GET' });
  assert.equal(response.status, 401); assert.deepEqual(JSON.parse(text), { error: { code: 'sign_in_required' } });
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  evidence.authorization.push({ variant, status: response.status });
}
const hostname = 'studio-delivery-preview.goldeneggie.galx.ai';
if (workerMode) {
  for (const variant of ['anonymous', 'customer-token', 'admin-cookie', 'crawler', 'wrong-machine']) {
    const headers = variant === 'customer-token' ? { Authorization: 'Bearer invalid-customer-session' }
      : variant === 'admin-cookie' ? { Cookie: 'admin=true; galx_session=invalid-session' }
      : variant === 'crawler' ? { 'User-Agent': 'Googlebot' }
      : variant === 'wrong-machine' ? { Authorization: 'Bearer ' + '0'.repeat(64) } : {};
    const { response, text } = await get(origin + '/api/internal/sites/domains/process', { method: 'POST', headers });
    assert.equal(response.status, 401); assert.deepEqual(JSON.parse(text), { error: { code: 'sign_in_required' } });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    evidence.authorization.push({ endpoint: 'worker', variant, status: response.status });
  }
}
const site = await fetch(`https://${hostname}/`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15000) });
await site.body?.cancel();
assert.equal(site.status, 401); // Existing owner-private audience, no credential or bypass token.
evidence.example = { hostname, verifiedTls: true, anonymousStatus: site.status };
assert.equal(evidence.hits.length, 0);
writeFileSync(new URL(workerMode ? './domain-worker-live-verification.json' : './domains-live-verification.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ pages: evidence.pages.length, assets: evidence.assets.length,
  authorization: evidence.authorization.length, privateMarkerHits: evidence.hits.length, example: evidence.example }));
