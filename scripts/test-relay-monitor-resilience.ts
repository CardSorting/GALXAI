import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CentralClient, hash } from '../src/relay/pool-protocol.js';
import { poolMonitor } from '../src/relay/pool-monitor-server.js';
import { DesktopManager } from '../src/relay/desktop-manager.js';
import { RequestError } from '../src/relay/request-policy.js';

async function listen(server: import('node:http').Server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
}

async function close(server: import('node:http').Server) {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
}

const identity = { pool: 'premium' as const, installationId: randomUUID() };

test('central status reads retry transient failures but credential mutations remain single-shot', async () => {
  let statusAttempts = 0;
  const client = new CentralClient('http://127.0.0.1:1', hash('monitor-status'), identity, (async url => {
    if (new URL(String(url)).pathname === '/operator/status') {
      statusAttempts++;
      if (statusAttempts < 3) return Response.json({ error: { code: 'busy' } }, { status: 503 });
      return Response.json({ pool: 'premium', accounts: [], registrations: [], activity: [] });
    }
    throw Error('mutation transport should not be retried');
  }) as typeof fetch);

  assert.equal((await client.call('/operator/status')).pool, 'premium');
  assert.equal(statusAttempts, 3);

  let mutationAttempts = 0;
  const mutationClient = new CentralClient('http://127.0.0.1:1', hash('monitor-mutation'), identity, (async () => {
    mutationAttempts++;
    throw Error('offline');
  }) as typeof fetch);
  await assert.rejects(mutationClient.call('/registrar/connect', { id: randomUUID(), ticket: 'a'.repeat(43), files: [] }));
  assert.equal(mutationAttempts, 1);
});

test('safe-read circuit opens after bounded failures and rejects a retry herd', async () => {
  let attempts = 0;
  const client = new CentralClient('http://127.0.0.1:1', hash('monitor-circuit'), identity, (async () => {
    attempts++;
    return Response.json({ error: { code: 'busy' } }, { status: 503 });
  }) as typeof fetch);

  await assert.rejects(client.call('/operator/status'));
  await assert.rejects(client.call('/operator/status'));
  await assert.rejects(client.call('/operator/status'));
  const beforeOpenCall = attempts;
  await assert.rejects(client.call('/operator/status'), error => error instanceof RequestError && error.code === 'control_unavailable');
  assert.equal(attempts, beforeOpenCall);
});

test('parallel safe reads spend a bounded retry budget instead of amplifying an outage', async () => {
  let attempts = 0;
  const client = new CentralClient('http://127.0.0.1:1', hash('monitor-budget'), identity, (async () => {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 5));
    return Response.json({ error: { code: 'busy' } }, { status: 503 });
  }) as typeof fetch);

  await Promise.all(Array.from({ length: 40 }, () => assert.rejects(client.call('/operator/status'))));
  assert.ok(attempts >= 40);
  assert.ok(attempts <= 60, `retry budget allowed ${attempts - 40} extra attempts`);
});

test('monitor coalesces duplicate connect clicks into one credential write', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'relay-monitor-resilience-'));
  const desktopId = randomUUID();
  const registrationId = randomUUID();
  const operatorToken = hash('operator-resilience');
  const viewerToken = hash('viewer-resilience');
  const registrarToken = hash('registrar-resilience');
  let statusCalls = 0;
  let ticketCalls = 0;
  let connectCalls = 0;
  let credentialReads = 0;
  const privateEpoch = randomUUID();
  const status = () => ({ pool: 'premium', installationId: identity.installationId, registrationAllowed: true, executionAllowed: true,
    lastSeenAt: new Date().toISOString(), epoch: privateEpoch, accounts: [{ id: 'codex_sh_fixture', desktopId, name: 'Fixture account', state: 'paused', revision: 1,
      acknowledgedRevision: 1, acknowledgedEpoch: privateEpoch, credentialRevision: 'PRIVATE_CREDENTIAL_REVISION', secret: 'PRIVATE_CREDENTIAL', models: ['fixture'] }],
    registrations: [{ id: registrationId, desktopId, name: 'Fixture account', state: 'reviewed', revision: 1, models: ['fixture'] }], activity: [] });
  const client = (token: string, role: 'operator' | 'viewer' | 'registrar') => new CentralClient('http://127.0.0.1:1', token, identity, (async (url, init) => {
    const route = new URL(String(url)).pathname;
    if (route === '/operator/status') { statusCalls++; await new Promise(resolve => setTimeout(resolve, 20)); return Response.json(status()); }
    if (route === '/operator/operation') return Response.json({ id: registrationId, desktopId, name: 'Fixture account', state: 'reviewed', revision: 1 });
    if (route === '/operator/ticket') { ticketCalls++; return Response.json({ id: registrationId, desktopId, state: 'reviewed', ticket: 'a'.repeat(43) }); }
    if (route === '/registrar/connect' && role === 'registrar') {
      connectCalls++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return Response.json({ id: registrationId, desktopId, state: 'registered', accountId: 'codex_sh_fixture', replayed: false,
        credentialRevision: 'PRIVATE_CREDENTIAL_REVISION', secret: 'PRIVATE_CREDENTIAL' });
    }
    throw Error(`Unexpected ${route} for ${role} ${init?.method ?? ''}`);
  }) as typeof fetch);
  const driver = {
    available: async () => true,
    list: async () => [{ id: desktopId, containerId: 'fixture-container', running: true, healthy: true }],
    create: async () => {}, start: async () => {}, stop: async () => {}, destroy: async () => {}, launch: async () => {},
    display: async () => { throw Error('not used'); }, clipboard: async () => '', credentials: async () => { credentialReads++; return []; },
  };
  const desktops = new DesktopManager(path.join(directory, 'desktops.json'), driver);
  const monitor = poolMonitor({ operator: client(operatorToken, 'operator'), viewer: client(viewerToken, 'viewer'), registrar: client(registrarToken, 'registrar'),
    operatorToken, viewerToken, desktops });
  try {
    await desktops.create({ id: desktopId, name: 'Fixture account' });
    const origin = await listen(monitor.server);
    const ticketResponse = await fetch(origin + '/session/ticket', { method: 'POST', headers: { Authorization: `Bearer ${operatorToken}` } });
    assert.equal(ticketResponse.status, 200);
    const ticket = await ticketResponse.json();
    const session = await fetch(origin + '/session', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'operator', ticket: ticket.ticket }) });
    assert.equal(session.status, 200);
    const cookie = session.headers.get('set-cookie')!.split(';')[0];
    const headers = { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' };
    const [first, second] = await Promise.all([
      fetch(origin + '/api/registrations/connect', { method: 'POST', headers, body: JSON.stringify({ id: registrationId }) }),
      fetch(origin + '/api/registrations/connect', { method: 'POST', headers, body: JSON.stringify({ id: registrationId }) }),
    ]);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    const firstBody = await first.json();
    const secondBody = await second.json();
    for (const body of [firstBody, secondBody]) {
      assert.equal('credentialRevision' in body, false, 'credential revisions must not cross the monitor boundary');
      assert.equal(JSON.stringify(body).includes('PRIVATE_CREDENTIAL'), false, 'credential canaries must not cross the monitor boundary');
    }
    const publicStatusResponse = await fetch(origin + '/api/status', { headers: { Cookie: cookie } });
    assert.equal(publicStatusResponse.status, 200);
    const publicStatus = await publicStatusResponse.json();
    assert.equal('installationId' in publicStatus, false, 'central installation identity must not cross the monitor boundary');
    assert.equal('epoch' in publicStatus, false, 'control epochs must not cross the monitor boundary');
    assert.equal(JSON.stringify(publicStatus).includes(privateEpoch), false, 'ownership epochs must not cross the monitor boundary');
    assert.equal(JSON.stringify(publicStatus).includes('PRIVATE_CREDENTIAL'), false, 'status must not contain credential material');
    assert.equal(JSON.stringify(publicStatus).includes('fixture-container'), false, 'desktop container identity must not cross the monitor boundary');
    assert.equal(publicStatus.accounts[0].applied, true, 'the browser receives a safe applied projection');
    assert.equal(ticketCalls, 1);
    assert.equal(connectCalls, 1);
    assert.equal(credentialReads, 1);
    assert.equal(statusCalls, 3);
  } finally {
    await monitor.close();
    await close(monitor.server);
    await rm(directory, { recursive: true, force: true });
  }
});
