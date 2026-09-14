import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { DockerShardDriver } from '../src/relay/docker-shard-driver.js';
import { RelayFederationLifecycle, type DesiredShard } from '../src/relay/federation-lifecycle.js';
import { CapabilityDiscoveryError } from '../src/relay/capability-discovery.js';
import { validateOperatorCredential } from '../src/relay/operator-enrollment.js';
import { isolatedIntegrationEnvironment } from './lib/integration-test-environment.js';
import { GalxCredentialSubstrate } from '../src/core/substrate/GalxCredentialSubstrate.js';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';

const candidate: DesiredShard = { id: 'fixture', provider: 'openai', accountId: 'test', accessToken: 'sk-synthetic', credentialRevision: 'v1' };
test('invalid candidates are checked before any Docker allocation; temporary errors stay temporary', async t => {
  const driver = new DockerShardDriver({ namespace: 'test', image: 'test', secret: 's'.repeat(32) });
  t.mock.method(driver as any, 'docker', async () => assert.fail('invalid candidate must never reach Docker'));
  let status = 401;
  t.mock.method(globalThis, 'fetch', async () => new Response('private upstream content', { status }));
  for (const code of [401, 403, 429, 500, 502]) {
    status = code;
    await assert.rejects(driver.start(candidate), error => error instanceof CapabilityDiscoveryError
      && error.code === (code === 401 ? 'invalid_credential' : 'inventory_unavailable') && !error.message.includes('private'));
  }
});
test('pre-start rejection persists across restart and permits only a new credential revision', async () => {
  let now = 100000, starts = 0, desired = candidate;
  let saved = new Map<string,string>();
  const store = { load: () => new Map(saved), save: (entries: ReadonlyMap<string,string>) => { saved = new Map(entries); } };
  const driver = { list: async () => [], inspect: async () => ({}), remove: async () => assert.fail('nothing to remove'),
    start: async () => { starts++; throw new CapabilityDiscoveryError('invalid_credential', 401); } };
  let lifecycle = new RelayFederationLifecycle(async () => [desired], driver, () => now, 15000, store);
  await lifecycle.reconcile(); await lifecycle.reconcile();
  assert.equal(starts, 1); assert.equal(saved.get(candidate.id), 'v1'); await lifecycle.stop();
  lifecycle = new RelayFederationLifecycle(async () => [desired], driver, () => now, 15000, store);
  await lifecycle.reconcile(); assert.equal(starts, 1);
  desired = { ...candidate, credentialRevision: 'v2' }; now++;
  await lifecycle.reconcile(); assert.equal(starts, 2); assert.equal(saved.get(candidate.id), 'v2'); await lifecycle.stop();
});

test('validated cold candidates allocate once and are then adopted by automatic reconciliation', async t => {
  const driver = new DockerShardDriver({ namespace: 'test', image: 'test', secret: 's'.repeat(32) });
  const calls:string[]=[]; let allocationArgs: string[] = [];
  t.mock.method(globalThis,'fetch',async()=>{calls.push('validate');return Response.json({data:[{id:'A'}]});});
  const handle={id:'worker',shardId:candidate.id,generation:'g',credentialRevision:candidate.credentialRevision,endpoint:'http://127.0.0.1:1',inferenceKey:'i',adminKey:'a'};
  t.mock.method(driver as any,'docker',async(args: string[])=>{calls.push('allocate');allocationArgs=args;return '';});
  t.mock.method(driver as any,'inspectContainer',async()=>handle);
  let running:typeof handle[]=[];
  t.mock.method(driver,'list',async()=>running);
  const start=driver.start.bind(driver);t.mock.method(driver,'start',async s=>{const h=await start(s);running=[h];return h;});
  t.mock.method(driver,'inspect',async()=>({}));t.mock.method(driver,'remove',async()=>{});
  const lifecycle=new RelayFederationLifecycle(async()=>[candidate],driver);
  await lifecycle.reconcile();await lifecycle.reconcile();assert.deepEqual(calls,['validate','allocate']);
  assert.equal(allocationArgs[allocationArgs.indexOf('--restart') + 1], 'no', 'the controller, not Docker, owns worker restarts');
  await lifecycle.stop();
});
test('preflight service errors and journal failures back off without claiming a saved rejection', async () => {
  let now = 100000, starts = 0, invalid = false;
  const lifecycle = new RelayFederationLifecycle(async () => [candidate], {
    list: async () => [], inspect: async () => ({}), remove: async () => {},
    start: async () => { starts++; throw new CapabilityDiscoveryError(invalid ? 'invalid_credential' : 'inventory_unavailable', invalid ? 401 : 503); }
  }, () => now, 15000, { load: () => new Map(), save: () => { throw Error('disk full'); } });
  await lifecycle.reconcile(); await lifecycle.reconcile(); assert.equal(starts, 1); assert.deepEqual(lifecycle.snapshot().invalidShards, []);
  now += 2000; invalid = true;
  await lifecycle.reconcile(); await lifecycle.reconcile(); assert.equal(starts, 2); assert.deepEqual(lifecycle.snapshot().invalidShards, []);
  assert.equal(lifecycle.snapshot().lastError, 'credential_rejection_journal_unavailable'); await lifecycle.stop();
});
test('late rejection cannot poison a newly rotated credential', async () => {
  let release!:()=>void, entered!:()=>void, desired = candidate;
  const gate = new Promise<void>(r=>{release=r;}), started = new Promise<void>(r=>{entered=r;});
  const lifecycle = new RelayFederationLifecycle(async () => [desired], {
    list: async () => [], inspect: async () => ({}), remove: async () => {},
    start: async () => { entered(); await gate; throw new CapabilityDiscoveryError('invalid_credential',401); }
  });
  const first=lifecycle.reconcile(); await started;
  desired={...candidate,credentialRevision:'v2'};
  const second=lifecycle.reconcile(); await new Promise(r=>setImmediate(r)); release(); await Promise.all([first,second]);
  assert.deepEqual(lifecycle.snapshot().invalidShards,[]); await lifecycle.stop();
});
test('operator enrollment validates identity, expiration and upstream without exposing provider content', async () => {
  const now=Date.now(), claims={iat:Math.floor(now/1000)-1,exp:Math.floor(now/1000)+3600,'https://api.openai.com/auth':{chatgpt_account_id:'test'}};
  const token=(body:unknown)=>'header.'+Buffer.from(JSON.stringify(body)).toString('base64url')+'.signature';
  const input={accessToken:token(claims),accountId:'test'};
  let calls=0, status=200;
  const transport=(async()=>{calls++;return Response.json(status===200?{models:[{slug:'A'}]}:{private:'must never escape'},{status});}) as typeof fetch;
  assert.equal((await validateOperatorCredential(input,transport,now)).accountId,'test');
  for(const bad of [{...input,accountId:'wrong'},{...input,accessToken:token({...claims,exp:1})},{...input,accessToken:'not-a-login'}])
    await assert.rejects(validateOperatorCredential(bad,transport,now),/fresh login/);
  assert.equal(calls,1);
  status=401; await assert.rejects(validateOperatorCredential(input,transport,now),/provider rejected/);
  status=403; await assert.rejects(validateOperatorCredential(input,transport,now),/Nothing was enrolled/);
});
test('ambient import paths fail before accessing authority or host credentials', async () => {
  await assert.rejects(GalxCredentialSubstrate.prototype.seedMultiAccountFleet.call({} as any),/discovery is retired/);
  assert.throws(()=>new GalxaiRelayServer({discoverHostCredentials:true}),/discovery is retired/);
  const result=spawnSync(process.execPath,['--import','tsx','scripts/manage-shards.ts','--import'],{encoding:'utf8',env:{PATH:process.env.PATH}});
  assert.equal(result.status,1); assert.match(result.stderr,/Bulk credential import is retired/); assert(!result.stderr.includes('not configured'));
});
test('integration suite refuses production and strips inherited Data API authority before imports', () => {
  for(const value of [undefined,'postgres://user:secret@cloud.example/galx_integration_test','postgres://localhost/galx_integration_test',
    'postgres://127.0.0.1/postgres','postgres://127.0.0.1/galx_integration_test?host=cloud.example','postgres://127.0.0.1/galx_integration_test#x']) {
    assert.throws(()=>isolatedIntegrationEnvironment({GALX_INTEGRATION_DATABASE_URL:value}),/loopback database/);
  }
  const next=isolatedIntegrationEnvironment({GALX_INTEGRATION_DATABASE_URL:'postgres://127.0.0.1/galx_integration_test_run',DATABASE_URL:'production',
    SUPABASE_SERVICE_ROLE_KEY:'private',NEXT_PUBLIC_SUPABASE_URL:'https://production.example',
    R2_ACCESS_KEY_ID:'private',R2_SECRET_ACCESS_KEY:'private',STRIPE_SECRET_KEY:'private',VM_RELAY_API_KEY:'private',
    GALX_VAULT_KEY_V1:'production-key',GALX_AUDIT_SIGNING_SECRET:'production-key',NODE_OPTIONS:'--require unsafe',PATH:'test-path'});
  assert.equal(next.DATABASE_URL,'postgres://127.0.0.1/galx_integration_test_run?sslmode=disable'); assert.equal(next.NODE_ENV,'test');
  assert(!next.SUPABASE_SERVICE_ROLE_KEY);assert(!next.NEXT_PUBLIC_SUPABASE_URL);
  for(const key of ['R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','STRIPE_SECRET_KEY','VM_RELAY_API_KEY','NODE_OPTIONS']) assert(!next[key]);
  assert.notEqual(next.GALX_VAULT_KEY_V1,'production-key');assert.notEqual(next.GALX_AUDIT_SIGNING_SECRET,'production-key');
  assert.equal(next.PATH,'test-path');
  for(const args of [[],['--billing']]) {
    const result=spawnSync(process.execPath,['--import','tsx','scripts/test-supabase-integration.ts',...args],{encoding:'utf8',env:{PATH:process.env.PATH,DATABASE_URL:'production'}});
    assert.equal(result.status,1);assert.match(result.stderr,/Integration tests require/);assert(!result.stdout.includes('TEST SUITE'));
  }
  const fixture=spawnSync(process.execPath,['--import','tsx','scripts/run-supabase-integration.ts'],{encoding:'utf8',env:{PATH:process.env.PATH,
    GALX_INTEGRATION_DATABASE_URL:'postgres://user:private-password@production.example/galx_integration_test'}});
  assert.equal(fixture.status,1);assert.match(fixture.stderr,/loopback database/);
  assert(!fixture.stdout.includes('Starting disposable'));assert(!fixture.stderr.includes('private-password'));
});

test('the isolated integration process fails even when an unexpected HTTP attempt is caught', () => {
  const result=spawnSync(process.execPath,['--import','tsx','--import','./scripts/lib/integration-no-network.ts',
    '--input-type=module','-e','await fetch("https://must-not-be-contacted.invalid").catch(()=>{});'],{encoding:'utf8',env:{PATH:process.env.PATH}});
  assert.equal(result.status,1);assert.match(result.stderr,/1 unexpected HTTP requests/);
});
