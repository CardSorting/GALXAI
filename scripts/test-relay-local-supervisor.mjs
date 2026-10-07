import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { composeHealth, firstFailedCause, poolServiceRecoveryAction, retryDelayMs, supervisorCauses } from './lib/relay-local-supervisor.mjs';

test('central readiness requires every configured service to report healthy', () => {
  const expected = ['authority', 'tls'];
  assert.deepEqual(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'tls\tUp 2 minutes (healthy)']), { ready: true, unhealthy: [] });
  assert.equal(composeHealth(expected, ['authority\tUp 4 minutes (healthy)']).ready, false);
  assert.equal(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'tls\tUp 2 minutes (health: starting)']).ready, false);
  assert.deepEqual(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'tls\tUp 2 minutes (unhealthy)']), { ready: false, unhealthy: ['tls'] });
  assert.equal(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'authority\tUp 2 minutes (healthy)']).ready, false);
  assert.equal(composeHealth([], ['authority\tUp 4 minutes (healthy)']).ready, false);
  assert.equal(composeHealth(['authority', 'bad name'], ['authority\tUp 4 minutes (healthy)']).ready, false);
  assert.equal(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'malformed']).ready, false);
});

test('supervisor backoff stays bounded after jitter and grows with attempts', () => {
  assert.equal(retryDelayMs(1, () => 0), 4000);
  assert.equal(retryDelayMs(2, () => 0.5), 10000);
  assert.equal(retryDelayMs(7, () => 0.999999), 300000);
  assert.equal(retryDelayMs(100, () => 0.5), 300000);
  for (const attempt of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) assert.throws(() => retryDelayMs(attempt));
  assert.throws(() => retryDelayMs(1, () => 1));
});

test('recovery categories are a fixed allowlist', () => {
  assert.deepEqual(supervisorCauses, ['central', 'monitor', 'relay', 'recovery']);
});

test('supervisor preserves the first failed dependency as its recovery category', () => {
  assert.equal(firstFailedCause({ central: false, monitor: false, relay: false }), 'central');
  assert.equal(firstFailedCause({ central: true, monitor: false, relay: false }), 'monitor');
  assert.equal(firstFailedCause({ central: true, monitor: true, relay: false }), 'relay');
  assert.equal(firstFailedCause({ central: true, monitor: true, relay: true }), null);
  assert.equal(firstFailedCause({ central: true, monitor: undefined, relay: true }), 'monitor');
});

test('service recovery targets only known running or stopped container states', () => {
  assert.equal(poolServiceRecoveryAction('running'), 'restart');
  assert.equal(poolServiceRecoveryAction('restarting'), 'restart');
  for (const state of ['missing', 'created', 'exited', 'dead']) assert.equal(poolServiceRecoveryAction(state), 'start');
  for (const state of ['paused', 'removing', 'unknown', '', null]) assert.equal(poolServiceRecoveryAction(state), null);
});

test('actual launcher recovers stale ownership and refuses uncertain control evidence', async () => {
  for (const scenario of ['fresh', 'stale', 'recovered-before-restart', 'foreign', 'control-unavailable', 'supervisor-central-down', 'supervisor-monitor-down']) {
    const root = await mkdtemp(path.join(tmpdir(), 'galx-local-connection-'));
    try {
      for (const dir of ['scripts/lib', '.relay/service-deployment/components', '.colima/premium', 'docker/relay-pools/local']) await mkdir(path.join(root, dir), {recursive:true});
      for (const name of ['scripts/relay-local.mjs', 'scripts/lib/relay-local-access.mjs', 'scripts/lib/relay-local-supervisor.mjs']) await writeFile(path.join(root, name), await readFile(new URL('../' + name, import.meta.url)));
      const { createHash } = await import('node:crypto');
      const digest = value => createHash('sha256').update(value).digest('hex');
      await writeFile(path.join(root, '.relay/service-deployment/local-acceptance.json'), JSON.stringify({records:[{pool:'premium',machineSha256:digest('machine'),daemonSha256:digest('daemon')}]}));
      await writeFile(path.join(root, '.relay/service-deployment/components/premium-monitor.json'), JSON.stringify({pool:'premium',installationId:'own'}));
      await writeFile(path.join(root, '.colima/premium/colima.yaml'), 'fixture');
      await writeFile(path.join(root, 'docker/relay-pools/local/pool.yaml'), 'fixture');
      await writeFile(path.join(root, 'docker/relay-pools/local/images.json'), JSON.stringify({images:['central','runtime','monitor'].map(component => ({component,...(component==='central'?{}:{pool:'premium'}),tag:'fixture-'+component,id:'sha256:'+'a'.repeat(64)}))}));
      // The actual launcher runs in a child process. Every external operation,
      // host identity and listener is synthetic; no live service is touched.
      await writeFile(path.join(root, 'mock.cjs'), `
const cp=require('node:child_process'),os=require('node:os'),fs=require('node:fs');
const scenario=process.env.GALX_CONNECTION_SCENARIO,root=process.env.GALX_CONNECTION_FIXTURE;
let reads=0,restarted=false,centralRecovered=scenario!=='supervisor-central-down',monitorRecovered=scenario!=='supervisor-monitor-down';const mutations=[];
os.homedir=()=>root;
global.fetch=async url=>Response.json({ok:!String(url).includes(':13311')||monitorRecovered});
cp.spawn=()=>Object.assign(new (require('node:events').EventEmitter)(),{pid:1,unref(){}});
if(scenario.startsWith('supervisor-')){const timeout=global.setTimeout;global.setTimeout=(callback,ms,...args)=>ms>=20000?timeout(()=>process.exit(0),0):timeout(callback,ms,...args);}
cp.execFileSync=(bin,args)=>{
  if(bin==='colima')return '';
  if(bin==='docker'){
    const command=args[2];
    if(command==='info')return 'daemon';
    if(command==='image')return 'sha256:'+'a'.repeat(64);
    if(command==='ps'){
      if(args.includes('label=com.docker.compose.project=galx-local-authority'))return centralRecovered?'authority\\tUp 1 minute (healthy)\\ntls\\tUp 1 minute (healthy)':'authority\\tUp 1 minute (health: starting)';
      return args.includes('label=com.docker.compose.service=monitor')?'b'.repeat(12):'c'.repeat(12);
    }
    if(command==='inspect'){
      const service=args[3]==='b'.repeat(12)?'monitor':'relay';
      return JSON.stringify([{State:{Status:'running'},Image:'sha256:'+'a'.repeat(64),Config:{Image:'fixture-'+(service==='relay'?'runtime':'monitor'),Labels:{'com.docker.compose.project':'galx-premium','com.docker.compose.service':service}}}]);
    }
    if(command==='exec'){
      reads++;if(scenario==='control-unavailable')throw Error('synthetic private control failure');
      const fresh=scenario==='fresh'||scenario.startsWith('supervisor-')||restarted||(scenario==='recovered-before-restart'&&reads>=4);
      return JSON.stringify({pool:'premium',installationId:scenario==='foreign'?'foreign':'own',lastSeenAt:new Date(Date.now()-(fresh?1000:180000)).toISOString()});
    }
  }
  if(bin==='ssh'){
    const command=args.at(-1);
    if(command.includes('/etc/machine-id'))return 'machine';
    if(command.includes('findmnt'))return '';
    if(command.includes('systemctl'))return 'active';
    if(command.includes('stat'))return '1000';
    if(command.includes("'up'")&&command.includes("'monitor'")&&!monitorRecovered){monitorRecovered=true;mutations.push('start-monitor');}
    if(command.includes("'restart'")){
      if(!command.includes("'relay'")||command.includes("'monitor'"))throw Error('wrong recovery target');
      restarted=true;mutations.push('restart-relay');
    }
    return '';
  }
  throw Error('unexpected fixture command');
};
cp.spawnSync=(bin,args)=>{if(args.includes('up')&&!centralRecovered){centralRecovered=true;mutations.push('start-central');}return {status:0,stdout:args.includes('--services')?'authority\\ntls':'',stderr:''};};
require('node:module').syncBuiltinESMExports();
process.on('exit',()=>fs.writeFileSync(root+'/result.json',JSON.stringify({reads,mutations})));
`);
      let failed = false;
      try { await promisify(execFile)(process.execPath, ['--require', path.join(root, 'mock.cjs'), path.join(root, 'scripts/relay-local.mjs'), scenario.startsWith('supervisor-')?'supervise':'up'], {env:{...process.env,GALX_CONNECTION_SCENARIO:scenario,GALX_CONNECTION_FIXTURE:root},timeout:15000}); }
      catch { failed = true; }
      const result = JSON.parse(await readFile(path.join(root, 'result.json'), 'utf8'));
      assert.equal(failed, ['foreign','control-unavailable'].includes(scenario), scenario);
      const expected = scenario==='stale'?['restart-relay']:scenario==='supervisor-central-down'?['start-central']:scenario==='supervisor-monitor-down'?['start-monitor']:[];
      assert.deepEqual(result.mutations, expected, scenario);
      if (scenario==='stale') assert(result.reads >= 5, 'recovery must confirm a new control heartbeat');
      if (scenario.startsWith('supervisor-')) assert.equal(JSON.parse(await readFile(path.join(root,'.relay/service-deployment/supervisor-state.json'),'utf8')).status,'running');
    } finally { await rm(root, {recursive:true,force:true}); }
  }
});
