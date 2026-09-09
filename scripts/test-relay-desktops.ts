import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import WebSocket from 'ws';
import { DesktopManager, DockerDesktopDriver, type DesktopDriver, type DesktopContainer } from '../src/relay/desktop-manager.js';
import { RelayFederationLifecycle } from '../src/relay/federation-lifecycle.js';
import { RelayFederationServer } from '../src/relay/federation-server.js';
import type { RefreshDesktopCredential } from '../src/relay/desktop-credential-refresh.js';
import { DesktopCredentialError, type DesktopCredentialFile } from '../src/relay/desktop-credentials.js';
import { CapabilityRegistry } from '../src/relay/capability-registry.js';

class Driver implements DesktopDriver {
  items = new Map<string, DesktopContainer>(); calls: string[] = []; fail = ''; online = true; displayPort = 0;
  credentialFiles: DesktopCredentialFile[] = [];
  async credentials() { return this.credentialFiles; }
  async clipboard() { return 'PRIVATE_CLIPBOARD_CANARY'; }
  async display() { return net.createConnection({ host: '127.0.0.1', port: this.displayPort }); }
  async available() { return this.online; }
  async list() { if (!this.online) throw Error('PRIVATE_DAEMON_SECRET'); return [...this.items.values()]; }
  async create(id: string) { this.calls.push('create:' + id); if (this.fail === 'create') throw Error('PRIVATE_DAEMON_SECRET'); this.items.set(id, { id, containerId: randomUUID(), running: false, healthy: false }); }
  async start(id: string) { this.calls.push('start:' + id); if (this.fail === 'start') throw Error('PRIVATE_DAEMON_SECRET'); Object.assign(this.items.get(id)!, { running: true, healthy: true }); }
  async stop(id: string) { this.calls.push('stop:' + id); Object.assign(this.items.get(id)!, { running: false, healthy: false }); }
  async destroy(id: string) { this.calls.push('delete:' + id); if (this.fail === 'delete') throw Error('PRIVATE_DAEMON_SECRET'); this.items.delete(id); }
  async launch(id: string, app: 'terminal' | 'chrome' | 'signin') { this.calls.push(app + ':' + id); }
}
function fixture(t: any, refresh?: RefreshDesktopCredential) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'desktop-test-')), driver = new Driver(), file = path.join(dir, 'desktops.json');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, driver, file, manager: new DesktopManager(file, driver, Date.now, refresh) };
}

test('retries and concurrent creates have one identity; restarts never spawn a desktop', async t => {
  const { file, driver, manager } = fixture(t), input = { id: randomUUID(), name: 'Setup one' };
  assert.deepEqual(await Promise.all([manager.create(input), manager.create(input)]), [input.id, input.id]);
  assert.equal(driver.calls.filter(c => c.startsWith('create')).length, 1);
  await assert.rejects(manager.create({ ...input, name: 'Changed' }), /another desktop/);
  const restored = new DesktopManager(file, driver); await restored.refresh();
  assert.equal(restored.snapshot().desktops[0].state, 'running'); assert.equal(driver.calls.length, 2);
  await manager.action(input.id, 'stop'); assert.equal(manager.snapshot().desktops[0].state, 'stopped');
  await manager.action(input.id, 'start'); assert.equal(driver.calls.filter(c => c.startsWith('create')).length, 1);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert(!/containerId|5910|PRIVATE_/.test(JSON.stringify(manager.snapshot())));
});

test('concurrent starts obey a global running limit and closed apps are distinct from deleted files', async t => {
  const { manager, driver } = fixture(t);
  const results = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => manager.create({ id: randomUUID(), name: 'Desktop ' + i })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 3);
  assert.equal(driver.items.size, 3); assert.equal(manager.snapshot().runningCount, 3);
  const first = manager.snapshot().desktops[0];
  await assert.rejects(manager.action(first.id, 'delete', 'wrong'), /Type the desktop name/);
  assert.equal(driver.items.size, 3);
  await manager.action(first.id, 'stop'); assert.equal(manager.snapshot().desktops.length, 3);
  await manager.create({ id: randomUUID(), name: 'Replacement' }); assert.equal(manager.snapshot().runningCount, 3);
  await manager.action(first.id, 'delete', first.name); assert.equal(manager.snapshot().desktops.length, 3);
});

test('partial creation is retained and retried without duplicate resources or disclosed engine errors', async t => {
  const { manager, driver } = fixture(t), input = { id: randomUUID(), name: 'Recoverable' };
  driver.fail = 'start'; await assert.rejects(manager.create(input), error => !String(error).includes('PRIVATE_'));
  assert.equal(manager.snapshot().desktops.length, 1); assert.equal(manager.snapshot().desktops[0].error, 'desktop_operation_failed');
  await manager.create(input); assert.equal(driver.calls.filter(c => c.startsWith('create')).length, 1);
  driver.fail = ''; await manager.action(input.id, 'start'); assert.equal(manager.snapshot().desktops[0].canConnect, true);
  driver.fail = 'delete'; await assert.rejects(manager.action(input.id, 'delete', input.name)); assert.equal(manager.snapshot().desktops.length, 1);
  driver.online = false; await manager.refresh(true); assert.equal(manager.snapshot().desktops[0].state, 'unknown');
  assert.equal(manager.snapshot().desktops[0].canConnect, false); await assert.rejects(manager.action(input.id, 'delete', input.name));
  driver.online = true; driver.fail = ''; await manager.action(input.id, 'delete', input.name); assert.equal(manager.snapshot().desktops.length, 0);
});

test('invalid or corrupt desktop records fail closed', async t => {
  const { manager, file, driver } = fixture(t);
  for (const input of [{ id: '../host', name: 'No' }, { id: randomUUID(), name: '' }, { id: randomUUID(), name: 'Name\ncommand' }, { id: randomUUID(), name: 'Name', relayId: '../../host' }]) assert.throws(() => manager.create(input));
  fs.writeFileSync(file, '{broken'); const corrupt = new DesktopManager(file, driver); await corrupt.refresh();
  assert.equal(corrupt.snapshot().journalHealthy, false); assert.throws(() => corrupt.create({ id: randomUUID(), name: 'No' })); assert.equal(driver.calls.length, 0);
});

test('Docker driver confines resources and never treats failed ownership inspection as absence', async () => {
  const driver = new DockerDesktopDriver('test'), id = randomUUID(), calls: string[][] = [];
  (driver as any).docker = async (args: string[]) => { calls.push(args); if (args[0] === 'ps' || args[1] === 'ls') return ''; return 'created'; };
  await driver.create(id);
  const args = calls.find(a => a[0] === 'create')!;
  for (const required of ['1000:1000', 'ALL', 'no-new-privileges:true', '512', '2g', 'unless-stopped']) assert(args.includes(required));
  assert(!args.some(a => /publish|docker.sock|privileged|network=host|ipc=host|seccomp=unconfined|SYS_ADMIN/.test(a)));
  assert(args.find(a => a.startsWith('type=volume,'))?.endsWith('target=/home/operator'));
  calls.length = 0;
  (driver as any).docker = async (args: string[]) => { calls.push(args); if (args[0] === 'ps') return ''; if (args[1] === 'ls') return `galx-desktop-test-${id}-home`; if (args[1] === 'inspect') throw Error('Daemon failed'); return ''; };
  await assert.rejects(driver.destroy(id), /Daemon failed/); assert(!calls.some(a => a[1] === 'rm'));
  (driver as any).docker = async (args: string[]) => { if (args[1] === 'ls') return `galx-desktop-test-${id}-net`; return JSON.stringify({ 'io.galx.desktop.namespace': 'someone-else', 'io.galx.desktop.id': id }); };
  await assert.rejects(driver.create(id), /ownership mismatch/);
});

async function httpFixture(t: any, withShard = false, refresh?: RefreshDesktopCredential) {
  const shard = { id: 'fixture-shard', provider: 'openai', accountId: 'PRIVATE_ACCOUNT', accessToken: 'PRIVATE_TOKEN', credentialRevision: 'PRIVATE_REVISION' };
  const handle = { id: 'fixture-relay', shardId: shard.id, generation: 'fixture-generation', credentialRevision: shard.credentialRevision, endpoint: 'http://127.0.0.1:1', adminKey: 'PRIVATE_WORKER_ADMIN', inferenceKey: 'PRIVATE_WORKER_KEY', running: true };
  const records = new CapabilityRegistry(); records.register(shard.id, handle.id, handle.generation, 'openai'); records.publishInventory(records.beginRefresh(shard.id)!, ['A']);
  const f = fixture(t, refresh), lifecycle = new RelayFederationLifecycle(async () => withShard ? [shard] : [], { list: async () => withShard ? [handle] : [], start: async () => { throw Error('No serving worker'); }, inspect: async () => { records.heartbeat(shard.id, {}); return { record: records.get(shard.id) }; }, remove: async () => {} });
  await lifecycle.reconcile();
  const server = new RelayFederationServer(lifecycle, { secret: 's'.repeat(32), apiKeys: ['ordinary-user'], adminKeys: ['PRIVATE_ADMIN_CANARY'], port: 0, desktops: f.manager });
  await server.start(); const base = 'http://127.0.0.1:' + (server.server.address() as net.AddressInfo).port;
  t.after(async () => { await server.stop(); await lifecycle.stop(); });
  const login = async (scope = 'desktops') => {
    const access = await fetch(`${base}/api/${scope}/access`, { method: 'POST', headers: { Authorization: 'Bearer PRIVATE_ADMIN_CANARY' } }); assert.equal(access.status, 200);
    const { ticket } = await access.json();
    const session = await fetch(`${base}/api/${scope}/session`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket }) }); assert.equal(session.status, 200);
    return session.headers.get('set-cookie')!.split(';')[0];
  };
  return { ...f, server, base, login, lifecycle };
}

test('desktop HTML, modules, mutations and diagnostic DTOs require a separate local administrator session', async t => {
  const { base, login, manager } = await httpFixture(t), id = randomUUID();
  await manager.create({ id, name: 'PRIVATE_WORKSPACE_CANARY' });
  for (const route of ['/desktops', '/desktops/', '/desktops/assets/login.js']) {
    const r = await fetch(base + route); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
    assert(!/PRIVATE_|shard|Docker|containerId|relay-link/.test(await r.text()));
  }
  const monitor = await login('monitor');
  for (const route of ['/api/desktops/state', '/desktops/assets/app.js', '/desktops/assets/activity.js', '/desktops/assets/novnc/core/rfb.js']) {
    for (const headers of [{}, { Authorization: 'Bearer ordinary-user' }, { cookie: monitor }, { Authorization: 'Bearer PRIVATE_ADMIN_CANARY' }]) {
      const r = await fetch(base + route, { headers }); assert.equal(r.status, 401); assert(!/PRIVATE_|containerId|5910/.test(await r.text()));
    }
  }
  assert.equal((await fetch(base + '/api/desktops/access', { method: 'POST', headers: { Authorization: 'Bearer ordinary-user' } })).status, 401);
  const cookie = await login(), state = await fetch(base + '/api/desktops/state', { headers: { cookie } });
  assert.equal(state.status, 200); const raw = await state.text(); assert(raw.includes('PRIVATE_WORKSPACE_CANARY')); assert(!/PRIVATE_ADMIN_CANARY|containerId|5910/.test(raw));
  for (const route of ['/desktops', '/desktops/assets/app.js', '/desktops/assets/activity.js', '/desktops/assets/novnc/core/rfb.js', '/desktops/assets/novnc/vendor/pako/lib/zlib/inflate.js']) assert.equal((await fetch(base + route, { headers: { cookie } })).status, 200);
  assert.equal((await fetch(base + '/desktops/assets/novnc/core/%2e%2e%2f%2e%2e%2fpackage.json', { headers: { cookie } })).status, 404);
  for (const extra of [{ Origin: 'https://evil.example' }, { 'x-forwarded-for': '127.0.0.1' }, { Forwarded: 'for=127.0.0.1' }, { 'cf-connecting-ip': '127.0.0.1' }, { 'sec-fetch-site': 'cross-site' }]) {
    assert.equal((await fetch(base + '/api/desktops/state', { headers: { cookie, ...extra } })).status, 403);
  }
  const post = (route: string, body: object, origin: string | undefined = base) => fetch(base + '/api/desktops/' + route, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
  assert.equal((await post(id + '/stop', {}, '')).status, 403);
  assert.equal((await post(id + '/launch', { app: 'bash -c touch /host' })).status, 400);
  assert.equal((await post('create', { id: randomUUID(), name: 'Bad link', relayId: 'not-in-registry' })).status, 400);
  assert.equal((await post(id + '/delete', { confirmation: 'wrong' })).status, 400);
  assert.deepEqual(await (await post(id + '/clipboard', {})).json(), { text: 'PRIVATE_CLIPBOARD_CANARY' });
  assert.equal((await post(id + '/clipboard', { text: 123 })).status, 400);
  assert.equal((await post(id + '/clipboard', { text: 'a'.repeat(65537) })).status, 400);
  assert.deepEqual(await (await post(id + '/clipboard', { text: 'multiline\n日本語' })).json(), { ok: true });
  assert.equal((await post(id + '/stop', {})).status, 200);
  assert.equal((await fetch(base + '/api/monitor/state', { headers: { cookie } })).status, 401);
  assert.equal((await fetch(base + '/api/desktops/session', { method: 'DELETE', headers: { cookie, Origin: base } })).status, 200);
  assert.equal((await fetch(base + '/api/desktops/state', { headers: { cookie } })).status, 401);
});

function connect(url: string, headers: Record<string, string>) {
  return new Promise<WebSocket>((resolve, reject) => { const ws = new WebSocket(url, { headers }); ws.once('error', reject); ws.once('open', () => resolve(ws)); });
}

test('display gateway enforces origin, scope, connection limits, binary forwarding and revocation', async t => {
  const { base, login, manager, driver } = await httpFixture(t), id = randomUUID();
  const tcp = net.createServer(s => s.on('data', chunk => s.write(chunk))); tcp.listen(0, '127.0.0.1'); await once(tcp, 'listening');
  t.after(() => tcp.close());
  await manager.create({ id, name: 'Display test' }); driver.displayPort = (tcp.address() as net.AddressInfo).port;
  const cookie = await login(), url = base.replace('http:', 'ws:') + '/api/desktops/' + id + '/display';
  await assert.rejects(connect(url, { Origin: base }));
  await assert.rejects(connect(url, { Origin: 'https://evil.example', cookie }));
  await assert.rejects(connect(url, { Origin: base, cookie: await login('monitor') }));
  await assert.rejects(connect(url + '?port=22', { Origin: base, cookie }));
  const a = await connect(url, { Origin: base, cookie }), b = await connect(url, { Origin: base, cookie });
  t.after(() => { a.terminate(); b.terminate(); });
  await assert.rejects(connect(url, { Origin: base, cookie }));
  const response = once(a, 'message'); a.send(Buffer.from('binary-input')); assert.equal((await response)[0].toString(), 'binary-input');
  const aClosed = once(a, 'close'), bClosed = once(b, 'close');
  await fetch(base + '/api/desktops/session', { method: 'DELETE', headers: { cookie, Origin: base } });
  await Promise.all([aClosed, bClosed]); await assert.rejects(connect(url, { Origin: base, cookie }));
});

test('a slow operation leaves another workspace usable; starts reserve capacity before Docker finishes', async t => {
  const { manager, driver } = fixture(t);
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  for (const id of ids) { await manager.create({ id, name: 'Workspace ' + id.slice(0, 4) }); await manager.action(id, 'stop'); }
  let release!: () => void, entered!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const began = new Promise<void>(resolve => { entered = resolve; });
  const original = driver.start.bind(driver);
  driver.start = async id => { if (id === ids[0]) { entered(); await waiting; } await original(id); };
  const slow = manager.action(ids[0], 'start'); await began;
  const duplicate = manager.action(ids[0], 'start');
  assert.throws(() => manager.action(ids[0], 'stop'), /already in progress/);
  await manager.action(ids[1], 'start');
  assert.equal(driver.items.get(ids[0])!.running, false);
  assert.equal(driver.items.get(ids[1])!.running, true);
  await manager.action(ids[2], 'start');
  await assert.rejects(manager.create({ id: randomUUID(), name: 'Over capacity' }), /Stop a desktop/);
  assert.equal(manager.snapshot().reservedCount, 1);
  release(); await Promise.all([slow, duplicate]);
  assert.equal(manager.snapshot().runningCount, 3);
  assert.equal(driver.calls.filter(c => c === 'start:' + ids[0]).length, 2, 'one original create and one resumed start');
  assert(manager.snapshot().activity.some(e => e.outcome === 'failed' && e.code === 'desktop_capacity'));
  assert(manager.snapshot().activity.some(e => e.outcome === 'completed' && e.durationMs !== undefined));
  assert.equal(manager.snapshot().activeOperations, 0);
});

test('parallel operation count is bounded and queued desktops explain their wait', async t => {
  const { manager, driver } = fixture(t), ids = [randomUUID(), randomUUID(), randomUUID()];
  for (const id of ids) await manager.create({ id, name: 'Bounded ' + id.slice(0, 4) });
  const original = driver.stop.bind(driver), releases: Array<() => void> = [];
  driver.stop = async id => { await new Promise<void>(r => releases.push(r)); await original(id); };
  const stops = ids.map(id => manager.action(id, 'stop'));
  for (let i = 0; i < 20 && releases.length < 2; i++) await new Promise(r => setImmediate(r));
  assert.equal(releases.length, 2); assert.equal(manager.snapshot().activeOperations, 2);
  assert.equal(manager.snapshot().queuedOperations, 1);
  assert.equal(manager.snapshot().desktops.find(d => d.id === ids[2])!.state, 'queued');
  releases[0]();
  for (let i = 0; i < 20 && releases.length < 3; i++) await new Promise(r => setImmediate(r));
  assert.equal(releases.length, 3); releases[1](); releases[2](); await Promise.all(stops);
  assert.equal(manager.snapshot().runningCount, 0);
  driver.items.get(ids[0])!.running = true; driver.items.get(ids[0])!.unhealthy = true;
  await manager.refresh(true); assert.equal(manager.snapshot().desktops.find(d => d.id === ids[0])!.state, 'unhealthy');
});

test('shard linking and traffic control enforce desktop administrator scope, origin, link identity and generation', async t => {
  const { base, login, manager, lifecycle, file, driver } = await httpFixture(t, true), id = randomUUID();
  await manager.create({ id, name: 'Repair workspace' });
  const route = base + '/api/desktops/' + id, monitor = await login('monitor'), cookie = await login();
  const post = (action: string, body: object, headers: Record<string, string> = { cookie, Origin: base }) => fetch(route + '/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  for (const headers of [{}, { Authorization: 'Bearer ordinary-user' }, { cookie: monitor }, { Authorization: 'Bearer PRIVATE_ADMIN_CANARY' }]) {
    for (const action of ['link', 'traffic']) assert.equal((await post(action, {}, headers)).status, 401);
  }
  assert.equal((await post('link', { shardId: 'fixture-shard', expectedShardId: null }, { cookie, Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('link', { shardId: 'missing', expectedShardId: null })).status, 400);
  assert.equal((await post('link', { shardId: 'fixture-shard', expectedShardId: null })).status, 200);
  assert.equal(new DesktopManager(file, driver).linkedShard(id), 'fixture-shard');
  const calls = driver.calls.length;
  assert.equal((await post('link', { shardId: null, expectedShardId: null })).status, 409);
  assert.equal((await post('traffic', { shardId: 'another', paused: true, generation: 'fixture-generation' })).status, 409);
  assert.equal((await post('traffic', { shardId: 'fixture-shard', paused: 'yes', generation: 'fixture-generation' })).status, 400);
  assert.equal((await post('traffic', { shardId: 'fixture-shard', paused: true, generation: 'stale' })).status, 409);
  assert.equal((await post('traffic', { shardId: 'fixture-shard', paused: true, generation: 'fixture-generation' })).status, 200);
  assert.equal(lifecycle.capabilities.select('A'), undefined); assert.equal(manager.snapshot().desktops[0].canConnect, true);
  assert.equal(driver.calls.length, calls, 'linking and shard pause perform no desktop I/O');
  const raw = await (await fetch(base + '/api/desktops/state', { headers: { cookie } })).text();
  assert(!/PRIVATE_(ACCOUNT|TOKEN|REVISION|WORKER_ADMIN|WORKER_KEY)|accessToken|inferenceKey|adminKey|credentialRevision|endpoint/.test(raw));
  const state = JSON.parse(raw); assert.equal(state.relays[0].relayId, 'fixture-relay'); assert.equal(state.relays[0].paused, true);
  assert.equal((await post('traffic', { shardId: 'fixture-shard', paused: false, generation: 'fixture-generation' })).status, 200); assert(lifecycle.capabilities.select('A'));
  assert.equal((await post('link', { shardId: null, expectedShardId: 'fixture-shard' })).status, 200);
  assert.equal((await post('traffic', { shardId: 'fixture-shard', paused: true, generation: 'fixture-generation' })).status, 409);
  assert.equal(manager.linkedShard(id), undefined);
});


test('activity consolidates phases, preserves names after deletion and keeps retries distinct', async t => {
  const { manager, driver } = fixture(t), input = { id: randomUUID(), name: 'Repair workspace' };
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), original = driver.create.bind(driver);
  driver.create = async id => { await gate; await original(id); };
  const created = manager.create(input), duplicate = manager.create(input);
  assert.equal(created, duplicate);
  const running = manager.snapshot().activity[0];
  assert.equal(running.outcome, 'running'); assert.equal(running.name, input.name);
  assert.equal(manager.snapshot().activity.length, 1);
  release(); await created;
  const complete = manager.snapshot().activity[0];
  assert.equal(complete.id, running.id); assert.equal(complete.sequence, running.sequence);
  assert.equal(complete.outcome, 'completed'); assert(complete.finishedAt! >= complete.startedAt!);
  running.name = 'Changed snapshot'; assert.equal(manager.snapshot().activity[0].name, input.name);
  driver.fail = 'delete'; await assert.rejects(manager.action(input.id, 'delete', input.name));
  const failed = manager.snapshot().activity[0]; assert.equal(failed.code, 'desktop_operation_failed');
  assert(!JSON.stringify(manager.snapshot().activity).includes('PRIVATE_DAEMON_SECRET'));
  driver.fail = ''; await manager.action(input.id, 'delete', input.name);
  const deleted = manager.snapshot().activity[0]; assert.equal(deleted.name, input.name);
  assert.notEqual(deleted.id, failed.id); assert.equal(manager.snapshot().activity.length, 3);
});

test('activity remains bounded during a burst without evicting pending work', async t => {
  const { manager, driver } = fixture(t), ids = [randomUUID(), randomUUID()];
  for (const id of ids) await manager.create({ id, name: 'Workspace ' + id });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), original = driver.stop.bind(driver);
  driver.stop = async id => { await gate; await original(id); };
  const stopped = manager.action(ids[0], 'stop');
  const pending = manager.snapshot().activity[0];
  for (let i = 0; i < 110; i++) manager.link(ids[1], null, null);
  const snapshot = manager.snapshot();
  assert.equal(snapshot.activity.length, 100); assert.equal(snapshot.activityHistory.evicted, 13);
  assert(snapshot.activity.some(e => e.id === pending.id && e.outcome === 'running'));
  assert.equal(new Set(snapshot.activity.map(e => e.id)).size, 100);
  release(); await stopped;
  assert(manager.snapshot().activity.some(e => e.id === pending.id && e.outcome === 'completed'));
});


function savedLogin(): DesktopCredentialFile[] {
  const now = Math.floor(Date.now() / 1000);
  const access = 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ iat: now - 10, exp: now + 3600, 'https://api.openai.com/auth': { chatgpt_account_id: 'fixture-account' } })).toString('base64url') + '.PRIVATE_SIGNATURE';
  return [{ source: 'codex', modifiedAt: Date.now(), data: { tokens: { access_token: access, refresh_token: 'PRIVATE_REFRESH', account_id: 'fixture-account' } } }];
}

test('terminal credential sync preserves display access, fences link mutations, coalesces and reports safe outcomes', async t => {
  let release!: () => void, writes = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const { manager, driver } = fixture(t, async (_shard, _credential, current) => { writes++; await gate; assert(await current()); return { outcome: 'updated' }; });
  const id = randomUUID(); await manager.create({ id, name: 'Repair', relayId: 'fixture-shard' }); driver.credentialFiles = savedLogin();
  const sync = manager.syncCredential(id, 'fixture-shard'); assert.equal(manager.syncCredential(id, 'fixture-shard'), sync);
  assert.throws(() => manager.link(id, null, 'fixture-shard'), /finish/);
  assert.throws(() => manager.action(id, 'stop'), /sign-in check/);
  assert(manager.snapshot().desktops[0].canConnect); await manager.connection(id);
  release(); await sync; assert.equal(writes, 1);
  assert.equal(manager.snapshot().desktops[0].credentialSync.state, 'updated');
  assert(manager.snapshot().activity.some(e => e.action === 'refreshing_credentials' && e.outcome === 'completed'));
  assert(!/PRIVATE_|accessToken|refreshToken|fingerprint/.test(JSON.stringify(manager.snapshot())));
  await manager.pollCredentialSync(); assert.equal(writes, 1);
  manager.configureCredentialSync(id, 'fixture-shard', false); assert.equal(manager.snapshot().desktops[0].credentialSync.enabled, false);
});

test('automatic credential checks visit every workspace with bounded concurrency and stop cleanly', async t => {
  let calls = 0, active = 0, maximum = 0;
  const { manager, driver } = fixture(t, async () => { calls++; active++; maximum = Math.max(maximum, active); await new Promise(r => setTimeout(r, 10)); active--; return { outcome: 'updated' }; });
  for (let i = 0; i < 3; i++) await manager.create({ id: randomUUID(), name: 'Repair ' + i, relayId: 'fixture-' + i });
  driver.credentialFiles = savedLogin(); await Promise.all([manager.pollCredentialSync(), manager.pollCredentialSync()]);
  assert.equal(calls, 3); assert.equal(maximum, 2); assert.equal(manager.snapshot().activeOperations, 0);
  await manager.settle(); await manager.pollCredentialSync(); assert.equal(calls, 3);
});

test('credential checks require desktop administration, exact origin and linked target; HTTP cannot submit tokens', async t => {
  let writes = 0;
  const { manager, driver, base, login } = await httpFixture(t, true, async () => { writes++; return { outcome: 'updated' }; });
  const id = randomUUID(); await manager.create({ id, name: 'Repair', relayId: 'fixture-shard' }); driver.credentialFiles = savedLogin();
  const url = base + '/api/desktops/' + id + '/credential-sync', cookie = await login(), monitor = await login('monitor');
  const post = (body: object, headers: Record<string, string>) => fetch(url, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  for (const headers of [{}, { Authorization: 'Bearer ordinary-user' }, { cookie: monitor }]) assert.equal((await post({ shardId: 'fixture-shard' }, headers)).status, 401);
  assert.equal((await post({ shardId: 'fixture-shard' }, { cookie, Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ shardId: 'other' }, { cookie })).status, 409);
  assert.equal((await post({ shardId: 'fixture-shard', accessToken: 'PRIVATE_INJECTED' }, { cookie })).status, 400);
  assert.equal(writes, 0);
  assert.equal((await post({ shardId: 'fixture-shard' }, { cookie })).status, 200); assert.equal(writes, 1);
  const raw = await (await fetch(base + '/api/desktops/state', { headers: { cookie } })).text(); assert(!raw.includes('PRIVATE_'));
  assert.equal((await post({ shardId: 'fixture-shard', enabled: false }, { cookie })).status, 200);
  assert.equal(manager.snapshot().desktops[0].credentialSync.enabled, false);
});

test('repairing a partial login rechecks a previously successful file and only reports the matching loaded credential', async t => {
  let checks = 0;
  const { manager, driver } = fixture(t, async () => { checks++; return { outcome: 'current' }; });
  const id = randomUUID(); await manager.create({ id, name: 'Repair', relayId: 'fixture-shard' });
  const saved = savedLogin(); driver.credentialFiles = saved;
  await manager.syncCredential(id, 'fixture-shard', false);
  assert.equal(manager.snapshot(() => false).desktops[0].credentialSync.applied, false);
  let revision = '';
  assert.equal(manager.snapshot((shard, value) => { assert.equal(shard, 'fixture-shard'); revision = value; return true; }).desktops[0].credentialSync.applied, true);
  assert.match(revision, /^[a-f0-9]{64}$/); assert(!JSON.stringify(manager.snapshot()).includes(revision));
  driver.credentialFiles = [{ source: 'codex', modifiedAt: Date.now(), data: null }];
  await manager.syncCredential(id, 'fixture-shard', false); assert.equal(manager.snapshot().desktops[0].credentialSync.state, 'error');
  driver.credentialFiles = saved; await manager.syncCredential(id, 'fixture-shard', false);
  assert.equal(checks, 2); assert.equal(manager.snapshot().desktops[0].credentialSync.state, 'current');
  manager.link(id, 'other-shard', 'fixture-shard'); assert.equal(manager.snapshot(() => true).desktops[0].credentialSync.applied, false);
});

test('opening sign-in preserves the display, excludes overlapping mutations and settles before shutdown', async t => {
  const { manager, driver } = fixture(t, async () => ({ outcome: 'current' })), id = randomUUID(); await manager.create({ id, name: 'Repair', relayId: 'fixture-shard' });
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { entered = resolve; });
  driver.launch = async (_id, app) => { assert.equal(app, 'signin'); entered(); await gate; };
  const login = manager.signIn(id, 'fixture-shard'); await started;
  assert.equal(manager.snapshot().desktops[0].credentialSync.operation, 'signin');
  assert.throws(() => manager.syncCredential(id, 'fixture-shard'), /Sign-in is opening/);
  assert(manager.snapshot().desktops[0].canConnect);
  assert.throws(() => manager.signIn(id, 'fixture-shard'), /finish/);
  assert.throws(() => manager.action(id, 'stop'), /sign-in check/);
  let settled = false; const close = manager.settle().then(() => { settled = true; });
  await new Promise(r => setImmediate(r)); assert(!settled);
  assert.throws(() => manager.create({ id: randomUUID(), name: 'Too late' }), /restarting/);
  assert.throws(() => manager.configureCredentialSync(id, 'fixture-shard', false), /restarting/);
  release(); await login; await close;
  assert(manager.snapshot().activity.some(e => e.action === 'opening_signin' && e.outcome === 'completed'));
});

test('concurrent inventory checks share one read; foreground input coalesces while lifecycle changes are fenced', async t => {
  const { manager, driver } = fixture(t), id = randomUUID(); await manager.create({ id, name: 'Input' });
  let release!: () => void, reads = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  driver.list = async () => { reads++; await gate; return [...driver.items.values()]; };
  const pending = Array.from({ length: 30 }, () => manager.refresh(true));
  release(); await Promise.all(pending); assert.equal(reads, 1);
  let inputRelease!: () => void, entered!: () => void;
  const inputGate = new Promise<void>(resolve => { inputRelease = resolve; }), started = new Promise<void>(resolve => { entered = resolve; });
  driver.launch = async (_id, app) => { if (app === 'terminal') { entered(); await inputGate; } };
  const launch = manager.launch(id, 'terminal'); assert.equal(manager.launch(id, 'terminal'), launch); await started;
  assert(manager.snapshot().desktops[0].ioBusy); assert(manager.snapshot().desktops[0].canConnect);
  await manager.launch(id, 'chrome'); await manager.clipboard(id, 'PRIVATE_CLIPBOARD');
  assert.deepEqual(manager.snapshot().desktops[0].busyApps, ['terminal']);
  assert.throws(() => manager.action(id, 'stop'), /input operation/);
  let settled = false; const close = manager.settle().then(() => { settled = true; });
  await new Promise(r => setImmediate(r)); assert(!settled);
  inputRelease(); await launch; await close; assert.equal(manager.snapshot().activeIOOperations, 0);
  assert(!JSON.stringify(manager.snapshot()).includes('PRIVATE_CLIPBOARD'));
});

test('saved credential checkpoints survive restart, recheck authority quietly and report a superseded login', async t => {
  const f = fixture(t); let now = Date.now(), checks = 0, superseded = false;
  const refresh: RefreshDesktopCredential = async (_id, _candidate, _current, checkOnly) => {
    checks++; assert.equal(checkOnly, checks > 1);
    if (superseded) throw new DesktopCredentialError('credential_superseded');
    return { outcome: checks === 1 ? 'updated' : 'current' };
  };
  const manager = new DesktopManager(f.file, f.driver, () => now, refresh), id = randomUUID();
  await manager.create({ id, name: 'Checkpoint', relayId: 'fixture-shard' }); f.driver.credentialFiles = savedLogin();
  await manager.syncCredential(id, 'fixture-shard', false); const events = manager.snapshot().activity.length;
  await manager.syncCredential(id, 'fixture-shard', false); assert.equal(checks, 1);
  now += 60001; await manager.syncCredential(id, 'fixture-shard', false); assert.equal(checks, 2); assert.equal(manager.snapshot().activity.length, events);
  const record = JSON.parse(fs.readFileSync(f.file, 'utf8'))[0]; assert.match(record.syncedFingerprint, /^[a-f0-9]{64}$/);
  assert(!JSON.stringify(manager.snapshot()).includes(record.syncedFingerprint)); assert(!fs.readFileSync(f.file, 'utf8').includes('PRIVATE_'));
  const restored = new DesktopManager(f.file, f.driver, () => now, refresh); await restored.refresh(true);
  superseded = true; await restored.syncCredential(id, 'fixture-shard', false);
  assert.equal(restored.snapshot().desktops[0].credentialSync.code, 'credential_superseded'); assert(restored.snapshot().desktops[0].canConnect);
  await restored.syncCredential(id, 'fixture-shard', false); assert.equal(checks, 3);
});

test('credentials changed during validation are re-read before the commit guard succeeds', async t => {
  let release!: () => void, entered!: () => void, writes = 0;
  const gate = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { entered = resolve; });
  const { manager, driver } = fixture(t, async (_id, _candidate, current) => { entered(); await gate; if (!await current()) throw new DesktopCredentialError('credential_conflict'); writes++; return { outcome: 'updated' }; });
  const id = randomUUID(); await manager.create({ id, name: 'Guard', relayId: 'fixture-shard' }); driver.credentialFiles = savedLogin();
  const checking = manager.syncCredential(id, 'fixture-shard'); await started;
  driver.credentialFiles = [{ source: 'codex', modifiedAt: Date.now(), data: null }]; release(); await checking;
  assert.equal(writes, 0); assert.equal(manager.snapshot().desktops[0].credentialSync.code, 'credential_conflict');
});

test('provider outages back off within a bound and saved-file repair still retries', async t => {
  const f = fixture(t); let now = Date.now(), calls = 0;
  const manager = new DesktopManager(f.file, f.driver, () => now, async () => { calls++; throw new DesktopCredentialError('credential_check_unavailable'); });
  const id = randomUUID(); await manager.create({ id, name: 'Backoff', relayId: 'fixture-shard' }); f.driver.credentialFiles = savedLogin();
  await manager.syncCredential(id, 'fixture-shard', false);
  const first = manager.snapshot().desktops[0].credentialSync.retryAt!; assert(first >= now + 24000 && first <= now + 36000);
  await manager.syncCredential(id, 'fixture-shard', false); assert.equal(calls, 1);
  now = first + 1; await manager.syncCredential(id, 'fixture-shard', false);
  const second = manager.snapshot().desktops[0].credentialSync.retryAt!; assert(second >= now + 48000 && second <= now + 72000);
  await manager.syncCredential(id, 'fixture-shard', true); assert.equal(calls, 3);
});

test('foreground input has a global bound while independent apps and displays remain usable', async t => {
  const { manager, driver } = fixture(t), a = randomUUID(), b = randomUUID();
  await manager.create({ id: a, name: 'First' }); await manager.create({ id: b, name: 'Second' });
  let release!: () => void, entered = 0; const gate = new Promise<void>(resolve => { release = resolve; });
  driver.launch = async () => { entered++; await gate; };
  driver.clipboard = async () => { entered++; await gate; return 'PRIVATE_CLIPBOARD_CANARY'; };
  const terminal = manager.launch(a, 'terminal');
  const jobs = [terminal, manager.launch(a, 'chrome'), manager.clipboard(a), manager.launch(b, 'terminal')];
  assert.equal(manager.launch(a, 'terminal'), terminal);
  assert.throws(() => manager.launch(b, 'chrome'), /busy/);
  assert.throws(() => manager.clipboard(a, 'PRIVATE_WRITE'), /input operation/);
  await new Promise(r => setImmediate(r)); assert.equal(entered, 4); assert.equal(manager.snapshot().activeIOOperations, 4);
  await manager.connection(a); assert(manager.snapshot().desktops[0].canConnect);
  assert(!/PRIVATE_|clipboard-|launch-/.test(JSON.stringify(manager.snapshot())));
  release(); await Promise.all(jobs); assert.equal(manager.snapshot().activeIOOperations, 0);
});

test('sign-in launch requires desktop authority and a fixed linked target, never submitted commands', async t => {
  const { manager, driver, base, login } = await httpFixture(t, true, async () => ({ outcome: 'current' })), id = randomUUID();
  await manager.create({ id, name: 'Repair', relayId: 'fixture-shard' });
  const cookie = await login(), monitor = await login('monitor');
  const renewalPage = await fetch(base + '/desktops?connect=1', { headers: { cookie } });
  assert.equal(renewalPage.status, 200); assert((await renewalPage.text()).includes('/desktops/assets/login.js'));
  const post = (body: object, headers: Record<string, string>) => fetch(base + '/api/desktops/' + id + '/signin', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  for (const headers of [{}, { Authorization: 'Bearer ordinary-user' }, { cookie: monitor }]) assert.equal((await post({ shardId: 'fixture-shard' }, headers)).status, 401);
  assert.equal((await post({ shardId: 'fixture-shard' }, { cookie, Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ shardId: 'other' }, { cookie })).status, 409);
  assert.equal((await post({ shardId: 'fixture-shard', command: 'PRIVATE_COMMAND' }, { cookie })).status, 400);
  assert.equal(driver.calls.filter(c => c.startsWith('signin:')).length, 0);
  const response = await post({ shardId: 'fixture-shard' }, { cookie }); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { opened: true });
  assert.equal(driver.calls.filter(c => c.startsWith('signin:')).length, 1);
});
