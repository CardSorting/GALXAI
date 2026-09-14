import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { DurableReceipts, RECEIPT_RETENTION_MS } from '../src/relay/durable-receipts';

const tenant = 'a'.repeat(64), other = 'b'.repeat(64), fingerprint = 'c'.repeat(64);
const usage = { prompt_tokens: 11, completion_tokens: 5, total_tokens: 16 };
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'galx-receipts-'));
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

test('SIGKILL recovery distinguishes queued, unknown and durably completed work without replay', async () => {
  const directory = temp();
  const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import { DurableReceipts } from './src/relay/durable-receipts.ts';
    const store = new DurableReceipts(process.argv[1]);
    for (const id of ['queued','running','completed']) store.reserve(id, '${tenant}', '${fingerprint}');
    store.dispatch('running','${tenant}'); store.dispatch('completed','${tenant}');
    store.complete('completed','${tenant}', 'hello', ${JSON.stringify(usage)});
    process.stdout.write('committed'); setInterval(()=>{},1000);
  `, directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('Child exited before commit'); }),
      new Promise((_, reject) => { const t = setTimeout(() => reject(new Error('Child deadline')), 5000); t.unref(); })]);
    const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    const store = new DurableReceipts(directory);
    try {
      assert.equal(store.lookup('queued', tenant)?.status, 'not_started');
      assert.equal(store.lookup('running', tenant)?.status, 'unknown');
      assert.deepEqual(store.lookup('completed', tenant)?.usage, usage);
      assert.equal(store.lookup('completed', tenant)?.output, 'hello');
      assert.equal(store.lookup('completed', other), null);
      assert.throws(() => store.dispatch('running', tenant), /conflict/);
      assert.throws(() => store.dispatch('queued', tenant), /conflict/);
      assert.deepEqual(Object.keys(store.lookup('completed', tenant)!).sort(), ['id','output','retainedUntil','status','usage']);
    } finally { store.close(); }
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('a replacement writer fences prior dispatch and completion before releasing queued evidence', () => {
  const directory = temp(); const first = new DurableReceipts(directory);
  first.reserve('queued', tenant, fingerprint); first.reserve('running', tenant, fingerprint); first.dispatch('running', tenant);
  const second = new DurableReceipts(directory);
  try {
    assert.throws(() => first.dispatch('queued', tenant), /writer_fenced/);
    assert.throws(() => first.complete('running', tenant, 'late', usage), /writer_fenced/);
    assert.throws(() => first.reserve('new', tenant, fingerprint), /writer_fenced/);
    assert.equal(second.lookup('queued', tenant)?.status, 'not_started');
    assert.equal(second.lookup('running', tenant)?.status, 'unknown');
  } finally { first.close(); second.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('restoring an earlier receipt snapshot preserves identity and fails closed after restart', () => {
  const directory = temp();
  const snapshot = path.join(directory, 'earlier.sqlite');
  const store = new DurableReceipts(directory);
  try {
    store.reserve('restored', tenant, fingerprint);
    fs.copyFileSync(path.join(directory, 'receipts.sqlite'), snapshot);
    store.dispatch('restored', tenant);
    store.complete('restored', tenant, 'late result', usage);
    assert.equal(store.lookup('restored', tenant)?.status, 'completed');
  } finally { store.close(); }

  fs.copyFileSync(snapshot, path.join(directory, 'receipts.sqlite'));
  const restored = new DurableReceipts(directory);
  try {
    assert.equal(restored.lookup('restored', tenant)?.status, 'not_started');
    restored.reserve('restored', tenant, fingerprint);
    assert.equal(restored.lookup('restored', tenant)?.status, 'not_started');
    assert.throws(() => restored.dispatch('restored', tenant), /conflict/);
    assert.throws(() => restored.reserve('restored', tenant, other), /conflict/);
  } finally { restored.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('expired not-started evidence becomes an unknown tombstone instead of releasing admission', () => {
  const directory = temp(); let now = Date.now(); const store = new DurableReceipts(directory, () => now);
  try {
    store.reserve('not-started', tenant, fingerprint);
    store.stop('not-started', tenant);
    assert.equal(store.lookup('not-started', tenant)?.status, 'not_started');
    now += RECEIPT_RETENTION_MS;
    const expired = store.lookup('not-started', tenant);
    assert.equal(expired?.status, 'unknown');
    assert.equal(expired?.retainedUntil, null);
    store.reserve('not-started', tenant, fingerprint);
    assert.throws(() => store.dispatch('not-started', tenant), /conflict/);
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('capacity fails closed, unknown receipts never expire, and expired terminal evidence becomes an unknown tombstone', () => {
  const directory = temp(); let now = Date.now(); const store = new DurableReceipts(directory, () => now, 2);
  try {
    store.reserve('unknown', tenant, fingerprint); store.dispatch('unknown', tenant); store.stop('unknown', tenant);
    store.reserve('done', tenant, fingerprint); store.dispatch('done', tenant); store.complete('done', tenant, 'ok', usage);
    store.complete('done', tenant, 'ok', usage);
    assert.throws(() => store.complete('done', tenant, 'changed', usage), /conflict/);
    assert.throws(() => store.reserve('third', tenant, fingerprint), /capacity/);
    now += RECEIPT_RETENTION_MS + 1;
    const expired = store.lookup('done', tenant);
    assert.equal(expired?.status, 'unknown');
    assert.equal(expired?.output, null);
    assert.equal(expired?.usage, null);
    assert.equal(expired?.retainedUntil, null);
    assert.equal(store.lookup('unknown', tenant)?.status, 'unknown');
    store.reserve('done', tenant, fingerprint);
    assert.equal(store.lookup('done', tenant)?.status, 'unknown');
    assert.throws(() => store.reserve('done', tenant, other), /conflict/);
    assert.throws(() => store.reserve('third', tenant, fingerprint), /capacity/);
    assert.throws(() => store.reserve('unknown', tenant, other), /conflict/);
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('missing or inconsistent usage remains unknown; private provider fields are discarded', () => {
  const directory = temp(); const store = new DurableReceipts(directory);
  try {
    for (const [id, counts] of [['missing', undefined], ['invalid', { ...usage, total_tokens: 17 }], ['valid', { ...usage, secret: 'private' }]] as const) {
      store.reserve(id, tenant, fingerprint); store.dispatch(id, tenant); store.complete(id, tenant, 'hello', counts);
    }
    assert.equal(store.lookup('missing', tenant)?.usage, null); assert.equal(store.lookup('invalid', tenant)?.usage, null);
    assert.deepEqual(store.lookup('valid', tenant)?.usage, usage);
    assert(!JSON.stringify(store.lookup('valid', tenant)).includes('private'));
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('unsafe paths, foreign databases and damaged evidence fail closed', () => {
  const directory = temp();
  try {
    const link = path.join(directory, 'link'); fs.symlinkSync(directory, link);
    assert.throws(() => new DurableReceipts(link), /unavailable/);
    const filename = path.join(directory, 'receipts.sqlite'); fs.closeSync(fs.openSync(filename, 'wx', 0o600));
    const foreign = new DatabaseSync(filename); foreign.exec('CREATE TABLE unrelated(id INTEGER); PRAGMA user_version=42;'); foreign.close();
    assert.throws(() => new DurableReceipts(directory), /unavailable/);
    const check = new DatabaseSync(filename); assert.equal(check.prepare('PRAGMA user_version').get().user_version, 42); check.close();
    fs.unlinkSync(filename);
    const store = new DurableReceipts(directory); store.reserve('job', tenant, fingerprint); store.dispatch('job', tenant); store.complete('job', tenant, 'ok', usage); store.close();
    const attacker = new DatabaseSync(filename); attacker.exec("UPDATE receipts SET outcome='{}'"); attacker.close();
    const reopened = new DurableReceipts(directory);
    try { assert.throws(() => reopened.lookup('job', tenant), /integrity/); } finally { reopened.close(); }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
