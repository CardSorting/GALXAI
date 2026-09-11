// Mounted into /app for the isolated production-image smoke test. No real keys.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { WebSocketServer } from 'ws';
import { DatabaseSync } from 'node:sqlite';
import { GalxaiRelayServer } from './dist/relay.mjs';

const directory = fs.mkdtempSync('/tmp/galx-receipts-');
const upstream = http.createServer(); const ws = new WebSocketServer({ server: upstream }); let calls = 0;
ws.on('connection', socket => socket.on('message', raw => {
  assert.equal(JSON.parse(raw.toString()).max_output_tokens, undefined);
  calls++;
  socket.send(JSON.stringify({ type: 'response.output_text.delta', delta: 'fixture' }));
  socket.send(JSON.stringify({ type: 'response.completed', response: { status: 'completed' } }));
}));
await new Promise(r => upstream.listen(0, '127.0.0.1', r));
const config = { port: 0, host: '127.0.0.1', assignedShard: { id: 'fixture', accountId: 'fixture', accessToken: 'synthetic' },
  assignedShardId: 'fixture', relayId: 'test', generation: 'one', apiKeys: ['fixture-client'], adminApiKeys: ['fixture-admin'],
  registryEnabled: false, discoverHostCredentials: false, stateSnapshotPath: directory+'/state.json', shardsJsonPath: directory+'/absent',
  capabilityDiscovery: async () => ['test-model'], wsEndpoint: `ws://127.0.0.1:${upstream.address().port}`, drainTimeoutMs: 50 };
let relay = new GalxaiRelayServer(config);
const headers = { Authorization: 'Bearer fixture-client', 'Content-Type': 'application/json' };
try {
  await relay.start(); const base = `http://127.0.0.1:${relay.server.address().port}`;
  const contractUrl = base + '/api/sites/contract?' + new URLSearchParams({ model: 'test-model',
    maxOutputTokens: '2048', nonce: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', profile: 'sites-local-v1' });
  assert.equal((await fetch(contractUrl, { headers })).status, 403);
  const contract = await (await fetch(contractUrl, { headers: { Authorization: 'Bearer fixture-admin' } })).json();
  assert.equal(contract.version, 2); assert.equal(contract.maxAttempts, 1);
  assert.equal(contract.maxOutputBytes, 12000); assert.equal(contract.maxWallTimeMs, 30000);
  const admission = await fetch(base+'/v1/chat/completions', { method: 'POST', headers, body: JSON.stringify({ model: 'test-model',
    messages: [{ role: 'user', content: 'synthetic only' }], durable_receipt: true, sites_profile: 'local-v1' }) });
  assert.equal(admission.status, 202); const job = await admission.json();
  const stream = await fetch(base+job.streamUrl, { headers }); assert((await stream.text()).includes('[DONE]'));
  const receipt = await (await fetch(`${base}/v1/jobs/${job.id}/receipt`, { headers })).json();
  assert.equal(receipt.output, 'fixture'); assert.equal(receipt.status, 'completed'); assert.equal(receipt.usage, null);
  await relay.stop(); relay = new GalxaiRelayServer({ ...config, generation: 'two' }); await relay.start();
  const restarted = `http://127.0.0.1:${relay.server.address().port}`;
  assert.deepEqual(await (await fetch(`${restarted}/v1/jobs/${job.id}/receipt`, { headers })).json(), receipt); assert.equal(calls, 1);
  const db = new DatabaseSync(directory+'/state.json.receipts/receipts.sqlite', { readOnly: true });
  try {
    assert.equal(db.prepare('PRAGMA journal_mode').get().journal_mode, 'delete');
    console.log(JSON.stringify({ productionImage: 'passed', node: process.version, sqlite: db.prepare('SELECT sqlite_version() AS version').get().version,
      syntheticProviderRequests: calls, receiptSurvivedRestart: true, externalNetwork: false, walletWrites: false }));
  } finally { db.close(); }
} finally {
  await relay.stop(); for (const socket of ws.clients) socket.terminate(); await new Promise(r => ws.close(r)); await new Promise(r => upstream.close(r));
  fs.rmSync(directory, { recursive: true, force: true });
}
