import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requireSitesActivation, requireSitesCohort } from '../src/lib/billing/sites-activation';
import { sitesContentRoute } from '../src/lib/billing/sites-content-route';

const rate = { version: 'v1', model: 'test', maxInputTokens: 100, maxOutputTokens: 50, inputMicroUsdPerMillion: 1_000_000, outputMicroUsdPerMillion: 2_000_000 };
const now = Date.now();
const qualification = { schemaVersion: 1, profile: 'sites-text-v1', relayOrigin: 'https://relay.example', rateVersion: 'v1', model: 'test',
  checkedAt: now-1000, expiresAt: now+1000, outputLimitEnforced: true, maxOutputTokens: 50,
  durableReceiptVersion: 1, receiptSurvivedRestart: true, receiptRetentionDays: 30, cliArchiveUploaded: true,
  cliPrivatePublished: true, evidenceSha256: 'a'.repeat(64) };
test('activation requires fresh qualification of the exact model, tariff, ceiling, receipts and complete CLI publication', () => {
  assert.doesNotThrow(() => requireSitesActivation('1', JSON.stringify(qualification), 'https://relay.example', rate, now));
  for (const changed of [{ outputLimitEnforced: false }, { cliArchiveUploaded: false }, { cliPrivatePublished: false },
    { receiptSurvivedRestart: false }, { maxOutputTokens: 51 }, { model: 'another' }, { rateVersion: 'old' },
    { relayOrigin: 'https://other.example' }, { expiresAt: now }, { checkedAt: now+1 }, { expiresAt: now+86400001 },
    { receiptRetentionDays: 29 }, { durableReceiptVersion: 0 }, { evidenceSha256: 'invented' }]) {
    assert.throws(() => requireSitesActivation('1', JSON.stringify({ ...qualification, ...changed }), 'https://relay.example', rate, now));
  }
  for (const raw of [undefined, '{}', 'null', '[]', 'not-json']) assert.throws(() => requireSitesActivation('1', raw, 'https://relay.example', rate, now));
  assert.throws(() => requireSitesActivation('0', JSON.stringify(qualification), 'https://relay.example', rate, now));
});
test('a rejected activation touches neither wallet nor relay and emits only a public error', async () => {
  let touches = 0;
  const handler = sitesContentRoute({ authenticate: async () => ({ id: 'owner' }), configuration: () => ({
    pool: { connect: async () => { touches++; throw new Error('must not connect'); } }, rate, relay: { url: 'https://relay.example', key: 'private' },
    authorizeGeneration: () => { throw new Error('private-output-limit-diagnostic'); } }) });
  const response = await handler(new Request('https://galx.example/api/sites/content', { method: 'POST', headers: {
    authorization: 'Bearer session', 'content-type': 'application/json' }, body: JSON.stringify({ operationId: 'one', brief: 'Hello',
    repair: false, quoteVersion: 'v1', maxChargeMicroUsd: 200 }) }));
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: { code: 'content_unavailable' } }); assert.equal(touches, 0);
});

test('native-host delivery has its own qualification and cannot silently enable unattended CLI delivery', () => {
  const hosted = { ...qualification, deliveryMode: 'native_host', cliArchiveUploaded: false,
    nativeHostArchiveUploaded: true, hostedReceiptVerified: true };
  assert.doesNotThrow(() => requireSitesActivation('1', JSON.stringify(hosted), 'https://relay.example', rate, now, 'native_host'));
  for (const mode of ['cli', 'invalid', undefined]) {
    assert.throws(() => requireSitesActivation('1', JSON.stringify(hosted), 'https://relay.example', rate, now, mode));
  }
  for (const changed of [{ outputLimitEnforced: false }, { hostedReceiptVerified: false }, { nativeHostArchiveUploaded: false },
    { cliPrivatePublished: false }, { deliveryMode: 'cli' }, { receiptSurvivedRestart: false }]) {
    assert.throws(() => requireSitesActivation('1', JSON.stringify({ ...hosted, ...changed }), 'https://relay.example', rate, now, 'native_host'));
  }
  assert.throws(() => requireSitesActivation('1', JSON.stringify(qualification), 'https://relay.example', rate, now, 'native_host'));
});

test('cohort configuration is bounded, exact and default-deny', () => {
  assert.doesNotThrow(() => requireSitesCohort('["pilot-one","pilot-two"]', 'pilot-one'));
  for (const raw of [undefined, '', 'not-json', 'null', '{}', '[]', '"pilot-one"',
    '["*"]', '["pilot-one","*"]', '["pilot-one","pilot-one"]', '["pilot-one",1]',
    '[" pilot-one"]', '["pilot-one "]', '["pilot-one@example.com"]',
    JSON.stringify(Array.from({ length: 51 }, (_, i) => 'pilot-' + i)), ' '.repeat(16385)]) {
    assert.throws(() => requireSitesCohort(raw, 'pilot-one'));
  }
  for (const account of ['', '*', 'pilot', 'Pilot-one', 'pilot-one ', 'pilot-one@example.com'])
    assert.throws(() => requireSitesCohort('["pilot-one"]', account));
});

test('only the verified account can receive a quote or generate; cohort denial exposes no membership or diagnostics', async () => {
  let actor = 'outsider', gates = 0, generated = 0, wallets = 0;
  const handler = sitesContentRoute({ authenticate: async () => ({ id: actor }), configuration: () => ({
    rate, pool: { connect: async () => { wallets++; throw new Error('must not connect'); } },
    relay: { url: 'https://relay.example', key: 'private' },
    authorizeGeneration: (_signal, accountId) => { gates++; requireSitesCohort('["pilot-one"]', accountId); },
  }), generate: billing => async () => {
    generated++; assert.equal(billing.owner, 'pilot-one');
    return { text: '{}', cost: null };
  } });
  const post = () => new Request('https://galx.example/api/sites/content?accountId=pilot-one', { method: 'POST',
    headers: { authorization: 'Bearer session', 'content-type': 'application/json', 'x-account-id': 'pilot-one' },
    body: JSON.stringify({ operationId: 'one', brief: 'Hello', repair: false, quoteVersion: 'v1', maxChargeMicroUsd: 200 }) });
  const quote = () => new Request('https://galx.example/api/sites/content?accountId=pilot-one', {
    headers: { authorization: 'Bearer session', 'x-account-id': 'pilot-one' } });
  for (const request of [quote(), post()]) {
    const response = await handler(request);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: { code: 'content_unavailable' } });
    assert.match(response.headers.get('cache-control')!, /no-store/);
  }
  assert.equal(gates, 2); assert.equal(generated, 0); assert.equal(wallets, 0);
  actor = 'pilot-one';
  assert.equal((await handler(quote())).status, 200);
  assert.equal((await handler(post())).status, 200);
  assert.equal(generated, 1);
});

test('removing an account from the cohort does not prevent authenticated existing-operation recovery', async () => {
  let authorizations = 0, lookups = 0;
  const handler = sitesContentRoute({ authenticate: async () => ({ id: 'removed-pilot' }), configuration: () => ({
    rate, relay: { url: 'https://relay.example', key: 'private' },
    pool: { connect: async () => { lookups++; throw new Error('synthetic database unavailable'); } },
    authorizeGeneration: () => { authorizations++; requireSitesCohort('[]', 'removed-pilot'); },
  }) });
  // Recovery reaches the billing adapter even when new generation is denied.
  const response = await handler(new Request('https://galx.example/api/sites/content?operationId=existing', {
    headers: { authorization: 'Bearer session' } }));
  assert.equal(response.status, 503); // Synthetic database failure, not cohort denial.
  assert.deepEqual(await response.json(), { error: { code: 'content_unavailable' } });
  assert.equal(authorizations, 0); assert.equal(lookups, 1);
});
