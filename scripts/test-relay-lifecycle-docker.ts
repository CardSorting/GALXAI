import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DockerShardDriver } from '../src/relay/docker-shard-driver.js';
import { FileInvalidCredentialStore } from '../src/relay/invalid-credential-store.js';
import { RelayFederationLifecycle, type DesiredShard } from '../src/relay/federation-lifecycle.js';

if (process.env.GALX_DOCKER_CANARY !== '1') throw Error('Set GALX_DOCKER_CANARY=1 for the isolated Docker recovery canary');
const namespace = 'recovery-' + Date.now().toString(36);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), namespace));
const upstream = http.createServer((req, res) => {
  if (req.headers.authorization === 'Bearer synthetic-rejected') { res.writeHead(401); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ models: [{ slug: 'test-model', supported_in_api: true }] }));
});
await new Promise<void>(resolve => upstream.listen(0, '0.0.0.0', resolve));
const driver = new DockerShardDriver({ namespace, secret: randomBytes(32).toString('hex'),
  image: process.env.GALX_DOCKER_CANARY_IMAGE || 'galxai-relay:lifecycle-recovery',
  inventoryUrl: 'http://host.docker.internal:' + (upstream.address() as any).port });
const desired: DesiredShard[] = ['healthy', 'rejected'].map(name => ({ id: namespace + '-' + name, provider: 'openai',
  accountId: name, accessToken: 'synthetic-' + name, credentialRevision: createHash('sha256').update(name).digest('hex') }));
const journal = new FileInvalidCredentialStore(path.join(dir, 'invalid.json'));
let lifecycle: RelayFederationLifecycle | undefined;
async function until(check: () => Promise<boolean>) {
  const end = Date.now() + 45000;
  do { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 500)); } while (Date.now() < end);
  throw Error('Docker recovery did not converge');
}
try {
  const handles = [];
  for (const s of desired) handles.push(await driver.start(s));
  const rejected = handles[1];
  await until(async () => { try { return (await driver.inspect(rejected)).invalidCredential === true; } catch { return false; } });
  execFileSync('docker', ['restart', rejected.id], { timeout: 60000, stdio: 'pipe' });
  const recovered = (await driver.list()).find(h => h.shardId === rejected.shardId)!;
  assert.notEqual(recovered.generation, rejected.generation);
  await until(async () => { try { return (await driver.inspect(recovered)).invalidCredential === true; } catch { return false; } });
  lifecycle = new RelayFederationLifecycle(async () => desired, driver, Date.now, 15000, journal);
  await until(async () => { await lifecycle!.reconcile(); return (await driver.list()).length === 1 && lifecycle!.capabilities.eligible('test-model').length === 1; });
  assert.equal(journal.load().get(rejected.shardId), rejected.credentialRevision);
  await lifecycle.stop();
  lifecycle = new RelayFederationLifecycle(async () => desired, driver, Date.now, 15000, new FileInvalidCredentialStore(path.join(dir, 'invalid.json')));
  await until(async () => { await lifecycle!.reconcile(); return lifecycle!.capabilities.eligible('test-model').length === 1; });
  assert.deepEqual((await driver.list()).map(h => h.shardId), [desired[0].id]);
  await lifecycle.reconcile();
  assert.equal((await driver.list()).length, 1);
  console.log(JSON.stringify({ passed: true, workerRestartRetainsRejection: true, rejectedWorkerRemoved: true, controllerRestartDoesNotRespawn: true }));
} finally {
  await lifecycle?.stop();
  for (const h of await driver.list()) await driver.remove(h);
  assert.equal((await driver.list()).length, 0);
  await new Promise<void>(resolve => upstream.close(() => resolve()));
  fs.rmSync(dir, { recursive: true, force: true });
}
