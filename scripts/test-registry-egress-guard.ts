import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RegistryEgressGuard, RegistryEgressLimitError, readBoundedRegistryJson } from '../src/relay/registry-egress-guard';

test('byte reservations survive restart and block I/O until allowance replenishes', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-budget-'));
  const stateFile = path.join(directory, 'budget.json');
  let now = 100_000;
  const options = { stateFile, now: () => now, policy: { maxResponseBytes: 8192, burstBytes: 16384, bytesPerHour: 16384 } };
  try {
    const first = new RegistryEgressGuard(options);
    await assert.rejects(first.run(async () => { throw new Error('connection dropped after dispatch'); }));
    const resumed = new RegistryEgressGuard(options);
    assert.equal(resumed.snapshot().requests, 1);
    await resumed.run(async (allowance, charge) => { charge(allowance); });
    let calls = 0;
    await assert.rejects(resumed.run(async () => { calls++; }), RegistryEgressLimitError);
    assert.equal(calls, 0, 'budget rejection happens before the origin request');
    now += 3_600_000;
    await resumed.run(async (_, charge) => { calls++; charge(27); });
    assert.equal(calls, 1);
    assert.equal(fs.statSync(stateFile).mode & 0o777, 0o600);
    assert(!fs.readFileSync(stateFile, 'utf8').includes('connection dropped'));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('request budget bounds tiny-response storms and backwards time does not refill it', async () => {
  let now = 100_000;
  const guard = new RegistryEgressGuard({ now: () => now, policy: { requestsPerMinute: 2 } });
  await guard.run(async (_, charge) => charge(27));
  await guard.run(async (_, charge) => charge(27));
  now -= 60_000;
  await assert.rejects(guard.run(async () => {}), RegistryEgressLimitError);
  now += 90_000;
  await guard.run(async (_, charge) => charge(27));
  assert.equal(guard.snapshot().requests, 3);
});

test('oversized or endless HTTP bodies are cancelled without trusting Content-Length', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array(1024)); },
    cancel() { cancelled = true; },
  });
  let charged = 0;
  await assert.rejects(readBoundedRegistryJson(new Response(stream), 2048, bytes => { charged += bytes; }), RegistryEgressLimitError);
  assert(cancelled);
  assert(charged <= 3072);
  assert.deepEqual(await readBoundedRegistryJson(Response.json([{ id: 'a' }]), 1024, () => {}), [{ id: 'a' }]);
});

test('successful responses refund unused reservations and malformed persistent state fails closed', async () => {
  const guard = new RegistryEgressGuard({ now: () => 1 });
  await guard.run(async (_, charge) => charge(100));
  assert.equal(guard.snapshot().accountedBytes, 1124);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-budget-invalid-'));
  try {
    const stateFile = path.join(directory, 'budget.json');
    fs.writeFileSync(stateFile, '{}');
    assert.throws(() => new RegistryEgressGuard({ stateFile }), /Invalid registry budget state/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('strict defaults bound bursts but allow a day of ordinary polling and bounded rotations', async () => {
  let now = 100000;
  const guard = new RegistryEgressGuard({ now: () => now });
  assert.equal(guard.snapshot().policy.maxResponseBytes, 256 * 1024);
  for (let i = 0; i < 4; i++) await guard.run(async (_, charge) => charge(52));
  await assert.rejects(guard.run(async () => {}), RegistryEgressLimitError);
  for (let poll = 0; poll < 43200; poll++) {
    now += 2000;
    await guard.run(async (_, charge) => charge(poll % 1800 === 0 ? 175207 : 52));
  }
  assert.equal(guard.snapshot().failures, 0);
  assert(guard.snapshot().accountedBytes < 50 * 1024 * 1024);
});
