import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initialAuthority, transition, publicState, operationResult } from './model.mjs';
import { createAuthority, createConsole, listen, close } from './serve.mjs';
const command = (a, p, action, fields = {}) => ({ action, operationId: randomUUID(), ...(fields.id ? { expectedAccountRevision: a.pools[p].accounts.find(row => row.id === fields.id)?.revision } : { expectedRevision: a.pools[p].revision }), ...fields });
const run = (a, p, action, fields) => transition(a, p, command(a, p, action, fields));
const failure = (fn, status) => assert.throws(fn, error => error.status === status);
for (const p of ['premium', 'standard']) test(`${p}: manual registration, selective verification, nested DTO allowlist`, () => {
  let a = initialAuthority(true);
  a = run(a, p, 'create', { name: 'New account' }); const id = a.pools[p].accounts[0].id;
  a = run(a, p, 'signin', { id, duplicateFixture: false });
  failure(() => run(a, p, 'register', { id, confirmed: false }), 400);
  a = run(a, p, 'register', { id, confirmed: true });
  if (p === 'standard') { failure(() => run(a, p, 'verify', { id, outcome: 'images-denied' }), 400); assert.deepEqual(a.pools[p].verificationCalls, { text: 0, sites: 0, images: 0 }); }
  a = run(a, p, 'verify', { id, outcome: p === 'premium' ? 'images-denied' : 'success' });
  if (p === 'premium') { assert.equal(a.pools[p].accounts[0].capabilities.images, 'unavailable'); a = run(a, p, 'verify', { id, outcome: 'success' }); }
  assert.deepEqual(a.pools[p].verificationCalls, p === 'premium' ? { text: 1, sites: 1, images: 2 } : { text: 1, sites: 0, images: 0 });
  a.pools[p].privateDiagnostic = 'sentinel'; a.pools[p].accounts[0].credential = 'sentinel'; a.pools[p].accounts[0].capabilities.internal = 'sentinel'; a.pools[p].events[0].debug = 'sentinel';
  const snapshot = JSON.stringify(publicState(a.pools[p])); assert.ok(!snapshot.includes('sentinel')); assert.ok(!snapshot.includes('providerIdentity')); assert.ok(!snapshot.includes('operations'));
});
test('one central identity cannot register in both pools; peer details stay private', () => {
  let a = initialAuthority(true);
  for (const p of ['premium', 'standard']) {
    a = run(a, p, 'create', { name: 'Shared fixture' }); const id = a.pools[p].accounts[0].id;
    a = run(a, p, 'signin', { id, duplicateFixture: true });
    if (p === 'premium') a = run(a, p, 'register', { id, confirmed: true });
    else { failure(() => run(a, p, 'register', { id, confirmed: true }), 409); assert.equal(a.pools.standard.accounts[0].phase, 'review'); }
  }
  const foreign = a.pools.premium.accounts[0].id;
  failure(() => run(a, 'standard', 'set_paused', { id: foreign, paused: true }), 404);
  failure(() => run(a, 'standard', 'create', { name: 'Injected', profile: 'premium' }), 400);
});
test('independent account edits do not conflict; same-account stale edits do', () => {
  let a = initialAuthority();
  const one = command(a, 'premium', 'set_paused', { id: 'premium-primary', paused: true });
  const two = command(a, 'premium', 'set_paused', { id: 'premium-studio', paused: true });
  a = transition(a, 'premium', one); a = transition(a, 'premium', two);
  assert.ok(a.pools.premium.accounts.slice(0, 2).every(row => row.paused));
  failure(() => transition(a, 'premium', { ...one, operationId: randomUUID() }), 409);
});
test('exact replay is durable, immutable, pool-scoped and reauthorized', () => {
  let a = initialAuthority(); const c = command(a, 'premium', 'set_paused', { id: 'premium-primary', paused: true });
  a = transition(a, 'premium', c); const receipt = operationResult(a, 'premium', c.operationId);
  assert.equal(transition(a, 'premium', c), a);
  failure(() => transition(a, 'premium', { ...c, paused: false }), 409);
  failure(() => operationResult(a, 'standard', c.operationId), 404);
  a = run(a, 'premium', 'set_paused', { id: 'premium-primary', paused: false });
  assert.deepEqual(operationResult(a, 'premium', c.operationId), receipt);
  assert.equal(transition(a, 'premium', c).pools.premium.accounts[0].paused, false, 'replaying an old pause does not overwrite newer state');
  a = run(a, 'premium', 'mode', { mode: 'viewer' }); failure(() => transition(a, 'premium', c), 403);
});
test('pause/resume are explicit desired states; offline changes await acknowledgement', () => {
  let a = initialAuthority(); a = run(a, 'premium', 'relay', { online: false });
  a = run(a, 'premium', 'set_paused', { id: 'premium-primary', paused: true });
  let row = a.pools.premium.accounts[0]; assert.ok(row.paused); assert.ok(row.desiredGeneration > row.appliedGeneration);
  a = run(a, 'premium', 'set_paused', { id: row.id, paused: true }); assert.ok(a.pools.premium.accounts[0].paused, 'repeating pause cannot resume');
  failure(() => run(a, 'premium', 'verify', { id: row.id, outcome: 'success' }), 409);
  assert.ok(a.pools.standard.relayOnline);
  a = run(a, 'premium', 'relay', { online: true }); row = a.pools.premium.accounts[0]; assert.equal(row.desiredGeneration, row.appliedGeneration); assert.ok(row.paused);
});
test('ledger does not silently evict recovery identities on capacity or fixture reset', () => {
  let a = initialAuthority(); const c = command(a, 'premium', 'set_paused', { id: 'premium-primary', paused: true }); a = transition(a, 'premium', c);
  a = run(a, 'premium', 'reset', { empty: true }); assert.equal(operationResult(a, 'premium', c.operationId).status, 'saved');
  for (let i = Object.keys(a.operations).length; i < 10000; i++) a.operations[`fixture-${i}`] = {};
  failure(() => run(a, 'premium', 'create', { name: 'Capacity' }), 409); assert.ok(a.operations[c.operationId]);
});
test('HTTP: central persistence, concurrent identity claim, scope, lost reply, restart and shared outage', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-central-demo-test-'));
  const filename = path.join(dir, 'central.json'), tokens = { premium: randomUUID(), standard: randomUUID() };
  let authority = createAuthority({ filename, tokens, empty: true }), authorityUrl = await listen(authority);
  const consoles = [], urls = {};
  const call = async (p, route, data, extra = {}) => {
    const response = await fetch(urls[p] + route, { headers: { Origin: urls[p], 'Content-Type': 'application/json', ...extra }, ...(data ? { method: 'POST', body: JSON.stringify(data) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  try {
    for (const p of ['premium', 'standard']) { const gateway = createConsole({ authorityUrl, token: tokens[p] }); consoles.push(gateway); urls[p] = await listen(gateway); }
    assert.equal((await fetch(authorityUrl + '/api/state')).status, 403);
    assert.equal((await call('premium', '/api/action', {}, { Origin: urls.standard })).status, 403);
    const commands = {}, ids = {};
    for (const p of ['premium', 'standard']) {
      let snapshot = (await call(p, '/api/state')).body;
      let result = await call(p, '/api/action', { action: 'create', operationId: randomUUID(), expectedRevision: snapshot.revision, name: `${p} example` });
      ids[p] = result.body.operation.accountId;
      result = await call(p, '/api/action', { action: 'signin', operationId: randomUUID(), expectedAccountRevision: 1, id: ids[p], duplicateFixture: true });
      commands[p] = { action: 'register', operationId: randomUUID(), expectedAccountRevision: result.body.accounts[0].revision, id: ids[p], confirmed: true };
    }
    const results = await Promise.all(['premium', 'standard'].map(p => call(p, '/api/action', commands[p], { 'x-demo-lost-reply': '1' })));
    assert.deepEqual(results.map(r => r.status).sort(), [409, 502]);
    const winner = results[0].status === 502 ? 'premium' : 'standard', other = winner === 'premium' ? 'standard' : 'premium';
    let receipt = await call(winner, `/api/operations/${commands[winner].operationId}`); assert.equal(receipt.status, 200); assert.equal(receipt.body.operation.accountId, ids[winner]);
    assert.equal((await call(other, `/api/operations/${commands[winner].operationId}`)).status, 404);
    assert.equal((await call(other, '/api/action', { action: 'verify', id: ids[winner], expectedAccountRevision: 3, operationId: randomUUID(), outcome: 'success' })).status, 404);
    assert.equal((await call(winner, '/api/action', commands[winner])).status, 200);
    const savedPort = new URL(authorityUrl).port; await close(authority);
    assert.equal((await call(winner, '/api/state')).status, 503, 'no console-local registry fallback');
    authority = createAuthority({ filename, tokens }); await listen(authority, Number(savedPort));
    receipt = await call(winner, `/api/operations/${commands[winner].operationId}`); assert.equal(receipt.status, 200, 'receipt survives authority restart');
    await call(winner, '/demo/availability', { available: false });
    for (const p of ['premium', 'standard']) assert.equal((await call(p, '/api/state')).status, 503);
    await call(other, '/demo/availability', { available: true }); assert.equal((await call(winner, '/api/state')).status, 200);
    assert.deepEqual(fs.readdirSync(dir), ['central.json'], 'only one account store exists');
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    const asset = await (await fetch(urls.premium + '/app.js')).text(); for (const secret of Object.values(tokens)) assert.ok(!asset.includes(secret));
  } finally { await Promise.allSettled([...consoles, authority].map(close)); fs.rmSync(dir, { recursive: true, force: true }); }
});
