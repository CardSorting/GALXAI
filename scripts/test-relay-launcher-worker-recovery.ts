import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { WebSocketServer, type WebSocket } from 'ws';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';
import { desiredShard } from '../src/relay/desired-shards.js';
import { executeRelayChat, readRelayReceipt } from '../src/core/router/adapters/RelayChatTransport';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// Real launcher, controller, HTTP worker, websocket upstream and durable receipts.
// Only registry and Docker resource discovery are fixtures. Never loads .env.local.
test('actual launcher adopts surviving worker, recovers active receipt and required capability after crash and hang', { timeout: 45000 }, async () => {
  const root = process.cwd();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-launcher-worker-'));
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
  const baseline = process.env.GALX_RELAY_BASELINE === '1';
  const launcher = baseline ? path.join(directory, 'original-launcher.ts') : path.join(root, 'scripts/run-relay-federation.ts');
  if (baseline) fs.writeFileSync(launcher, execFileSync('git', ['show', 'HEAD:scripts/run-relay-federation.ts'], { cwd: root, encoding: 'utf8' }).replaceAll('../src/', path.join(root, 'src') + '/'));
  const upstream = http.createServer();
  const ws = new WebSocketServer({ server: upstream });
  let attempts = 0, held: WebSocket | undefined;
  ws.on('connection', socket => socket.on('message', raw => {
    attempts++;
    if (raw.toString().includes('hold-work')) { held = socket; return; }
    socket.send(JSON.stringify({ type: 'response.output_text.delta', delta: 'completed-once' }));
    socket.send(JSON.stringify({ type: 'response.completed', response: { status: 'completed' } }));
  }));
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const shard = desiredShard({ id: 'fixture-a', provider: 'openai', status: 'active' }, { accessToken: 'fixture-only-token', accountId: 'fixture-account' })!;
  const worker = new GalxaiRelayServer({ port: 0, host: '127.0.0.1', assignedShard: shard, assignedShardId: shard.id,
    relayId: 'fixture-worker', generation: 'retained-generation', apiKeys: ['fixture-internal'], adminApiKeys: ['fixture-worker-admin'],
    registryEnabled: false, discoverHostCredentials: false, stateSnapshotPath: path.join(directory, 'worker-state.json'),
    shardsJsonPath: path.join(directory, 'absent'), drainTimeoutMs: 20, capabilityDiscovery: async () => ['test-model'],
    wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}` });
  await worker.start();
  const handle = { id: 'fixture-worker', shardId: shard.id, generation: 'retained-generation', credentialRevision: shard.credentialRevision,
    endpoint: `http://127.0.0.1:${(worker as any).server.address().port}`, inferenceKey: 'fixture-internal', adminKey: 'fixture-worker-admin' };
  const reserve = http.createServer(); await new Promise<void>(resolve => reserve.listen(0, '127.0.0.1', resolve));
  const port = (reserve.address() as any).port; await new Promise<void>(resolve => reserve.close(() => resolve()));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  const registry = path.join(directory, 'registry.mjs');
  fs.writeFileSync(registry, `export async function readShardRegistry(){return [{id:'fixture-a',provider:'openai',status:'active'}]}; export function decryptRegistryShard(){return {accessToken:'fixture-only-token',accountId:'fixture-account'}}; export function configureRegistryEgressGuard(){}; export function getRegistryEgressSnapshot(){return {}}; export function encryptRegistryShard(){throw Error("fixture mutation forbidden")}; export function replaceRegistryCredential(){throw Error("fixture mutation forbidden")}; export function registryConfig(){return null};`);
  const driver = path.join(directory, 'driver.mjs');
  fs.writeFileSync(driver, `const handle=${JSON.stringify(handle)}; export class DockerShardDriver {async list(){return [handle]};async start(){throw Error('Fixture must adopt existing worker')};async inspect(){const r=await fetch(handle.endpoint+'/api/capabilities',{headers:{Authorization:'Bearer '+handle.adminKey}});return {record:(await r.json()).shards[0]}};async remove(){throw Error('Fixture never removes retained worker')}}`);
  fs.writeFileSync(path.join(directory, 'loader.mjs'), `export async function resolve(s,c,n){if(s.endsWith('/shard-registry.js'))return {url:${JSON.stringify(pathToFileURL(registry).href)},shortCircuit:true};if(s.endsWith('/docker-shard-driver.js'))return {url:${JSON.stringify(pathToFileURL(driver).href)},shortCircuit:true};return n(s,c)}`);
  fs.writeFileSync(path.join(directory, 'register.mjs'), `import{registerHooks}from'node:module';registerHooks({resolve(s,c,n){if(s.endsWith('/shard-registry.js')||s.endsWith('/shard-registry.ts'))return {url:${JSON.stringify(pathToFileURL(registry).href)},shortCircuit:true};if(s.endsWith('/docker-shard-driver.js')||s.endsWith('/docker-shard-driver.ts'))return {url:${JSON.stringify(pathToFileURL(driver).href)},shortCircuit:true};return n(s,c)}});if(process.argv[1]?.endsWith('relay-federation-controller.ts'))process.on('SIGUSR1',()=>{while(true){}});`);
  const children: { child: ChildProcess; output: string }[] = [];
  const start = () => {
    const child = spawn(process.execPath, ['--import', 'tsx', launcher], { cwd: directory,
      env: { PATH: process.env.PATH, HOME: directory, NODE_OPTIONS: `--import=${path.join(directory, 'register.mjs')}`,
        RELAY_FEDERATION_NAMESPACE: 'worker-fixture', RELAY_FEDERATION_PORT: String(port), RELAY_API_KEYS: 'fixture-client',
        RELAY_ADMIN_API_KEYS: 'fixture-admin', RELAY_HEARTBEAT_SECONDS: '2', RELAY_PROGRESS_SECONDS: '10', RELAY_SHUTDOWN_SECONDS: '1' },
      stdio: ['ignore', 'pipe', 'pipe'] });
    const record = { child, output: '' }; child.stdout!.on('data', chunk => { record.output += chunk; }); child.stderr!.on('data', chunk => { record.output += chunk; });
    children.push(record); return record;
  };
  const until = async (fn: () => boolean | Promise<boolean>, message: string, timeout = 10000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await fn()) return; await delay(20); }
    throw new Error(message + '\n' + children.map(c => c.output).join('\n'));
  };
  const base = `http://127.0.0.1:${port}`;
  const ready = async () => { try { return (await fetch(base + '/health/ready', { headers: { Authorization: 'Bearer fixture-admin' }, signal: AbortSignal.timeout(500) })).status === 200; } catch { return false; } };
  const owner = (record: typeof children[number]) => baseline ? record.child.pid! : JSON.parse(record.output.split('\n').find(line => line.includes('"authority_established"'))!).pid as number;
  const successfulRequest = async () => {
    const result = await (await executeRelayChat({ url: base, key: 'fixture-client', payload: { model: 'test-model', messages: [{ role: 'user', content: 'ordinary work' }], durable_receipt: true, stream: false }, ttftTimeoutMs: 5000 })).response.json();
    assert.equal(result.choices[0].message.content, 'completed-once');
  };
  let failed = true;
  try {
    const first = start(); await until(ready, 'initial capability readiness failed').catch(async error => {
      console.error('Fixture capability diagnostics', JSON.stringify({ worker: (worker as any).capabilitySnapshot(), controller: await fetch(base + '/api/capabilities', { headers: { Authorization: 'Bearer fixture-admin' } }).then(r => r.json()).catch(() => 'not listening') })); throw error;
    });
    const response = await fetch(base + '/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer fixture-client', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'test-model', messages: [{ role: 'user', content: 'hold-work' }], durable_receipt: true }) });
    assert.equal(response.status, 202); const accepted = await response.json(); assert(accepted.id);
    await until(() => !!held, 'worker did not accept held request');
    await delay(2500); assert.equal(first.child.exitCode, null, 'quiet active request must not trigger watchdog');
    const crashAt = performance.now(); process.kill(owner(first), 'SIGKILL');
    await until(() => first.child.exitCode !== null || first.child.signalCode !== null, 'old launcher did not end');
    const replacement = start(); await until(ready, 'replacement did not adopt required worker capability');
    const crashReady = performance.now() - crashAt;
    held!.send(JSON.stringify({ type: 'response.output_text.delta', delta: 'retained-active-result' }));
    held!.send(JSON.stringify({ type: 'response.completed', response: { status: 'completed' } }));
    let receipt: any;
    await until(async () => { receipt = await readRelayReceipt({ url: base, key: 'fixture-client', jobId: accepted.id, signal: AbortSignal.timeout(1000) }); return receipt.status === 'completed'; }, 'retained active receipt did not complete');
    assert.equal(receipt.output, 'retained-active-result'); assert.equal(attempts, 1, 'recovery must not execute again');
    await successfulRequest(); const crashWork = performance.now() - crashAt;
    const hangAt = performance.now(); process.kill(owner(replacement), 'SIGUSR1');
    await until(() => replacement.output.includes('"event_loop_stalled"'), 'external watchdog missed blocked loop');
    await until(() => replacement.child.exitCode !== null || replacement.child.signalCode !== null, 'blocked controller authority not ended');
    const third = start(); await until(ready, 'hang replacement not capability-ready'); const hangReady = performance.now() - hangAt;
    await successfulRequest(); const hangWork = performance.now() - hangAt;
    assert.equal(attempts, 3);
    assert.equal((worker as any).capabilitySnapshot().shards[0].generation, 'retained-generation');
    assert(third.output.includes('authority_established'));
    console.log(JSON.stringify({ drill: 'actual_launcher_retained_real_worker', crashToRequiredReadyMs: Math.round(crashReady), crashToSuccessfulRequestMs: Math.round(crashWork),
      hangToRequiredReadyMs: Math.round(hangReady), hangToSuccessfulRequestMs: Math.round(hangWork), activeReceiptRecovered: true, upstreamExecutions: attempts,
      workerGenerationPreserved: true, quietActiveMs: 2500, realDocker: false, registryAndAdoptionDriver: 'fixtures' }));
    failed = false;
  } finally {
    for (const record of children) {
      if (record.child.exitCode === null) record.child.kill('SIGTERM');
      await until(() => record.child.exitCode !== null || record.child.signalCode !== null, 'fixture launcher cleanup failed', 5000).catch(() => { record.child.kill('SIGKILL'); });
    }
    await worker.stop(); for (const socket of ws.clients) socket.terminate();
    await new Promise<void>(resolve => ws.close(() => resolve())); await new Promise<void>(resolve => upstream.close(() => resolve()));
    if (failed) { fs.writeFileSync(path.join(directory, 'failure.log'), children.map(c => c.output).join('\n')); console.error('Retained isolated failure evidence:', directory); }
    else fs.rmSync(directory, { recursive: true, force: true });
  }
});
