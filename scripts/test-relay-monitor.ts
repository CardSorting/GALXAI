import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IncomingMessage } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MonitorSessions } from '../src/relay/monitor-sessions.js';
import { openRelayMonitor } from '../src/core/relay/open-monitor.js';
import { RelayFederationLifecycle } from '../src/relay/federation-lifecycle.js';
import { RelayFederationServer } from '../src/relay/federation-server.js';

const request = (headers: Record<string, string> = {}, remoteAddress = '127.0.0.1') => ({
  headers: { host: '127.0.0.1:3301', origin: 'http://127.0.0.1:3301', ...headers }, socket: { remoteAddress, localPort: 3301 },
}) as IncomingMessage;

test('monitor links are single-use, expire, bind to their origin, and produce revocable bounded sessions', () => {
  let now = 100000;
  const sessions = new MonitorSessions(() => now), req = request();
  let ticket = sessions.issue(req).ticket;
  assert.throws(() => sessions.exchange(request({ host: 'localhost:3301', origin: 'http://localhost:3301' }), ticket));
  now += 60001; assert.throws(() => sessions.exchange(req, ticket));
  ticket = sessions.issue(req).ticket;
  const cookie = sessions.exchange(req, ticket).split(';')[0];
  assert(sessions.authorized(request({ cookie })));
  assert(!sessions.authorized(request({ cookie, host: 'localhost:3301', origin: 'http://localhost:3301' })));
  assert(!sessions.authorized(request({ cookie: cookie + '; ' + cookie })));
  assert.throws(() => sessions.exchange(req, ticket));
  assert.throws(() => sessions.exchange(request({ origin: 'https://evil.example' }), sessions.issue(req).ticket));
  for (const headers of [{ host: 'evil.example' }, { 'x-forwarded-host': '127.0.0.1:3301' }, { 'x-forwarded-for': '127.0.0.1' },
    { forwarded: 'for=127.0.0.1' }, { 'cf-connecting-ip': '203.0.113.1' }, { 'sec-fetch-site': 'cross-site' }, { host: '127.0.0.1:9999' }]) {
    assert.throws(() => sessions.issue(request(headers)));
    assert(!sessions.authorized(request({ cookie, ...headers })));
  }
  assert.throws(() => sessions.issue(request({}, '192.0.2.1')));
  assert.match(sessions.revoke(request({ cookie })), /Max-Age=0/);
  assert(!sessions.authorized(request({ cookie })));
  const newer = sessions.exchange(req, sessions.issue(req).ticket).split(';')[0];
  now += 12 * 60 * 60 * 1000; assert(!sessions.authorized(request({ cookie: newer })));
  const bounded = new MonitorSessions(() => now);
  for (let i = 0; i < 32; i++) bounded.issue(req);
  assert.throws(() => bounded.issue(req), /pending/);
});

test('browser session renewal replaces its own grant, remains bounded and cannot replay the old cookie', () => {
  for (const purpose of ['monitor', 'desktop'] as const) {
    const sessions = new MonitorSessions(() => 100000, purpose), req = request();
    let cookie = '';
    for (let i = 0; i < 50; i++) {
      const old = cookie;
      cookie = sessions.exchange(request({ cookie }), sessions.issue(req).ticket).split(';')[0];
      assert(sessions.authorized(request({ cookie })));
      if (old) assert(!sessions.authorized(request({ cookie: old })));
    }
    for (let i = 0; i < 31; i++) sessions.exchange(req, sessions.issue(req).ticket);
    const ticket = sessions.issue(req).ticket;
    assert.throws(() => sessions.exchange(req, ticket), /Sign out/);
    const old = cookie; cookie = sessions.exchange(request({ cookie }), ticket).split(';')[0];
    assert(sessions.authorized(request({ cookie }))); assert(!sessions.authorized(request({ cookie: old })));
    assert.throws(() => sessions.exchange(request({ cookie }), ticket), /expired|already used/);
    const other = new MonitorSessions(() => 100000, purpose === 'desktop' ? 'monitor' : 'desktop');
    assert(!other.authorized(request({ cookie })));
  }
});

test('real HTTP monitor protects HTML and diagnostics while a local admin delegates read-only access', async () => {
  const lifecycle = new RelayFederationLifecycle(async () => [], { list: async () => [], start: async () => { throw Error('no start'); }, inspect: async () => ({}), remove: async () => {} });
  await lifecycle.reconcile();
  lifecycle.capabilities.register('PRIVATE_SHARD_CANARY', 'PRIVATE_RELAY_CANARY', 'generation', 'openai');
  const server = new RelayFederationServer(lifecycle, { secret: 's'.repeat(32), apiKeys: ['client'], adminKeys: ['PRIVATE_ADMIN_CANARY'], port: 0, egressSnapshot: () => ({ private: true }) });
  try {
    await server.start();
    const base = 'http://127.0.0.1:' + (server.server.address() as any).port;
    const mint = (key = 'PRIVATE_ADMIN_CANARY', headers = {}) => fetch(base + '/api/monitor/access', { method: 'POST', headers: { Authorization: 'Bearer ' + key, ...headers } });
    for (const route of ['/federation', '/', '/monitor', '/dashboard', '/monitor-login.js']) {
      const response = await fetch(base + route); assert.equal(response.status, 200);
      const body = await response.text(); assert(!/PRIVATE_|shard|topology|activeStreams/.test(body));
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    }
    assert.equal((await fetch(base + '/federation.js')).status, 401);
    assert.equal((await fetch(base + '/api/monitor/capabilities')).status, 401);
    assert.equal((await fetch(base + '/api/monitor/state')).status, 401);
    assert.equal((await fetch(base + '/api/telemetry', { headers: { Authorization: 'Bearer client' } })).status, 401);
    assert.equal((await mint('client')).status, 401);
    assert.equal((await mint('')).status, 401);
    assert.equal((await mint(undefined, { 'x-forwarded-for': '127.0.0.1' })).status, 403);
    assert.equal((await mint(undefined, { Origin: 'https://evil.example' })).status, 403);
    const issued = await mint(); assert.equal(issued.status, 200);
    const { ticket } = await issued.json();
    assert.equal((await fetch(base + '/api/monitor/capabilities?ticket=' + ticket)).status, 401);
    const exchange = () => fetch(base + '/api/monitor/session', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket }) });
    const login = await exchange(); assert.equal(login.status, 200);
    assert.deepEqual(await login.json(), { connected: true });
    const setCookie = login.headers.get('set-cookie')!; assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/); assert.match(setCookie, /Max-Age=43200/);
    const cookie = setCookie.split(';')[0];
    const renewalPage = await fetch(base + '/federation?connect=1', { headers: { cookie } });
    assert.equal(renewalPage.status, 200); assert((await renewalPage.text()).includes('/monitor-login.js'));
    assert.equal((await exchange()).status, 401);
    const data = await fetch(base + '/api/monitor/capabilities', { headers: { cookie } });
    assert.equal(data.status, 200); const raw = await data.text(); assert(raw.includes('PRIVATE_SHARD_CANARY')); assert(!raw.includes('PRIVATE_ADMIN_CANARY'));
    const state = await fetch(base + '/api/monitor/state', { headers: { cookie } });
    assert.equal(state.status, 200); assert.equal(state.headers.get('cache-control'), 'no-store');
    const telemetry = await state.json(); assert(telemetry.activity.events.some((e: any) => e.code === 'controller_started'));
    assert(!JSON.stringify(telemetry).includes('PRIVATE_ADMIN_CANARY'));
    assert.equal((await fetch(base + '/api/monitor/state', { headers: { cookie, 'x-forwarded-for': '127.0.0.1' } })).status, 403);
    assert.equal((await fetch(base + '/api/monitor/state', { method: 'POST', headers: { cookie } })).status, 404);
    const refused = await fetch(base + '/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer client', 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'unavailable-model', messages: [{ role: 'user', content: 'PROMPT_PRIVATE_CANARY' }] }) });
    assert.equal(refused.status, 503);
    const updated = await (await fetch(base + '/api/monitor/state', { headers: { cookie } })).json();
    assert(updated.activity.events.some((e: any) => e.code === 'model_temporarily_unavailable' && e.httpStatus === 503));
    assert(!JSON.stringify(updated).includes('PROMPT_PRIVATE_CANARY'));
    for (const route of ['/federation', '/federation.js']) {
      const response = await fetch(base + route, { headers: { cookie } }); assert.equal(response.status, 200);
      const body = await response.text(); assert(!body.includes('PRIVATE_ADMIN_CANARY')); assert(!body.includes(ticket)); assert(!body.includes('type="password"'));
    }
    for (const route of ['/api/capabilities', '/api/telemetry', '/api/egress', '/health/ready', '/v1/models']) assert.equal((await fetch(base + route, { headers: { cookie } })).status, 401);
    assert.equal((await fetch(base + '/v1/chat/completions', { method: 'POST', headers: { cookie } })).status, 401);
    assert.equal((await fetch(base + '/api/monitor/access', { method: 'POST', headers: { cookie } })).status, 401);
    assert.equal((await fetch(base + '/api/monitor/capabilities', { method: 'POST', headers: { cookie } })).status, 404);
    assert.equal((await fetch(base + '/api/monitor/capabilities', { headers: { cookie, 'x-forwarded-host': 'localhost' } })).status, 403);
    assert.equal((await fetch(base + '/api/monitor/session', { method: 'DELETE', headers: { cookie, Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(base + '/api/monitor/session', { method: 'DELETE', headers: { cookie, Origin: base } })).status, 200);
    assert.equal((await fetch(base + '/api/monitor/capabilities', { headers: { cookie } })).status, 401);
    const forged = cookie.replace(/=.+/, '=' + 'a'.repeat(64));
    assert.equal((await fetch(base + '/api/monitor/capabilities', { headers: { cookie: forged } })).status, 401);
  } finally { await server.stop(); await lifecycle.stop(); }
});

test('browser launcher reads local configuration without logging or handing the browser an administrator key', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'monitor-open-'));
  const previous = process.env.RELAY_ADMIN_API_KEYS; delete process.env.RELAY_ADMIN_API_KEYS;
  const logs: string[] = []; t.mock.method(console, 'log', (message: string) => logs.push(message));
  const ticket = 'a'.repeat(64); let opened = '', called = 0;
  try {
    fs.writeFileSync(path.join(directory, '.env.local'), 'RELAY_ADMIN_API_KEYS="PRIVATE_ADMIN_CANARY,other"\n', { mode: 0o600 });
    const transport = (async (url: string, init: RequestInit) => {
      called++; assert.equal(url, 'http://127.0.0.1:3301/api/monitor/access');
      assert.equal((init.headers as any).Authorization, 'Bearer PRIVATE_ADMIN_CANARY'); assert.equal(init.redirect, 'error');
      return Response.json({ ticket, expiresInSeconds: 60 });
    }) as typeof fetch;
    await openRelayMonitor(3301, { directory, transport, open: async url => { opened = url; } });
    assert.equal(opened, 'http://127.0.0.1:3301/federation?connect=1#login=' + ticket); assert.equal(called, 1);
    assert(!logs.join('').includes('PRIVATE_ADMIN_CANARY')); assert(!logs.join('').includes(ticket));
    await assert.rejects(openRelayMonitor(3301, { directory, transport, open: async () => { throw Error('sensitive ' + ticket); } }), error => !(error as Error).message.includes(ticket));
    await assert.rejects(openRelayMonitor(3301, { directory, transport: (async () => { throw Error('PRIVATE_ADMIN_CANARY'); }) as typeof fetch }), error => !(error as Error).message.includes('PRIVATE_ADMIN_CANARY'));
    await assert.rejects(openRelayMonitor(0, { directory }), /Invalid monitor port/);
  } finally { if (previous !== undefined) process.env.RELAY_ADMIN_API_KEYS = previous; fs.rmSync(directory, { recursive: true, force: true }); }
});
