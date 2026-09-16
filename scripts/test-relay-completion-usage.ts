import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { GalxaiRelayServer } from '../src/relay/relay-server';
import { completionUsage, completionFrame } from '../src/relay/completion-usage';
import { upstreamDiagnostic } from '../src/relay/upstream-diagnostic';
import { executeRelayChat, readRelayReceipt } from '../src/core/router/adapters/RelayChatTransport';
import { requireSitesRelayPreflight } from '../src/lib/billing/sites-relay-preflight';

const evidence = { status: 'completed', usage: { input_tokens: 31, output_tokens: 17, total_tokens: 48,
  private_detail: 'must-not-escape', output_tokens_details: { reasoning_tokens: 9 } } };
const expected = { prompt_tokens: 31, completion_tokens: 17, total_tokens: 48 };
test('usage requires complete transport evidence and accounts for reasoning within total output', () => {
  assert.deepEqual(completionUsage(evidence), expected);
  for (const response of [null, {}, { ...evidence, status: 'incomplete' }, { ...evidence, status: 'failed' },
    ...[undefined, {}, { input_tokens: '31', output_tokens: 17, total_tokens: 48 },
      { input_tokens: 31, output_tokens: 17, total_tokens: 49 }, { input_tokens: -1, output_tokens: 2, total_tokens: 1 },
      { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, { input_tokens: 1e20, output_tokens: 0, total_tokens: 1e20 }].map(usage => ({ status: 'completed', usage }))]) {
    assert.equal(completionUsage(response), undefined);
  }
  assert.equal(completionUsage(evidence, 1), undefined);
  assert.equal(completionUsage(evidence, 0, 1), undefined);
  const frame = completionFrame({ id: 'job', usage: { ...expected, private: 'secret' } as any });
  assert(!frame.includes('secret')); assert(!frame.includes('reasoning_tokens'));
});

test('real worker retains allowlisted usage for live output, terminal replay and read-only transport recovery', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-usage-'));
  const upstream = http.createServer(); const ws = new WebSocketServer({ server: upstream });
  const requests: any[] = [];
  ws.on('connection', socket => socket.on('message', raw => {
    const request = JSON.parse(raw.toString()); requests.push(request);
    setTimeout(() => {
      socket.send(JSON.stringify({ type: 'response.output_text.delta', delta: 'hello' }));
      socket.send(JSON.stringify({ type: 'response.completed', response: evidence }));
    }, 50);
  }));
  await new Promise<void>(r => upstream.listen(0, '127.0.0.1', r));
  const config = { port: 0, host: '127.0.0.1', assignedShard: { id: 'a', accountId: 'a', accessToken: 'fixture' },
    assignedShardId: 'a', relayId: 'relay-a', generation: 'one', apiKeys: ['client', 'other'], adminApiKeys: ['admin'],
    registryEnabled: false, discoverHostCredentials: false, forwardOutputTokenLimit: true, stateSnapshotPath: path.join(directory, 'state.json'),
    shardsJsonPath: path.join(directory, 'absent'), drainTimeoutMs: 20,
    capabilityDiscovery: async () => ['test-model'], wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}` };
  let relay = new GalxaiRelayServer(config);
  try {
    await relay.start();
    const base = `http://127.0.0.1:${(relay as any).server.address().port}`;
    const preflight = { url: base, model: 'test-model', maxOutputTokens: 64 };
    await assert.rejects(requireSitesRelayPreflight({ ...preflight, adminKey: 'client' }));
    await assert.rejects(requireSitesRelayPreflight({ ...preflight, adminKey: 'other' }));
    await requireSitesRelayPreflight({ ...preflight, adminKey: 'admin' });
    await assert.rejects(requireSitesRelayPreflight({ ...preflight, adminKey: 'admin', model: 'missing' }));
    assert.equal(requests.length, 0);
    let accepted = '';
    const options = { url: base, key: 'client', payload: { model: 'test-model', messages: [{ role: 'user', content: 'usage fixture' }], reasoning_effort: 'none', stream: false, durable_receipt: true, require_output_limit: true, max_tokens: 64 },
      ttftTimeoutMs: 5000, onAccepted: async (id: string) => { accepted = id; } };
    const first = await (await executeRelayChat(options)).response.json();
    assert(accepted); assert.equal(first.id, accepted); assert.deepEqual(first.usage, expected);
    assert.equal(requests.length, 1); assert.equal(requests[0].max_output_tokens, 64);
    assert.deepEqual(requests[0].reasoning, { effort: 'none' });
    assert(!JSON.stringify(first).includes('must-not-escape'));
    const replay = await (await executeRelayChat({ ...options, resumeJobId: accepted,
      onAccepted: async () => { throw new Error('must not dispatch'); } })).response.json();
    assert.deepEqual(replay.usage, expected); assert.equal(replay.choices[0].message.content, 'hello'); assert.equal(requests.length, 1);
    assert.equal((await fetch(base + `/v1/jobs/${accepted}/stream`, { headers: { Authorization: 'Bearer other' } })).status, 404);
    await assert.rejects(executeRelayChat({ ...options, resumeJobId: '../other' }), /relay/i);
    const receipt = await readRelayReceipt({ ...options, jobId: accepted, signal: AbortSignal.timeout(5000) });
    assert.deepEqual(receipt.usage, expected); assert.equal(receipt.output, 'hello');
    await relay.stop(); relay = new GalxaiRelayServer({ ...config, generation: 'two' }); await relay.start();
    const restarted = `http://127.0.0.1:${(relay as any).server.address().port}`;
    assert.equal((await fetch(restarted + `/v1/jobs/${accepted}/stream`, { headers: { Authorization: 'Bearer client' } })).status, 404);
    assert.deepEqual(await readRelayReceipt({ ...options, url: restarted, jobId: accepted, signal: AbortSignal.timeout(5000) }), receipt);
    assert.equal(requests.length, 1);
    assert.equal((await fetch(restarted + `/v1/jobs/${accepted}/receipt`, { headers: { Authorization: 'Bearer other' } })).status, 404);
    const ordinary = await (await executeRelayChat({ ...options, url: restarted, payload: {
      model: 'test-model', messages: [{ role: 'user', content: 'ordinary chat' }], max_tokens: 64,
      reasoning_effort: 'none', stream: false } })).response.json();
    assert.equal(ordinary.choices[0].message.content, 'hello');
    assert.equal(requests.length, 2); assert.equal(requests[1].max_output_tokens, undefined);
    // Local pricing works whether global token-ceiling forwarding is enabled or disabled.
    for (const forward of [true, false]) {
      (relay as any).config.forwardOutputTokenLimit = forward;
      await requireSitesRelayPreflight({ ...preflight, url: restarted, adminKey: 'admin', profile: 'sites-local-v1' });
      const local = await (await executeRelayChat({ ...options, url: restarted, idempotencyKey: `local-${forward}`, payload: {
        model: 'test-model', messages: [{ role: 'user', content: 'local content' }], durable_receipt: true,
        sites_profile: 'local-v1', reasoning_effort: 'none', stream: false } })).response.json();
      assert.equal(local.choices[0].message.content, 'hello');
      assert.equal(requests.at(-1).max_output_tokens, undefined);
      assert.equal(requests.at(-1).sites_profile, undefined);
      assert.equal((await readRelayReceipt({ ...options, url: restarted, jobId: local.id, signal: AbortSignal.timeout(5000) })).status, 'completed');
    }
    (relay as any).receiptStore().close();
    await assert.rejects(requireSitesRelayPreflight({ ...preflight, url: restarted, adminKey: 'admin' }));
    await assert.rejects(requireSitesRelayPreflight({ ...preflight, url: restarted, adminKey: 'admin', profile: 'sites-local-v1' }));
  } finally {
    await relay.stop(); for (const socket of ws.clients) socket.terminate();
    await new Promise<void>(r => ws.close(() => r())); await new Promise<void>(r => upstream.close(() => r()));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('operator error diagnostics allowlist values, never provider strings or credentials', () => {
  assert.deepEqual(upstreamDiagnostic({ status: 400, error: { code: 'invalid_request_error', param: 'max_output_tokens',
    message: "Unsupported parameter: 'max_output_tokens'. Bearer secret https://private.example?token=secret" } }),
  { status: 400, code: 'invalid_request_error', parameter: 'max_output_tokens', reason: 'unsupported_parameter' });
  const diagnostic = upstreamDiagnostic({ status: 'secret', error: { code: 'secret', param: 'secret', message: 'secret' }, token: 'secret' });
  assert(!JSON.stringify(diagnostic).includes('secret'));
  assert.equal(diagnostic.parameter, 'unclassified'); assert.equal(diagnostic.status, null);
  assert.equal(upstreamDiagnostic({ error: { message: 'Unsupported parameter: max_output_tokens' } }).parameter, 'max_output_tokens');
});

test('private rejection diagnostics identify the job without changing failure or replay policy', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-private-rejection-'));
  const upstream = http.createServer(), ws = new WebSocketServer({ noServer: true });
  let mode = 'frame', attempts = 0;
  const diagnostics: any[] = [];
  upstream.on('upgrade', (req, socket, head) => {
    attempts++;
    if (mode === 'http') { socket.end('HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n'); return; }
    ws.handleUpgrade(req, socket, head, client => client.on('message', () => client.send(JSON.stringify({
      type: 'error', status: 400, error: { code: 'invalid_request_error', param: 'max_output_tokens',
        message: 'Unsupported parameter: max_output_tokens. Bearer private-secret' },
    }))));
  });
  await new Promise<void>(r => upstream.listen(0, '127.0.0.1', r));
  const relay = new GalxaiRelayServer({ port: 0, host: '127.0.0.1', assignedShard: { id: 'a', accountId: 'a', accessToken: 'fixture' },
    assignedShardId: 'a', apiKeys: ['client'], adminApiKeys: ['admin'], registryEnabled: false, discoverHostCredentials: false,
    stateSnapshotPath: path.join(directory, 'state.json'), shardsJsonPath: path.join(directory, 'absent'), drainTimeoutMs: 20,
    capabilityDiscovery: async () => ['test'], wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}`,
    onUpstreamDiagnostic: (diagnostic, context) => { diagnostics.push({ diagnostic, context }); throw Error('Observer unavailable'); } });
  try {
    await relay.start(); const url = `http://127.0.0.1:${relay.listeningPort()}`;
    for (mode of ['frame', 'http']) {
      let id = '';
      await assert.rejects(executeRelayChat({ url, key: 'client', idempotencyKey: mode,
        payload: { model: 'test', messages: [{ role: 'user', content: mode }], durable_receipt: true, stream: false },
        ttftTimeoutMs: 5000, onAccepted: async jobId => { id = jobId; } }));
      assert.equal(diagnostics.at(-1).context.jobId, id);
      assert.equal(diagnostics.at(-1).diagnostic.status, 400);
      assert.equal((await readRelayReceipt({ url, key: 'client', jobId: id, signal: AbortSignal.timeout(5000) })).status, 'unknown');
      const denied = await fetch(url + '/api/telemetry', { headers: { Authorization: 'Bearer client' } });
      assert.equal(denied.status, 403);
    }
    assert.equal(attempts, 2); assert.equal(diagnostics.length, 2);
    assert.equal(diagnostics[0].diagnostic.parameter, 'max_output_tokens');
    assert(!JSON.stringify(diagnostics).includes('private-secret'));
  } finally {
    await relay.stop(); for (const socket of ws.clients) socket.terminate();
    await new Promise<void>(r => ws.close(() => r())); await new Promise<void>(r => upstream.close(() => r()));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('required output ceiling rejects disabled forwarding before queueing or opening a provider connection', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-limit-admission-'));
  const relay = new GalxaiRelayServer({ port: 0, host: '127.0.0.1', assignedShard: { id: 'a', accountId: 'a', accessToken: 'fixture' },
    assignedShardId: 'a', apiKeys: ['client'], adminApiKeys: ['admin'], registryEnabled: false, discoverHostCredentials: false,
    stateSnapshotPath: path.join(directory, 'state.json'), shardsJsonPath: path.join(directory, 'absent'),
    drainTimeoutMs: 20, capabilityDiscovery: async () => ['test'], wsEndpoint: 'ws://127.0.0.1:1' });
  try {
    await relay.start(); const url = `http://127.0.0.1:${(relay as any).server.address().port}/v1/chat/completions`;
    const body = { model: 'test', messages: [{ role: 'user', content: 'bounded work' }], durable_receipt: true, require_output_limit: true, max_tokens: 64 };
    const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer client', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: { code: 'service_unavailable', message: 'This request is temporarily unavailable.' } });
    for (const invalid of [{ ...body, require_output_limit: 'true' }, { ...body, durable_receipt: false }, { ...body, max_tokens: undefined }]) {
      assert.equal((await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer client', 'content-type': 'application/json' }, body: JSON.stringify(invalid) })).status, 400);
    }
    for (const patch of [{ sites_profile: 'other' }, { sites_profile: 'local-v1' },
      { sites_profile: 'local-v1', max_tokens: undefined, require_output_limit: false, durable_receipt: false }]) {
      assert.equal((await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer client', 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, ...patch }) })).status, 400);
    }
    assert.equal((relay as any).jobsTable.getAll().length, 0);
    await assert.rejects(requireSitesRelayPreflight({ url: new URL(url).origin, adminKey: 'admin', model: 'test', maxOutputTokens: 64 }));
    assert(!fs.existsSync(path.join(directory, 'state.json.receipts')));
  } finally { await relay.stop(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('durable jobs stop on oversized output, provider failure or receipt commit failure, without hidden retries', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-receipt-failures-'));
  const upstream = http.createServer(); const ws = new WebSocketServer({ server: upstream }); let requests = 0;
  let mode = 'oversized';
  ws.on('connection', socket => socket.on('message', () => {
    requests++;
    setTimeout(() => {
      if (mode === 'retryable') socket.send(JSON.stringify({ type: 'error', status: 500, error: { code: 'server_error' } }));
      else {
        socket.send(JSON.stringify({ type: 'response.output_text.delta', delta: mode === 'oversized' ? 'a'.repeat(12001) : 'ok' }));
        socket.send(JSON.stringify({ type: 'response.completed', response: evidence }));
      }
    }, 20);
  }));
  await new Promise<void>(r => upstream.listen(0, '127.0.0.1', r));
  const relay = new GalxaiRelayServer({ port: 0, host: '127.0.0.1', assignedShard: { id: 'a', accountId: 'a', accessToken: 'fixture' },
    assignedShardId: 'a', relayId: 'a', generation: 'one', apiKeys: ['client'], adminApiKeys: ['admin'], registryEnabled: false,
    discoverHostCredentials: false, maxUpstreamRetries: 3, stateSnapshotPath: path.join(directory, 'state.json'), shardsJsonPath: path.join(directory, 'absent'),
    drainTimeoutMs: 20, capabilityDiscovery: async () => ['test'], wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}` });
  try {
    await relay.start(); const url = `http://127.0.0.1:${(relay as any).server.address().port}`;
    for (mode of ['oversized', 'retryable', 'commit_failure']) {
      let jobId = '';
      if (mode === 'commit_failure') (relay as any).receiptStore().complete = () => { throw new Error('Injected fsync failure'); };
      await assert.rejects(executeRelayChat({ url, key: 'client', payload: { model: 'test', messages: [{ role: 'user', content: mode }],
        durable_receipt: true, sites_profile: 'local-v1', stream: false }, ttftTimeoutMs: 5000, onAccepted: async id => { jobId = id; } }));
      const receipt = await readRelayReceipt({ url, key: 'client', jobId, signal: AbortSignal.timeout(5000) });
      assert.equal(receipt.status, 'unknown'); assert.equal(receipt.usage, null); assert.equal(receipt.output, null);
    }
    assert.equal(requests, 3);
  } finally {
    await relay.stop(); for (const socket of ws.clients) socket.terminate(); await new Promise<void>(r => ws.close(() => r()));
    await new Promise<void>(r => upstream.close(() => r())); fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('different billed operation keys cannot share an identical prompt execution', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-receipt-operations-'));
  const upstream = http.createServer(); const ws = new WebSocketServer({ server: upstream }); let requests = 0;
  ws.on('connection', socket => socket.on('message', () => {
    requests++; socket.send(JSON.stringify({ type: 'response.output_text.delta', delta: 'hello' }));
    socket.send(JSON.stringify({ type: 'response.completed', response: evidence }));
  }));
  await new Promise<void>(r => upstream.listen(0, '127.0.0.1', r));
  const relay = new GalxaiRelayServer({ port: 0, host: '127.0.0.1', assignedShard: { id: 'a', accountId: 'a', accessToken: 'fixture' },
    assignedShardId: 'a', relayId: 'a', generation: 'one', apiKeys: ['client'], adminApiKeys: ['admin'], registryEnabled: false,
    discoverHostCredentials: false, stateSnapshotPath: path.join(directory, 'state.json'), shardsJsonPath: path.join(directory, 'absent'),
    drainTimeoutMs: 20, capabilityDiscovery: async () => ['test'], wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}` });
  try {
    await relay.start(); const options = { url: `http://127.0.0.1:${(relay as any).server.address().port}`, key: 'client',
      payload: { model: 'test', messages: [{ role: 'user', content: 'same brief' }], durable_receipt: true, stream: false }, ttftTimeoutMs: 5000 };
    const first = await (await executeRelayChat({ ...options, idempotencyKey: 'customer-a-operation' })).response.json();
    const second = await (await executeRelayChat({ ...options, idempotencyKey: 'customer-b-operation' })).response.json();
    assert.notEqual(first.id, second.id); assert.equal(requests, 2);
  } finally {
    await relay.stop(); for (const socket of ws.clients) socket.terminate(); await new Promise<void>(r => ws.close(() => r()));
    await new Promise<void>(r => upstream.close(() => r())); fs.rmSync(directory, { recursive: true, force: true });
  }
});
