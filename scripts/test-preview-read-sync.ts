import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { PreviewReadSync } from '../src/lib/supabase/repositories/PreviewReadSync';
import { DeveloperAccessRepository } from '../src/lib/supabase/repositories/DeveloperAccessRepository';
import { enforceDeveloperAccess } from '../src/lib/security/developer-access';

type Query = { ids: string[]; versions: (string | null)[]; applications: boolean[];
  resolve: (result: unknown) => void; reject: (error: Error) => void };
function controlled() {
  const calls: Query[] = [];
  const database = { query: (_sql: string, values: [string[], (string | null)[], boolean[]]) => new Promise((resolve, reject) => {
    calls.push({ ids: values[0], versions: values[1], applications: values[2], resolve, reject });
  }) } as Pick<Pool, 'query'>;
  return { database, calls, store: PreviewReadSync.for(database) };
}
async function until(check: () => boolean) {
  const deadline = performance.now() + 3000;
  while (!check()) { assert(performance.now() < deadline, 'batch did not dispatch'); await new Promise(resolve => setTimeout(resolve, 1)); }
}
const record = (id: string, useCase = 'A bounded application for testing.') => ({ user_id: id, email: `${id}@example.test`,
  use_case: useCase, introduction: 'A builder testing a small application.', expected_traffic: 'exploring',
  github_url: 'https://github.com/builder', linkedin_url: null, cohort_interest: 'next', revision: 1,
  application_updated_at: null, status: 'approved', requested_at: '2026-09-12T12:00:00.000Z', reviewed_at: null, expires_at: null });
function finish(call: Query, approved = false, version = '1') {
  call.resolve({ rows: [{ checked: call.ids.length, approved: approved ? call.ids.map((_, index) => index + 1) : [],
    applications: call.ids.flatMap((id, index) => call.applications[index] ? [{ slot: index + 1, version,
      record: call.versions[index] !== version ? record(id) : null }] : []) }] });
}

test('queued approval checks coalesce; later requests never reuse an in-flight grant', async () => {
  const { store, calls } = controlled();
  const first = store.read('builder', false), duplicate = store.read('builder', false);
  await until(() => calls.length === 1); assert.deepEqual(calls[0].ids, ['builder']);
  const afterRevocation = store.read('builder', false);
  await until(() => calls.length === 2);
  finish(calls[1], false); finish(calls[0], true);
  assert.equal((await first).approved, true); assert.equal((await duplicate).approved, true);
  assert.equal((await afterRevocation).approved, false);
});

test('approval and application reads share one SQL batch without sharing account data', async () => {
  const { store, calls } = controlled();
  const reads = [store.read('one', true), store.read('two', true), store.read('one', false)];
  await until(() => calls.length === 1); finish(calls[0], true);
  const [one, two, approval] = await Promise.all(reads);
  assert.equal(one.record?.user_id, 'one'); assert.equal(two.record?.user_id, 'two'); assert.equal(approval.record, null);
  const warm = store.read('one', true); await until(() => calls.length === 2);
  assert.equal(calls[1].versions[0], '1'); finish(calls[1], true); assert.deepEqual((await warm).record, one.record);
  const independent = controlled(), isolated = independent.store.read('one', true);
  await until(() => independent.calls.length === 1); assert.equal(independent.calls[0].versions[0], null);
  finish(independent.calls[0]); await isolated;
});

test('database failure after a warm snapshot fails closed and sanitizes the HTTP response', async () => {
  const { database, store, calls } = controlled();
  const warm = store.read('builder', true); await until(() => calls.length === 1); finish(calls[0], true); await warm;
  const repo = new DeveloperAccessRepository(database);
  const denied = enforceDeveloperAccess(new Request('https://galx.ai/v1/models'), {
    identity: async () => ({ authenticated: true, userId: 'builder' }), approved: id => repo.isApproved(id),
  });
  await until(() => calls.length === 2); calls[1].reject(new Error('postgres://PRIVATE_CREDENTIAL topology'));
  const response = await denied; assert.equal(response?.status, 503);
  assert.doesNotMatch(await response!.text(), /PRIVATE_CREDENTIAL|postgres|topology/);
  const recovered = store.read('builder', true); await until(() => calls.length === 3);
  assert.equal(calls[2].versions[0], null, 'failure discards the local snapshot'); finish(calls[2], false); await recovered;
});

test('missing batch rows reject every caller and allow recovery', async () => {
  const { store, calls } = controlled();
  const reads = Promise.allSettled([store.read('one', false), store.read('two', false)]);
  await until(() => calls.length === 1); calls[0].resolve({ rows: [{ slot: 1, approved: true, version: null, record: null }] });
  assert((await reads).every(result => result.status === 'rejected'));
  const retry = store.read('one', false); await until(() => calls.length === 2); finish(calls[1]); assert.equal((await retry).approved, false);
});

test('batch size, concurrency and waiter limits bound load and recover after backpressure', async () => {
  const { store, calls } = controlled();
  const reads = Promise.all(Array.from({ length: 1024 }, (_, i) => store.read(String(i), false)));
  await assert.rejects(store.read('overflow', false), /capacity/);
  await until(() => calls.length === 4); assert(calls.every(call => call.ids.length <= 128));
  // No fifth query may start until one of the four active queries completes.
  await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(calls.length, 4);
  calls.slice(0, 4).forEach(call => finish(call));
  await until(() => calls.length === 8); calls.slice(4).forEach(call => finish(call));
  assert.equal((await reads).length, 1024);
  const next = store.read('after-drain', false); await until(() => calls.length === 9); finish(calls[8]); await next;
});

test('expired and evicted snapshots reload; cached content cannot become durable authority', async () => {
  const { store, calls } = controlled();
  const first = store.read('first', true); await until(() => calls.length === 1); finish(calls[0], true); await first;
  const originalNow = Date.now;
  const expiredAt = originalNow() + 60_001;
  try {
    Date.now = () => expiredAt;
    const expired = store.read('first', true);
    await until(() => calls.length === 2); assert.equal(calls[1].versions[0], null);
    finish(calls[1]); await expired;
  } finally { Date.now = originalNow; }
  const many = Promise.all(Array.from({ length: 512 }, (_, i) => store.read(`builder-${i}`, true)));
  await until(() => calls.length === 6); calls.slice(2).forEach(call => finish(call, true)); await many;
  const evicted = store.read('first', true); await until(() => calls.length === 7);
  assert.equal(calls[6].versions[0], null); finish(calls[6]); await evicted;
});
