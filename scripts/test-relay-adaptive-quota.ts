import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';
import { classifyUpstreamError, cooldownDeadline, retryDeadline } from '../src/relay/quota-policy.js';

function fixture(count = 4, extra: Record<string, unknown> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-quota-'));
  const credentials = Array.from({ length: count }, (_, i) => ({ id: `shard_${i}`, accountId: `account-${i}`, accessToken: `test-secret-${i}` }));
  const relay = new GalxaiRelayServer({ port: 0, host: '127.0.0.1', registryEnabled: false,
    discoverHostCredentials: false, shardsJsonPath: path.join(dir, 'absent.json'),
    stateSnapshotPath: path.join(dir, 'snapshot.json'), retryBaseDelayMs: 1, retryMaxDelayMs: 2,
    drainTimeoutMs: 20, ...extra });
  const internals = relay as any;
  internals.installFleet(credentials);
  return { relay, internals, credentials, dir, cleanup: async () => {
    for (const session of internals.sessions.values()) {
      session.abortController.abort();
      for (const [key, value] of Object.entries(session)) if (/Timer$/.test(key)) clearTimeout(value as NodeJS.Timeout);
      internals.safeCloseSocket(session.upstreamWs);
    }
    await relay.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  } };
}

async function until(predicate: () => boolean, timeout = 2000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) throw new Error('Timed out waiting for relay state');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

function baseUrl(f: ReturnType<typeof fixture>) { return `http://127.0.0.1:${f.internals.server.address().port}`; }
async function submit(f: ReturnType<typeof fixture>, prompt = 'test') {
  return fetch(`${baseUrl(f)}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'test-model', messages: [{ role: 'user', content: prompt }] }) });
}

test('uncapped default routes 1,200 calls fairly across all four unique accounts', async () => {
  const f = fixture();
  try {
    f.internals.installFleet([...f.credentials, { ...f.credentials[0], id: 'duplicate-row' }]);
    assert.equal(f.internals.shardsTable.count(), 4);
    const counts = new Map<string, number>();
    for (let i = 0; i < 1200; i++) {
      const shard = f.internals.acquireHealthyShard();
      assert.ok(shard);
      counts.set(shard.id, (counts.get(shard.id) || 0) + 1);
      f.internals.releaseShard(shard.id);
    }
    assert.deepEqual([...counts.values()], [300, 300, 300, 300]);
    assert.equal(f.internals.shardStats(f.internals.shardsTable.get('shard_0')).slidingWindowCap, null);
    assert.equal(f.internals.getRateLimitHeaders()['X-RateLimit-Limit'], undefined);
  } finally { await f.cleanup(); }
});

test('exhausted pool cannot be forced open, and recovery admits one probe', async () => {
  const f = fixture(1);
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  try {
    f.internals.acquireHealthyShard();
    f.internals.recordQuotaFailure('shard_0', now + 120_000);
    for (let i = 0; i < 100; i++) assert.equal(f.internals.acquireHealthyShard(), null);
    assert.equal(f.internals.fleetRetryAfter(), 120);
    now += 120_001;
    assert.ok(f.internals.acquireHealthyShard());
    assert.equal(f.internals.acquireHealthyShard(), null);
    f.internals.recordQuotaFailure('shard_0');
    assert.equal(f.internals.fleetRetryAfter(), 120);
    now += 120_001;
    assert.ok(f.internals.acquireHealthyShard());
    f.internals.releaseShard('shard_0', true);
    assert.equal(f.internals.shardsTable.get('shard_0').quotaFailures, 0);
  } finally { Date.now = realNow; await f.cleanup(); }
});

test('sync preserves cooldown and in-flight state, prefers fresh credentials, and snapshots contain no credentials', async () => {
  const f = fixture(1);
  try {
    f.internals.acquireHealthyShard();
    f.internals.recordQuotaFailure('shard_0', Date.now() + 180_000, false);
    f.internals.installFleet([{ ...f.credentials[0], id: 'new-registry-row', accessToken: 'rotated-test-secret', expiresAtMs: Date.now() + 600_000 }, ...f.credentials]);
    const shard = f.internals.shardsTable.get('shard_0');
    assert.equal(shard.accessToken, 'rotated-test-secret');
    assert.equal(shard.inFlight, 1);
    assert.equal(f.internals.acquireHealthyShard(), null);
    f.internals.saveStateSnapshot();
    const snapshot = fs.readFileSync(path.join(f.dir, 'snapshot.json'), 'utf8');
    assert.ok(!snapshot.includes('rotated-test-secret'));
    assert.ok(!snapshot.includes('account-0'));
    assert.ok(!snapshot.includes('accessToken'));
    f.internals.releaseShard('shard_0');
    assert.equal(f.internals.shardsTable.get('shard_0').inFlight, 0);
  } finally { await f.cleanup(); }
});

test('explicit local limits, concurrent slots, excluded attempts, and reported request balance are honored', async () => {
  const f = fixture(1, { quotaWindowMaxCalls: 2, shardConcurrency: 1 });
  try {
    assert.equal(f.internals.acquireHealthyShard(new Set(['shard_0'])), null);
    assert.ok(f.internals.acquireHealthyShard());
    assert.equal(f.internals.acquireHealthyShard(), null);
    f.internals.releaseShard('shard_0');
    assert.ok(f.internals.acquireHealthyShard());
    f.internals.releaseShard('shard_0');
    assert.equal(f.internals.acquireHealthyShard(), null);
    f.internals.currentQuotaProfile.maxCalls = 0;
    const shard = f.internals.shardsTable.get('shard_0');
    f.internals.shardsTable.put(shard.id, { ...shard, providerLimits: [{ name: 'requests', remaining: 1, limit: 80, resetAtMs: Date.now() + 60_000 }] });
    assert.ok(f.internals.acquireHealthyShard());
    f.internals.releaseShard('shard_0');
    assert.equal(f.internals.acquireHealthyShard(), null);
  } finally { await f.cleanup(); }
});

test('nested provider errors and retry dates preserve long reset deadlines', () => {
  const now = 1_800_000_000_000;
  const error = classifyUpstreamError({ type: 'response.failed', response: { error: { code: 'usage_limit_reached', resets_at: now / 1000 + 86400 } } }, now);
  assert.equal(error.quota, true);
  assert.equal(error.deadline, now + 86400_000);
  assert.equal(cooldownDeadline(50, now, error.deadline), error.deadline);
  assert.equal(retryDeadline(new Date(now + 60_000).toUTCString(), now), now + 60_000);
  assert.equal(classifyUpstreamError({ status: 401 }).unauthorized, true);
});

test('real WebSocket handshake sends credentials and bounded failover visits each account once', async () => {
  const seen: string[] = [];
  const upstream = http.createServer();
  const wss = new WebSocketServer({ server: upstream });
  wss.on('connection', (socket, req) => {
    assert.match(String(req.headers.authorization), /^Bearer test-secret-/);
    const account = String(req.headers['chatgpt-account-id']);
    seen.push(account);
    socket.on('message', () => socket.send(JSON.stringify({ type: 'error', error: { code: 'usage_limit_reached', retry_after_seconds: 180 } })));
  });
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const port = (upstream.address() as any).port;
  const f = fixture(4, { wsEndpoint: `ws://127.0.0.1:${port}`, maxUpstreamRetries: 8 });
  try {
    await f.relay.start();
    const response = await submit(f);
    assert.equal(response.status, 202);
    const { id } = await response.json();
    await until(() => f.internals.jobsTable.get(id)?.status === 'failed');
    assert.equal(seen.length, 4);
    assert.equal(new Set(seen).size, 4);
    assert.ok(f.internals.shardsTable.getAll().every((s: any) => s.inFlight === 0));
    const denied = await submit(f, 'second request');
    assert.equal(denied.status, 503);
    assert.ok(Number(denied.headers.get('retry-after')) >= 179);
    assert.equal(seen.length, 4);
    const reset = await fetch(`${baseUrl(f)}/api/quota/reset`, { method: 'POST', body: '{}' });
    assert.equal(reset.status, 200);
    assert.equal((await submit(f, 'after local reset')).status, 503);
    assert.equal(seen.length, 4);
  } finally {
    await f.cleanup();
    for (const socket of wss.clients) socket.terminate();
    await new Promise<void>(resolve => wss.close(() => resolve()));
    await new Promise<void>(resolve => upstream.close(() => resolve()));
  }
});

test('HTTP handshake 429 is cooled down and management APIs require configured auth', async () => {
  let connections = 0;
  const upstream = http.createServer();
  upstream.on('upgrade', (_req, socket) => {
    connections++;
    socket.end('HTTP/1.1 429 Too Many Requests\r\nRetry-After: 600\r\nContent-Length: 0\r\n\r\n');
  });
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const f = fixture(1, { wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}` });
  try {
    await f.relay.start();
    const response = await submit(f);
    const { id } = await response.json();
    await until(() => f.internals.jobsTable.get(id)?.status === 'failed');
    assert.equal(connections, 1);
    assert.ok(f.internals.fleetRetryAfter() >= 599);
    f.internals.config.apiKeys = ['test-management-key'];
    assert.equal((await fetch(`${baseUrl(f)}/api/shards/sync`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`${baseUrl(f)}/api/quota/profile`, { method: 'POST', body: '{"mode":"adaptive"}' })).status, 401);
  } finally { await f.cleanup(); await new Promise<void>(resolve => upstream.close(() => resolve())); }
});

test('successful streams replay real output and image requests fail over on quota exhaustion', async () => {
  const upstream = http.createServer();
  const wss = new WebSocketServer({ server: upstream });
  const accounts: string[] = [];
  wss.on('connection', (socket, req) => {
    socket.on('message', raw => {
      const message = JSON.parse(raw.toString());
      const image = JSON.stringify(message).includes('image_generation');
      const account = String(req.headers['chatgpt-account-id']);
      if (image) {
        assert.equal(message.stream, true, 'Image synthesis must use streaming upstream execution');
        accounts.push(account);
        if (accounts.length === 1) {
          socket.send(JSON.stringify({ type: 'response.failed', response: { error: { code: 'usage_limit_reached', retry_after_seconds: 90 } } }));
        } else {
          socket.send(JSON.stringify({ type: 'response.output_item.done', item: { type: 'image_generation_call', result: 'dGVzdA==' } }));
          socket.send(JSON.stringify({ type: 'response.completed' }));
        }
      } else {
        socket.send(JSON.stringify({ type: 'response.output_text.delta', delta: 'OK' }));
        socket.send(JSON.stringify({ type: 'response.completed' }));
      }
    });
  });
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const f = fixture(2, { wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}` });
  try {
    await f.relay.start();
    const chat = await submit(f);
    const job = await chat.json();
    await until(() => f.internals.jobsTable.get(job.id)?.status === 'completed');
    const stream = await fetch(new URL(job.streamUrl, baseUrl(f)));
    const output = await stream.text();
    assert.match(output, /"content":"OK"/);
    assert.match(output, /\[DONE\]/);
    const image = await fetch(`${baseUrl(f)}/v1/images/generations`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Mock image' }) });
    assert.equal(image.status, 200);
    assert.equal((await image.json()).data[0].b64_json, 'dGVzdA==');
    assert.equal(accounts.length, 2);
    assert.equal(new Set(accounts).size, 2);
    assert.ok(f.internals.shardsTable.getAll().every((s: any) => s.inFlight === 0));
  } finally {
    await f.cleanup();
    for (const socket of wss.clients) socket.terminate();
    await new Promise<void>(resolve => wss.close(() => resolve()));
    await new Promise<void>(resolve => upstream.close(() => resolve()));
  }
});

test('JWT expiry overrides stale registry metadata and excludes the credential', async () => {
  const f = fixture(1);
  try {
    const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })).toString('base64url')}.signature`;
    f.internals.installFleet([{ ...f.credentials[0], accessToken: token, expiresAtMs: Date.now() + 3600000 }]);
    assert.equal(f.internals.acquireHealthyShard(), null);
    assert.equal(f.internals.shardStats(f.internals.shardsTable.get('shard_0')).availabilityReason, 'credential_expired');
  } finally { await f.cleanup(); }
});

test('credential rejection survives concurrent quota and transport failures and restart; rotation recovers', async () => {
  const f = fixture(1);
  try {
    f.internals.acquireHealthyShard();
    f.internals.recordShardFailure('shard_0', true);
    f.internals.recordQuotaFailure('shard_0');
    f.internals.recordShardFailure('shard_0');
    assert.equal(f.internals.acquireHealthyShard(), null);
    f.internals.saveStateSnapshot();
    const snapshot = fs.readFileSync(path.join(f.dir, 'snapshot.json'), 'utf8');
    assert.ok(!snapshot.includes(f.credentials[0].accessToken));
    f.internals.shardsTable.clear();
    f.internals.recoverStateSnapshot();
    f.internals.installFleet(f.credentials);
    assert.equal(f.internals.shardsTable.get('shard_0').status, 'disabled');
    f.internals.shardsTable.clear();
    f.internals.installFleet([{ ...f.credentials[0], accessToken: 'replacement-secret' }]);
    assert.notEqual(f.internals.shardsTable.get('shard_0').status, 'disabled');
  } finally { await f.cleanup(); }
});

test('session revocation takes precedence over incidental quota wording', () => {
  const result = classifyUpstreamError({ type: 'response.failed', response: { error: {
    code: 'session_revoked', message: 'Sign in again; quota cannot be checked',
  } } });
  assert.equal(result.unauthorized, true);
  assert.equal(result.quota, false);
});
