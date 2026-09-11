import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requireSitesRelayPreflight } from '../src/lib/billing/sites-relay-preflight';
import { sitesContractReply, sitesContractRequest } from '../src/relay/sites-contract';
import { sitesContentRoute } from '../src/lib/billing/sites-content-route';

const config = { url: 'https://private-relay.example', adminKey: 'private-admin', model: 'test', maxOutputTokens: 64 };
const reply = (url: URL | RequestInfo) => sitesContractReply(sitesContractRequest(new URL(String(url)).searchParams));
test('fresh authenticated contract read is scoped, bounded and never starts inference', async () => {
  const nonces = new Set();
  const transport: typeof fetch = async (url, init) => {
    assert.equal(new URL(String(url)).pathname, '/api/sites/contract');
    assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error'); assert.equal(init?.cache, 'no-store');
    assert.deepEqual(init?.headers, { Authorization: 'Bearer private-admin' });
    const value = reply(url); nonces.add(value.nonce); return Response.json(value);
  };
  await requireSitesRelayPreflight(config, transport); await requireSitesRelayPreflight(config, transport);
  assert.equal(nonces.size, 2);
});
test('old workers, spoofed flags, mismatched models, cached replies and overlarge bodies fail closed', async () => {
  let cancelled = false;
  for (const transport of [
    async () => Response.json({ error: 'private upstream detail' }, { status: 404 }),
    async () => new Response('private detail', { status: 503 }),
    ...[{ version: 0 }, { outputLimitForwarded: false }, { outputLimitForwarded: 'true' }, { model: 'other' },
      { maxOutputTokens: 65 }, { receiptRetentionDays: 29 }, { durableReceiptVersion: 0 }, { nonce: 'stale' },
      { diagnostic: 'private' }].map(patch => async (url: any) => Response.json({ ...reply(url), ...patch })),
    async () => new Response(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(4097)); }, cancel() { cancelled = true; } }),
      { headers: { 'content-type': 'application/json' } }),
  ]) await assert.rejects(requireSitesRelayPreflight(config, transport as typeof fetch), /^Error: Content unavailable$/);
  assert.equal(cancelled, true);
});
test('invalid origins, missing administrator authority and cancelled requests perform no network reads', async () => {
  let reads = 0; const transport: typeof fetch = async () => { reads++; throw new Error(); };
  for (const patch of [{ url: 'http://private.example' }, { url: 'https://secret@private.example' },
    { url: config.url + '/wrong' }, { url: config.url + '?secret=key' }, { adminKey: undefined },
    { adminKey: 'bad\nkey' }, { model: '../bad' }, { maxOutputTokens: 0 }, { maxOutputTokens: 32769 },
    { signal: AbortSignal.abort() }]) await assert.rejects(requireSitesRelayPreflight({ ...config, ...patch }, transport));
  assert.equal(reads, 0);
});
test('asynchronous preflight is awaited before quoting, wallet access or generation and never leaks diagnostics', async () => {
  let touches = 0, preflights = 0, release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const rate = { version: 'v1', model: 'test', inputMicroUsdPerMillion: 1000000,
    outputMicroUsdPerMillion: 2000000, maxInputTokens: 100, maxOutputTokens: 50 };
  const route = sitesContentRoute({ authenticate: async () => ({ id: 'owner' }), configuration: () => ({ rate,
    pool: { connect: async () => { touches++; throw new Error(); } }, relay: { url: config.url, key: 'inference' },
    authorizeGeneration: async signal => { preflights++; assert(!signal.aborted); await pending; throw new Error('private-admin and upstream details'); } }),
    generate: () => async () => { touches++; throw new Error(); } });
  const headers = { Authorization: 'Bearer owner-session', 'content-type': 'application/json' };
  const requests = [new Request('https://galx.example/api/sites/content', { headers }),
    new Request('https://galx.example/api/sites/content', { headers, method: 'POST', body: JSON.stringify({
      operationId: 'op', brief: 'Hello', quoteVersion: 'v1', maxChargeMicroUsd: 200, repair: false }) })];
  let settled = 0; const calls = requests.map(r => route(r).then(result => { settled++; return result; }));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(preflights, 2); assert.equal(touches, 0); assert.equal(settled, 0); release();
  for (const response of await Promise.all(calls)) {
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: { code: 'content_unavailable' } });
    assert(!/private-admin|upstream details/.test(JSON.stringify([...response.headers])));
  }
  assert.equal(touches, 0);
});
