import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DesktopOrganization } from '../src/relay/desktop-organization.js';
import { workspaceHealth, matchesWorkspaceStatus } from '../src/relay/desktop-organizer.js';

function fixture(t: any) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'desktop-organization-')), file = path.join(dir, 'organization.json');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let ids = [randomUUID(), randomUUID(), randomUUID()];
  const store = new DesktopOrganization(file, () => ids);
  return { store, file, ids, setIds: (next: string[]) => { ids = next; }, change: (body: object) => store.change({ expectedRevision: store.snapshot().revision, ...body }) };
}

test('groups persist names, unique membership, workspace order and tab order across restart', t => {
  const f = fixture(t), a = randomUUID(), b = randomUUID();
  f.change({ action: 'create', groupId: a, name: ' Provider A ' }); f.change({ action: 'create', groupId: b, name: 'Provider B' });
  for (const id of f.ids) f.change({ action: 'move', desktopId: id, groupId: a, beforeId: null });
  f.change({ action: 'move', desktopId: f.ids[2], groupId: a, beforeId: f.ids[0] });
  assert.deepEqual(f.store.snapshot().groups[0].desktopIds, [f.ids[2], f.ids[0], f.ids[1]]);
  f.change({ action: 'move', desktopId: f.ids[0], groupId: b, beforeId: null });
  f.change({ action: 'rename', groupId: b, name: '日本語 & <review>' });
  f.change({ action: 'reorder', groupId: b, beforeGroupId: a });
  const state = f.store.snapshot(); assert.equal(state.groups[0].id, b); assert.equal(state.groups[0].name, '日本語 & <review>');
  assert.deepEqual(new DesktopOrganization(f.file, () => f.ids).snapshot(), state); assert.equal(fs.statSync(f.file).mode & 0o777, 0o600);
  const revision = state.revision; f.change({ action: 'move', desktopId: f.ids[0], groupId: b, beforeId: f.ids[0] }); assert.equal(f.store.snapshot().revision, revision);
});

test('removing a tab retains all workspaces; new and deleted desktops reconcile without restoring old membership', t => {
  const f = fixture(t), groupId = randomUUID(); f.change({ action: 'create', groupId, name: 'Keep files' });
  f.change({ action: 'move', desktopId: f.ids[0], groupId, beforeId: null });
  f.change({ action: 'remove', groupId }); assert.deepEqual(new Set(f.store.snapshot().ungrouped), new Set(f.ids));
  const added = randomUUID(); f.setIds([f.ids[1], added]); assert.deepEqual(f.store.snapshot().ungrouped, [f.ids[1], added]);
  f.change({ action: 'create', groupId: randomUUID(), name: 'New group' });
  assert(!fs.readFileSync(f.file, 'utf8').includes(f.ids[0]));
});

test('stale windows, duplicate names, malformed actions and invalid destinations cannot overwrite organization', t => {
  const f = fixture(t), groupId = randomUUID(), previous = f.store.snapshot().revision;
  f.change({ action: 'create', groupId, name: 'Provider A' }); const saved = fs.readFileSync(f.file, 'utf8');
  assert.throws(() => f.store.change({ action: 'remove', groupId, expectedRevision: previous }), /another window/);
  for (const body of [
    { action: 'create', groupId: randomUUID(), name: 'provider a' }, { action: 'create', groupId: randomUUID(), name: 'Ungrouped' },
    { action: 'rename', groupId, name: 'bad\nname' }, { action: 'rename', groupId, name: 'x'.repeat(41) },
    { action: 'move', desktopId: randomUUID(), groupId, beforeId: null }, { action: 'move', desktopId: f.ids[0], groupId, beforeId: f.ids[1] },
    { action: 'move', desktopId: f.ids[0], groupId: '../bad', beforeId: null }, { action: 'rename', groupId, name: 'Good', relayId: 'private' },
    { action: '__proto__' }, { action: 'toString' }, { action: 'reorder', groupId, beforeGroupId: 'missing' },
  ]) assert.throws(() => f.change(body));
  assert.equal(fs.readFileSync(f.file, 'utf8'), saved);
});

test('corrupt or failed organization storage fails closed without claiming a saved change', t => {
  const f = fixture(t); fs.writeFileSync(f.file, '{broken');
  const corrupt = new DesktopOrganization(f.file, () => f.ids); assert.equal(corrupt.snapshot().available, false);
  assert.throws(() => corrupt.change({}), /unavailable/);
  const failing = new DesktopOrganization(path.join(path.dirname(f.file), 'failed.json'), () => f.ids, () => { throw Error('PRIVATE_DISK_FAILURE'); });
  const revision = failing.snapshot().revision;
  assert.throws(() => failing.change({ action: 'create', groupId: randomUUID(), name: 'No false save', expectedRevision: revision }), /could not be confirmed/);
  assert.equal(failing.snapshot().revision, revision); assert.equal(failing.snapshot().groups.length, 0); assert.equal(failing.snapshot().available, false);
});

test('health groups distinguish serving health, stopped desktops, holds, setup and missing evidence', () => {
  const d = { state: 'running', relayId: 'a' }, relay = { registryFresh: true, health: 'healthy', workerState: 'running', eligibleModels: 2 };
  assert.equal(workspaceHealth(d, relay).bucket, 'ready'); assert.equal(workspaceHealth({ ...d, state: 'stopped' }, relay).bucket, 'ready');
  assert.equal(workspaceHealth(d, relay, false).bucket, 'unknown'); assert.equal(workspaceHealth(d, { ...relay, registryFresh: false }).bucket, 'unknown');
  assert.equal(workspaceHealth(d, { ...relay, paused: true }).bucket, 'paused'); assert.equal(workspaceHealth(d, { ...relay, health: 'cooldown' }).bucket, 'paused');
  assert.equal(workspaceHealth({ ...d, relayId: null }, undefined).bucket, 'setup');
  assert.equal(workspaceHealth(d, { ...relay, eligibleModels: 0 }).bucket, 'setup'); assert.equal(workspaceHealth(d, undefined).bucket, 'attention');
  for (const health of ['expired', 'rejected', 'degraded', 'unavailable', 'offline']) assert.equal(workspaceHealth(d, { ...relay, health }).bucket, 'attention');
  assert.equal(workspaceHealth({ ...d, credentialSync: { state: 'error' } }, relay).bucket, 'attention');
});

test('quick status filters combine selections and distinguish intentional deactivation from failure or stale evidence', () => {
  const desktop = { state: 'running', relayId: 'a' }, relay = { registryFresh: true, health: 'healthy', workerState: 'running', eligibleModels: 2 };
  const healthy = { healthy: true, deactivated: false }, deactivated = { healthy: false, deactivated: true }, both = { healthy: true, deactivated: true };
  assert(matchesWorkspaceStatus(desktop, relay, healthy)); assert(!matchesWorkspaceStatus(desktop, relay, deactivated));
  assert(matchesWorkspaceStatus({ ...desktop, state: 'stopped' }, relay, deactivated));
  assert(matchesWorkspaceStatus({ ...desktop, state: 'stopped' }, relay, healthy));
  assert(matchesWorkspaceStatus(desktop, { ...relay, paused: true }, deactivated));
  assert(matchesWorkspaceStatus(desktop, { ...relay, health: 'expired', paused: true }, deactivated));
  assert(!matchesWorkspaceStatus(desktop, { ...relay, health: 'expired' }, deactivated));
  assert(!matchesWorkspaceStatus(desktop, { ...relay, health: 'cooldown' }, deactivated));
  assert(matchesWorkspaceStatus(desktop, relay, both)); assert(matchesWorkspaceStatus(desktop, { ...relay, paused: true }, both));
  assert(!matchesWorkspaceStatus(desktop, relay, both, false));
  assert(!matchesWorkspaceStatus(desktop, { ...relay, paused: true, registryFresh: false }, both));
  assert(matchesWorkspaceStatus(desktop, undefined, { healthy: false, deactivated: false }, false));
});
