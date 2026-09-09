import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DesktopManager, type DesktopDriver } from '../src/relay/desktop-manager.js';
import { createDesktopCredentialRefresh } from '../src/relay/desktop-credential-refresh.js';
import { desktopLoginState } from '../src/relay/desktop-login-state.js';
import { DesktopTestRun } from './relay-desktop-fixture.js';

test('crash recovery reconciles committed writes, retries untouched authority, and preserves later updates', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'credential-recovery-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const fault of ['prepare', 'before-write', 'after-write', 'finalize', 'superseded'] as const) {
    const id = randomUUID(), file = path.join(root, fault + '.json'), now = Date.now();
    const accessToken = 'header.' + Buffer.from(JSON.stringify({ iat: Math.floor(now / 1000) - 10, exp: Math.floor(now / 1000) + 3600, 'https://api.openai.com/auth': { chatgpt_account_id: 'account' } })).toString('base64url') + '.PRIVATE_TOKEN';
    const candidate = { accountId: 'account', accessToken, refreshToken: 'PRIVATE_NEW' };
    const files = [{ source: 'manual' as const, modifiedAt: now, data: candidate }];
    let credential = { ...candidate, accessToken: 'old', refreshToken: 'old' }, row: any = { id: 'shard', user_id: 'owner', provider: 'openai', status: 'healthy', permission_retracted: false, encrypted_tag: 'original' };
    let writes = 0, fail = true, finalSave = false;
    const refresh = createDesktopCredentialRefresh({ read: async () => [{ ...row }], decrypt: () => credential,
      validate: async () => {}, encrypt: () => ({ encrypted_ciphertext: 'opaque', encrypted_iv: 'iv', encrypted_tag: 'new', key_version: 'v1' }),
      replace: async expected => {
        if (fail && fault === 'before-write') throw Error('interrupted');
        assert.equal(expected.encrypted_tag, row.encrypted_tag); writes++; credential = candidate; row.encrypted_tag = 'committed';
        if (fail && ['after-write', 'superseded'].includes(fault)) throw Error('ambiguous commit');
        finalSave = true; return true;
      } });
    const driver: DesktopDriver = { available: async () => true, list: async () => [{ id, containerId: id, running: true, healthy: true }],
      create: async () => {}, start: async () => {}, stop: async () => {}, destroy: async () => {}, launch: async () => {},
      clipboard: async () => '', display: async () => { throw Error('unused'); }, credentials: async () => files };
    fs.writeFileSync(file, JSON.stringify([{ id, name: fault, relayId: 'shard', desired: 'running', createdAt: now, updatedAt: now }]));
    const manager = new DesktopManager(file, driver, () => now, refresh); await manager.refresh();
    const save = (manager as any).save.bind(manager);
    (manager as any).save = () => { if (fail && (fault === 'prepare' || fault === 'finalize' && finalSave)) throw Error('disk failure'); save(); };
    await manager.syncCredential(id, 'shard');
    assert.equal(manager.snapshot().desktops[0].credentialSync.state, 'error', fault);
    if (fault === 'prepare') assert.equal(writes, 0);
    else assert(JSON.parse(fs.readFileSync(file, 'utf8'))[0].credentialIntent);
    assert.doesNotMatch(JSON.stringify(manager.snapshot()), /credentialIntent|expectedRevision|PRIVATE_/);
    if (fault === 'superseded') { credential = { ...candidate, refreshToken: 'EXTERNAL_NEWER' }; row.encrypted_tag = 'external'; }
    fail = false;
    const restored = new DesktopManager(file, driver, () => now, refresh); await restored.refresh(); await restored.syncCredential(id, 'shard');
    assert.equal(writes, 1, fault);
    if (fault === 'superseded') { assert.equal(restored.snapshot().desktops[0].credentialSync.code, 'credential_superseded'); assert.equal(credential.refreshToken, 'EXTERNAL_NEWER'); }
    else { assert(['updated', 'current'].includes(restored.snapshot().desktops[0].credentialSync.state)); assert.equal(JSON.parse(fs.readFileSync(file, 'utf8'))[0].credentialIntent, undefined); }
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  }
});

test('device challenges expose only an expiring user code and fixed verification origin', () => {
  const now = Date.now(), challenge = { state: 'waiting', userCode: 'ABCD-12345', updatedAt: now, expiresAt: now + 900000,
    verificationUri: 'https://attacker.test/', device_code: 'PRIVATE_DEVICE_SECRET', accessToken: 'PRIVATE_TOKEN', pid: 1 };
  assert.deepEqual(desktopLoginState(challenge, now), { state: 'waiting', userCode: 'ABCD-12345', verificationUri: 'https://auth.openai.com/codex/device', expiresAt: now + 900000 });
  for (const bad of [{ userCode: '<script>' }, { userCode: 'PRIVATE_TOKEN' }, { updatedAt: now + 900000 }, { expiresAt: now + 9999999 }]) assert.equal(desktopLoginState({ ...challenge, ...bad }, now).state, 'unavailable');
  assert.deepEqual(desktopLoginState(challenge, now + 900001), { state: 'expired' });
  assert.deepEqual(desktopLoginState({ ...challenge, state: 'cancelled' }, now), { state: 'cancelled' });
});

test('test-run cleanup retains partial resources for retry and never accepts a production namespace', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'desktop-cleanup-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const id = randomUUID(), destroyed: string[] = []; let fail = true;
  const factory = (namespace: string) => {
    assert.match(namespace, /^test-[a-f0-9]{16}$/);
    return { create: async () => { throw Error('Partial create'); }, destroy: async (target: string) => { assert.equal(target, id); if (fail) throw Error('Docker unavailable'); destroyed.push(target); } } as unknown as DesktopDriver;
  };
  const run = new DesktopTestRun('1234567890abcdef', root, factory);
  await assert.rejects(run.driver.create(id)); await assert.rejects(run.close(), /cleanup incomplete/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(run.directory, 'resources.json'), 'utf8')).ids, [id]);
  fail = false; await new DesktopTestRun(run.run, root, factory).close(); assert.deepEqual(destroyed, [id]);
  assert.throws(() => new DesktopTestRun('production', root, factory), /Invalid test run/);
  fs.writeFileSync(path.join(run.directory, 'resources.json'), JSON.stringify({ namespace: 'production', ids: [id] }));
  assert.throws(() => new DesktopTestRun(run.run, root, factory), /Invalid test manifest/);
});
