import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sitesContentRoute } from '../src/lib/billing/sites-content-route';
import { SitesBillingError } from '../src/lib/billing/sites-generation';

const rate = { version: 'v1', model: 'private-model-selection', inputMicroUsdPerMillion: 1000000,
  outputMicroUsdPerMillion: 2000000, maxInputTokens: 100, maxOutputTokens: 50 };
const brief = JSON.stringify({ schema_version: 1, title: 'Title', summary: 'Summary', sections: [{ heading: 'Heading', body: 'Body' }] });
const payload = { operationId: 'op-1', brief: 'Build a simple page', quoteVersion: 'v1', maxChargeMicroUsd: 200, repair: false };
const request = (body: unknown = payload, token = true, method = 'POST') => new Request('https://galx.example/api/sites/content', {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer test-session' } : {}) },
  ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
function fixture(options: { auth?: boolean; error?: unknown; text?: string } = {}) {
  let calls = 0, configured = 0;
  const route = sitesContentRoute({
    authenticate: async () => { if (options.auth === false) throw new Error('private auth detail'); return { id: 'authenticated-owner' }; },
    configuration: () => { configured++; return { rate, pool: { connect: async () => { throw new Error('unexpected database call'); } }, relay: { url: 'https://private-relay.example', key: 'secret' } }; },
    generate: (billing) => async (input) => {
      calls++; assert.equal(billing.owner, 'authenticated-owner'); assert.equal(input.requestedModel, rate.model);
      assert.equal(input.messages[0].role, 'system');
      if (options.error) throw options.error;
      return { text: options.text ?? brief, cost: { units: 20, receipt: 'receipt-1', diagnostic: 'never-public' } as any,
        headers: { upstream: 'secret' }, account: 'private-owner', model: rate.model } as any;
    },
  });
  return { route, calls: () => calls, configured: () => configured };
}
test('explicit verified bearer identity required before configuration or dispatch', async () => {
  const a = fixture(); assert.equal((await a.route(request(payload, false))).status, 401); assert.equal(a.configured(), 0);
  const b = fixture({ auth: false }); assert.equal((await b.route(request())).status, 401); assert.equal(b.configured(), 0);
});
test('quote and completed reply use explicit public DTOs and no upstream headers', async () => {
  const f = fixture();
  assert.deepEqual(await (await f.route(request(undefined, true, 'GET'))).json(), { currency: 'USD', unit: 'micro_usd', quoteVersion: 'v1', maxChargeMicroUsd: 200 });
  const response = await f.route(request());
  assert.equal(response.status, 200); assert.match(response.headers.get('cache-control')!, /no-store/);
  const result = await response.json();
  assert.deepEqual(result, { operationId: 'op-1', text: brief, cost: { units: 20, receipt: 'receipt-1' } });
  assert(!JSON.stringify([...response.headers]).includes('secret')); assert.equal(f.calls(), 1);
});
test('caller cannot choose account, rates, usage, model, messages or receipt', async () => {
  const f = fixture();
  for (const field of ['owner', 'cost', 'usage', 'model', 'messages', 'receipt']) {
    assert.equal((await f.route(request({ ...payload, [field]: 'injected' }))).status, 400);
  }
  for (const patch of [{ maxChargeMicroUsd: 1 }, { quoteVersion: 'stale' }, { brief: 'x'.repeat(2001) }, { operationId: '../bad' }])
    assert.equal((await f.route(request({ ...payload, ...patch }))).status, 400);
  assert.equal(f.calls(), 0);
});
test('chunked body is bounded and malformed content cannot leak diagnostics', async () => {
  const f = fixture({ text: 'private relay credential unavailable' });
  assert.equal((await f.route(request('x'.repeat(9000)))).status, 413);
  const response = await f.route(request());
  assert.deepEqual(await response.json(), { operationId: 'op-1', text: '', cost: { units: 20, receipt: 'receipt-1' } });
});
test('raw errors and internal failure codes never cross the response boundary', async () => {
  for (const error of [new Error('DATABASE_URL and upstream key'), new SitesBillingError('invalid_relay_configuration')]) {
    const response = await fixture({ error }).route(request());
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: { code: 'content_unavailable' } });
  }
  assert.equal((await fixture({ error: new SitesBillingError('insufficient_funds') }).route(request())).status, 402);
});
