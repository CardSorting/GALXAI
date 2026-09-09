import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { DockerShardDriver } from '../src/relay/docker-shard-driver.js';
import { RelayFederationLifecycle, type DesiredShard } from '../src/relay/federation-lifecycle.js';
import { RelayFederationServer } from '../src/relay/federation-server.js';

// Explicit opt-in: creates and removes only containers in this unique test namespace.
if (process.env.GALX_DOCKER_CANARY !== '1') throw new Error('Set GALX_DOCKER_CANARY=1 to run the isolated Docker canary');
const namespace = `test-${Date.now().toString(36)}`;
const inventories = new Map([['a',['A','B']],['b',['B','C']],['c',['A','C']]]);
const upstream=http.createServer((req,res)=>{
  const id=String(req.headers.authorization ?? '').replace('Bearer test-', '');
  if(!inventories.has(id)){res.writeHead(401);res.end();return;}
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({models:inventories.get(id)!.map(slug=>({slug,supported_in_api:true}))}));
});
await new Promise<void>(resolve=>upstream.listen(0,'0.0.0.0',resolve));
const secret=randomBytes(32).toString('hex');
const driver=new DockerShardDriver({namespace,secret,image:process.env.GALX_DOCKER_CANARY_IMAGE || 'galxai-relay:vnext',inventoryUrl:`http://host.docker.internal:${(upstream.address() as any).port}`});
let desired:DesiredShard[]=['a','b','c'].map(id=>({id,accountId:id,provider:'openai',credentialRevision:'test-v1',accessToken:`test-${id}`}));
const lifecycle=new RelayFederationLifecycle(async()=>desired,driver);
const server=new RelayFederationServer(lifecycle,{secret,apiKeys:['test-client'],adminKeys:['test-admin'],port:0});
async function converge(predicate:()=>boolean,timeout=90000){const end=Date.now()+timeout;do{await lifecycle.reconcile();if(predicate())return;await new Promise(resolve=>setTimeout(resolve,500));}while(Date.now()<end);throw new Error(`Canary did not converge: ${JSON.stringify(lifecycle.snapshot())}`);}
try {
  await converge(()=>lifecycle.capabilities.eligible('B').length===2);
  let before=await driver.list();assert.equal(before.length,3);assert.equal(new Set(before.map(r=>r.shardId)).size,3);
  for(const handle of before){const state=await driver.inspect(handle);assert.equal(state.record?.shardId,handle.shardId);}
  const restarting = before.find(r=>r.shardId==='a')!;
  const staleRecord = (await driver.inspect(restarting)).record!;
  await promisify(execFile)('docker',['restart',restarting.id],{timeout:60000});
  await converge(()=>lifecycle.handle('a')?.generation!==restarting.generation && lifecycle.capabilities.eligible('B').length===2);
  assert.equal(lifecycle.capabilities.receive(staleRecord),false);
  before=await driver.list();
  await server.start();
  inventories.set('a',['A']);
  // The actual worker timer refreshes inventory; no controller-injected availability.
  await converge(()=>lifecycle.capabilities.eligible('B').length===1);
  const after=await driver.list();assert.deepEqual(after.map(r=>r.generation).sort(),before.map(r=>r.generation).sort());
  desired=desired.filter(s=>s.id!=='b');await converge(()=>lifecycle.capabilities.eligible('B').length===0);
  const response=await fetch(`http://127.0.0.1:${(server.server.address() as any).port}/v1/chat/completions`,{method:'POST',headers:{Authorization:'Bearer test-client','Content-Type':'application/json'},body:JSON.stringify({model:'B',messages:[{role:'user',content:'must not route'}]})});
  assert.equal(response.status,503);assert.equal((await response.json()).error.code,'model_temporarily_unavailable');
  assert(lifecycle.capabilities.select('A'));assert(lifecycle.capabilities.select('C'));
  inventories.set('a',['A','B']);await converge(()=>lifecycle.capabilities.eligible('B').length===1);
  assert.equal(lifecycle.handle('a')!.generation,before.find(r=>r.shardId==='a')!.generation);
  console.log(JSON.stringify({passed:true,namespace,containers:3,oneShardPerContainer:true,capabilityLossRestartedContainers:false,recoveredWithoutRestart:true,restartFencesOldHealth:true,missingModelStatus:503}));
} finally {await server.stop();await lifecycle.stop();const remaining=await driver.list();assert.equal(remaining.length,0);await new Promise<void>(resolve=>upstream.close(()=>resolve()));}
