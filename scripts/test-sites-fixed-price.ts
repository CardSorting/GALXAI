import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SITES_RATE_CARD, PostgresSitesBilling, sitesRateCard, SitesBillingError } from '../src/lib/billing/sites-generation';
import { requireSitesActivation } from '../src/lib/billing/sites-activation';
import { requireSitesRelayPreflight } from '../src/lib/billing/sites-relay-preflight';
import { sitesContractReply, sitesContractRequest } from '../src/relay/sites-contract';
import { sitesContentRoute } from '../src/lib/billing/sites-content-route';

const pool = { connect: async (): Promise<never> => { throw new Error('must not connect'); } };
test('default fixed tariff and allowance need no supplier quota, token price or qualification assertion', () => {
  const rate = sitesRateCard(undefined);
  assert.equal(new PostgresSitesBilling(pool, 'owner', rate).reservation, 50_000);
  assert.equal(rate.maxDailyGenerations, 20);
  assert.doesNotThrow(() => requireSitesActivation('1', undefined, 'https://relay.example', rate, Date.now(), 'native_host'));
  assert.throws(() => requireSitesActivation('0', undefined, 'https://relay.example', rate));
  assert.throws(() => requireSitesActivation('1', undefined, 'https://relay.example', rate, Date.now(), 'invalid'));
  rate.fixedChargeMicroUsd = 1;
  assert.equal(DEFAULT_SITES_RATE_CARD.fixedChargeMicroUsd, 50_000);
  for (const patch of [{ fixedChargeMicroUsd: 0 }, { fixedChargeMicroUsd: -1 }, { fixedChargeMicroUsd: 1.5 },
    { fixedChargeMicroUsd: '50' }, { maxDailyGenerations: 0 }, { maxDailyGenerations: 101 }, { maxDailyGenerations: undefined },
    { billingMode: 'guess' }, { outputMicroUsdPerMillion: 1 }, { inputMicroUsdPerMillion: 1 }, { secret: 'private' }]) {
    assert.throws(() => new PostgresSitesBilling(pool, 'owner', { ...DEFAULT_SITES_RATE_CARD, ...patch } as any));
  }
  for (const raw of ['', 'null', '[]', '{}', 'invalid']) {
    assert.throws(() => new PostgresSitesBilling(pool, 'owner', sitesRateCard(raw)));
  }
});

test('local preflight attests local limits and receipts without asserting provider enforcement', async () => {
  const options = { url: 'https://relay.example', adminKey: 'private-admin', model: 'test',
    maxOutputTokens: 2048, profile: 'sites-local-v1' as const };
  const response = (url: URL | RequestInfo) => sitesContractReply(sitesContractRequest(new URL(String(url)).searchParams));
  await requireSitesRelayPreflight(options, async url => {
    const contract = response(url);
    assert.equal(contract.version, 2); assert.equal(contract.maxAttempts, 1);
    assert.equal(contract.maxOutputBytes, 12000); assert.equal(contract.maxWallTimeMs, 30000);
    assert(!Object.hasOwn(contract, 'outputLimitForwarded'));
    return Response.json(contract);
  });
  for (const patch of [{ version: 1 }, { profile: 'sites-text-v1' }, { maxAttempts: 2 },
    { maxOutputBytes: 12001 }, { maxWallTimeMs: 30001 }, { durableReceiptVersion: 0 },
    { receiptRetentionDays: 29 }, { nonce: 'stale' }, { outputLimitEnforced: true }]) {
    await assert.rejects(requireSitesRelayPreflight(options, async url => Response.json({ ...response(url), ...patch })));
  }
});

test('fixed quotes and allowance errors contain only customer fields', async () => {
  const rate = sitesRateCard(undefined);
  const route = sitesContentRoute({ authenticate: async () => ({ id: 'owner' }),
    configuration: () => ({ pool, rate, relay: { url: 'https://private.example', key: 'secret' } }),
    generate: () => async () => { throw new SitesBillingError('generation_allowance_exhausted'); } });
  const headers = { authorization: 'Bearer session', 'content-type': 'application/json' };
  const quote = await route(new Request('https://galx.example/api/sites/content', { headers }));
  assert.deepEqual(await quote.json(), { currency: 'USD', unit: 'micro_usd', quoteVersion: rate.version, maxChargeMicroUsd: 50_000 });
  const reply = await route(new Request('https://galx.example/api/sites/content', { method: 'POST', headers,
    body: JSON.stringify({ brief: 'A simple page', operationId: 'op', repair: false, quoteVersion: rate.version, maxChargeMicroUsd: 50_000 }) }));
  assert.equal(reply.status, 429);
  assert.deepEqual(await reply.json(), { error: { code: 'generation_limit_reached' } });
  assert.match(reply.headers.get('cache-control')!, /no-store/);
  assert(!/private\.example|secret/.test(JSON.stringify([...reply.headers])));
});
