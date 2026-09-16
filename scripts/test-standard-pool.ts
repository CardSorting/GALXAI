import { GalxAI } from '../src/sdk/client.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { StandardPoolScheduler } from '../src/relay/standard-pool-scheduler.js';
import { PoolRuntime } from '../src/relay/pool-runtime.js';
import { PoolExecution, type AssignedAccount } from '../src/relay/pool-execution.js';
import { CentralClient, hash, type PoolId } from '../src/relay/pool-protocol.js';
import { AgentRuntime } from '../src/sdk/agent.js';
import { ChatCompletionStream } from '../src/sdk/stream.js';
import { executeRelayChat, RelayDispatchError, publicRelayChatFailure } from '../src/core/router/adapters/RelayChatTransport.js';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';

async function until(predicate: () => boolean) {
  const end=performance.now()+3000;
  while (!predicate()) { if (performance.now()>end) throw Error('Fixture did not reach expected state'); await new Promise(r=>setTimeout(r,5)); }
}
async function listen(server: http.Server) { server.listen(0,'127.0.0.1'); await once(server,'listening'); return `http://127.0.0.1:${(server.address() as any).port}`; }
const close=(server:http.Server)=>new Promise<void>(r=>{server.closeAllConnections();server.close(()=>r());});

async function fixture(count=3,pool:PoolId='standard') {
  const directory=await mkdtemp(path.join(tmpdir(),'standard-rotation-'));
  const upstream=http.createServer(), wss=new WebSocketServer({server:upstream}), upstreamOrigin=await listen(upstream);
  const calls:Array<{accountId:string;socket:WebSocket}>=[], records=new Map<string,any>();
  const control={rejections:[] as any[],lookups:0,deny:false,acquisitions:0,finishFails:false,holdLookup:undefined as Promise<void>|undefined,behavior:(_socket:WebSocket,_payload:any)=>{}};
  wss.on('connection',(socket,req)=>socket.on('message',raw=>{calls.push({accountId:String(req.headers['chatgpt-account-id']),socket});control.behavior(socket,JSON.parse(String(raw)));}));
  const accounts:AssignedAccount[]=Array.from({length:count},(_,i)=>({id:`codex_sh_${i.toString(16).padStart(24,'0')}`,revision:1,assignmentRevision:1,credentialRevision:hash(`revision-${i}`),state:'enabled',desktopId:randomUUID(),models:['fixture-a','fixture-b'],expiresAtMs:Date.now()+600000,credential:{accessToken:`synthetic-token-${i}`,accountId:`account-${i}`}}));
  const store={call:async(action:string,b:any={})=>{
    if(action==='lookup'){control.lookups++;await control.holdLookup;return records.get(b.requestKey)??[...records.values()].find(r=>r.executionId===b.executionId&&r.tenantSha256===b.tenantSha256)??null;}
    if(action==='reserve'){assert(!records.has(b.requestKey));const r={...b,state:'reserved'};records.set(b.requestKey,r);return r;}
    const r=records.get(b.requestKey);
    if(action==='bind'){Object.assign(r,{state:'running',leaseId:b.leaseId});return r;}
    if(action==='finish'){if(control.finishFails)throw Error('fixture database unavailable');Object.assign(r,{state:b.success?'completed':'unknown',success:b.success});return r;}
    if(action==='pending')return [...records.values()].filter(r=>['completed','unknown'].includes(r.state)&&!r.settled&&r.leaseId);
    if(action==='settled'){r.settled=true;return r;}
    throw Error(`Unexpected fixture store action ${action}`);
  }};
  const central=new CentralClient('http://127.0.0.1:1',hash('principal'),{pool,installationId:randomUUID()},(async(url:any,init:any)=>{
    const body=JSON.parse(init.body);
    if(String(url).endsWith('/acquire')){control.acquisitions++;return Response.json(control.deny?{denied:true,reason:'SHARD_TOKEN_QUOTA_EXHAUSTED'}:{leaseId:randomUUID(),fencingToken:1,expiresAtMs:Date.now()+30000});}
    if(String(url).endsWith('/settle'))return Response.json({success:true});
    if(String(url).endsWith('/projection'))return Response.json({...central.identity,epoch:body.epoch,executionAllowed:true,accounts});
    if(String(url).endsWith('/credential_failed')){control.rejections.push(body);const account=accounts.find(a=>a.id===body.accountId)!;delete account.credential;account.revision++;return Response.json({recorded:true});}
    if(String(url).endsWith('/heartbeat')||String(url).endsWith('/acknowledge'))return Response.json({success:true});
    throw Error('Unexpected fixture central route');
  }) as typeof fetch);
  const execution=new PoolExecution(central,store), runtime=new PoolRuntime(execution,hash('inference'),directory), engines:GalxaiRelayServer[]=[];
  for(const account of accounts){
    const key=hash(account.id);
    const engine=new GalxaiRelayServer({assignedShardId:account.id,assignedShard:{id:account.id,...account.credential!},executionPolicy:execution.policy(account),host:'127.0.0.1',port:0,apiKeys:[key],adminApiKeys:[hash('admin')],registryEnabled:false,discoverHostCredentials:false,maxUpstreamRetries:0,forwardOutputTokenLimit:false,shardConcurrency:pool==='standard'?1:4,drainTimeoutMs:20,capabilityDiscovery:async()=>account.models,wsEndpoint:upstreamOrigin.replace('http:','ws:'),stateSnapshotPath:path.join(directory,account.id,'relay.json')});
    await engine.start();engines.push(engine);
    (runtime as any).workers.set(account.id,{account:{...account},engine,key,port:engine.listeningPort()});
  }
  (runtime as any).refreshedAt=Date.now();
  const origin=await listen(runtime.server), headers={Authorization:`Bearer ${hash('inference')}`,'Content-Type':'application/json','x-galx-tenant':hash('tenant')};
  const post=(key:string,extra:object={},signal?:AbortSignal)=>fetch(origin+'/v1/chat/completions',{method:'POST',signal,headers:{...headers,'Idempotency-Key':key},body:JSON.stringify({model:'fixture-a',messages:[{role:'user',content:key}],...extra})});
  return {directory,accounts,execution,runtime,engines,control,calls,records,origin,headers,post,cleanup:async()=>{control.holdLookup=undefined;await runtime.stop();await close(runtime.server);for(const socket of wss.clients)socket.terminate();await new Promise<void>(r=>wss.close(()=>r()));await close(upstream);await rm(directory,{recursive:true,force:true});}};
}

test('stalled submissions have per-owner bounds while another owner and recovery reads retain admission',async()=>{
  const f=await fixture(2);let release!:()=>void,rejected=0;
  f.control.holdLookup=new Promise<void>(r=>{release=r;});
  const pending=Array.from({length:16},(_,i)=>f.post(`burst-${i}`).then(r=>{if(r.status===503)rejected++;return r;}));
  try{
    await until(()=>rejected===8);assert.equal(f.control.lookups,8);
    const other=fetch(f.origin+'/v1/chat/completions',{method:'POST',headers:{...f.headers,'x-galx-tenant':hash('other-owner'),'Idempotency-Key':'other'},body:JSON.stringify({model:'fixture-a',messages:[{role:'user',content:'other'}]})});
    const status=fetch(f.origin+'/v1/jobs/missing',{headers:f.headers});
    await until(()=>f.control.lookups===10);release();
    assert.equal((await status).status,404);await other;
    const replies=await Promise.all(pending);assert.equal(replies.filter(r=>r.status===202).length<=2,true);
    assert.equal((f.runtime as any).submissions.owners.size,0);assert.equal((f.runtime as any).observations.owners.size,0);
  }finally{release();await Promise.allSettled(pending);await f.cleanup();}
});

test('fair rotation remains balanced across reordered candidates and simultaneous selections',()=>{
  const scheduler=new StandardPoolScheduler(), candidates=['a','b','c','d'].map(id=>({id,lastUsedAtMs:0})), counts=new Map<string,number>();
  for(let i=0;i<300;i++){
    const reservations=candidates.map(()=>scheduler.reserve(i%2?candidates:[...candidates].reverse())!);
    assert.equal(new Set(reservations.map(r=>r.candidate.id)).size,4);
    assert.equal(scheduler.reserve(candidates),undefined);
    for(const r of reservations){counts.set(r.candidate.id,(counts.get(r.candidate.id)??0)+1);r.release();}
  }
  assert.deepEqual([...counts.values()],[300,300,300,300]);
});

test('rotation spans model subsets, preserves eligibility churn, and seeds from checkpointed use',()=>{
  const scheduler=new StandardPoolScheduler(), a={id:'a',lastUsedAtMs:200}, b={id:'b',lastUsedAtMs:100}, c={id:'c',lastUsedAtMs:0};
  const pick=(cs:typeof a[])=>{const r=scheduler.reserve(cs)!;r.release();return r.candidate.id;};
  assert.equal(pick([a,b]),'b');assert.equal(pick([a,c]),'c');assert.equal(pick([b,a]),'a');
  scheduler.reconcile(new Set(['a','b','c']));
  assert.equal(pick([a,b]),'b');assert.equal(pick([a,b,c]),'c');
});

test('live fairness ignores clock changes and damaged history; a stale release cannot free a newer reservation',()=>{
  const scheduler=new StandardPoolScheduler();
  const accounts=[{id:'a',lastUsedAtMs:NaN},{id:'b',lastUsedAtMs:Infinity},{id:'c',lastUsedAtMs:Number.MAX_SAFE_INTEGER}];
  const first=scheduler.reserve(accounts)!;assert.equal(first.candidate.id,'a');first.release();
  const counts=new Map<string,number>();
  for(let i=0;i<300;i++){
    accounts[0].lastUsedAtMs=i%2?Number.MAX_SAFE_INTEGER:0;
    const current=scheduler.reserve(accounts)!;counts.set(current.candidate.id,(counts.get(current.candidate.id)??0)+1);current.release();
  }
  assert.deepEqual([...counts.values()],[100,100,100]);
  const newer=scheduler.reserve([accounts[0]])!;first.release();
  assert.equal(scheduler.reserve([accounts[0]]),undefined);newer.release();newer.release();
  assert(scheduler.reserve([accounts[0]]));
});

test('recovery starts have a pool-wide budget while healthy work stays available',()=>{
  let now=0;const scheduler=new StandardPoolScheduler(()=>now);
  const a={id:'a',lastUsedAtMs:0,recovering:true},b={id:'b',lastUsedAtMs:0,recovering:true},healthy={id:'healthy',lastUsedAtMs:0};
  const first=scheduler.reserve([a,b])!;assert.equal(first.candidate.id,'a');first.release();
  assert.equal(scheduler.reserve([b]),undefined);
  for(let i=0;i<50;i++){const r=scheduler.reserve([a,b,healthy])!;assert.equal(r.candidate.id,'healthy');r.release();}
  scheduler.reconcile(new Set(['a','b','healthy']));now=4999;assert.equal(scheduler.reserve([b]),undefined);
  now=5000;const second=scheduler.reserve([a,b,healthy])!;assert.equal(second.candidate.id,'b');second.release();
  assert.equal(scheduler.reserve([a]),undefined);
});

test('real Standard runtime admits one ongoing job per account and returns bounded private-free backpressure',async()=>{
  const f=await fixture();
  try{
    const replies=await Promise.all(Array.from({length:20},(_,i)=>f.post(`concurrent-${i}`)));
    assert.equal(replies.filter(r=>r.status===202).length,3);assert.equal(f.control.acquisitions,3);
    await until(()=>f.calls.length===3);assert.equal(new Set(f.calls.map(c=>c.accountId)).size,3);
    const busy=replies.find(r=>r.status===503)!;assert.equal(busy.headers.get('Retry-After'),'5');
    assert.deepEqual(await busy.json(),{error:{code:'service_busy',message:'This service is busy. Try again shortly.',execution_state:'not_accepted'}});
    assert.equal((await f.post('after-ack')).status,503,'202 must not release a running account');
    f.calls[0].socket.send(JSON.stringify({type:'response.completed'}));
    await until(()=>f.execution.standardAvailable(f.accounts[Number(f.calls[0].accountId.split('-')[1])].id));
    assert.equal((await f.post('after-completion')).status,202);await until(()=>f.calls.length===4);
    assert.equal(f.calls[3].accountId,f.calls[0].accountId);
  }finally{await f.cleanup();}
});

test('quota feedback ejects immediately, survives a checkpoint and admits only one recovery job',async()=>{
  const f=await fixture(1), realNow=Date.now;
  try{
    f.control.behavior=socket=>socket.send(JSON.stringify({type:'response.failed',response:{error:{code:'usage_limit_reached',retry_after_seconds:60}}}));
    assert.equal((await f.post('quota')).status,202);
    await until(()=>[...f.records.values()][0]?.state==='unknown');
    assert.equal((await f.post('skip-quota',{model:'fixture-b'})).status,503);assert.equal(f.calls.length,1);
    const snapshot=JSON.parse(await readFile(path.join(f.directory,f.accounts[0].id,'relay.json'),'utf8'));
    assert(snapshot.shards[0].cooldownUntilMs>=realNow()+59000);assert(!JSON.stringify(snapshot).includes('synthetic-token'));
    const internal=f.engines[0] as any;
    internal.shardsTable.clear();internal.recoverStateSnapshot();internal.installFleet([{id:f.accounts[0].id,...f.accounts[0].credential}]);
    assert.equal(f.engines[0].standardAvailability('fixture-a').eligible,false);
    const advanced=realNow()+61000;Date.now=()=>advanced;(f.runtime as any).refreshedAt=advanced;f.control.behavior=()=>{};
    const recovery=await Promise.all([f.post('probe-1'),f.post('probe-2')]);
    assert.deepEqual(recovery.map(r=>r.status).sort(),[202,503]);
    await until(()=>f.calls.length===2);assert.equal((await f.post('probe-overlap')).status,503);
    f.calls[1].socket.send(JSON.stringify({type:'response.completed'}));
    await until(()=>f.execution.standardAvailable(f.accounts[0].id));
    assert.equal(f.engines[0].standardAvailability('fixture-a').eligible,true);
  }finally{Date.now=realNow;await f.cleanup();}
});

test('a late successful sibling cannot reopen full capacity without a post-cooldown probe',async()=>{
  const f=await fixture(1,'premium'),realNow=Date.now;
  try{
    await Promise.all([f.post('quota-observer'),f.post('old-sibling')]);await until(()=>f.calls.length===2);
    f.calls[0].socket.send(JSON.stringify({type:'response.failed',response:{error:{code:'usage_limit_reached',retry_after_seconds:60}}}));
    await until(()=>[...f.records.values()].some(r=>r.state==='unknown'));
    const advanced=realNow()+61000;Date.now=()=>advanced;(f.runtime as any).refreshedAt=advanced;
    f.calls[1].socket.send(JSON.stringify({type:'response.completed'}));await until(()=>[...f.records.values()].every(r=>['completed','unknown'].includes(r.state)));
    assert.equal(f.engines[0].accountAvailability('fixture-a').recovering,true);
    const replies=await Promise.all([f.post('real-probe'),f.post('cannot-burst')]);assert.deepEqual(replies.map(r=>r.status).sort(),[202,503]);
    await until(()=>f.calls.length===3);f.calls[2].socket.send(JSON.stringify({type:'response.completed'}));
    await until(()=>!f.engines[0].accountAvailability('fixture-a').recovering);
  }finally{Date.now=realNow;await f.cleanup();}
});

test('transient failure cooldown survives a restart of the assigned engine',async()=>{
  const f=await fixture(1,'premium');
  try{
    const engine=f.engines[0] as any;
    for(let i=0;i<3;i++)engine.recordShardFailure(f.accounts[0].id);
    assert.equal(f.engines[0].accountAvailability('fixture-a').eligible,false);
    engine.shardsTable.clear();engine.recoverStateSnapshot();engine.installFleet([{id:f.accounts[0].id,...f.accounts[0].credential}]);
    assert.equal(f.engines[0].accountAvailability('fixture-a').eligible,false);
    assert.equal(f.engines[0].accountAvailability('fixture-a').recovering,true);
  }finally{await f.cleanup();}
});

test('current central cooldowns apply without restarting the engine or changing control revision',async()=>{
  const f=await fixture(2);
  try{
    f.accounts[0].cooldownUntilMs=Date.now()+60000;await f.runtime.sync();
    assert.equal((await f.post('central-cooldown')).status,202);await until(()=>f.calls.length===1);
    assert.equal(f.calls[0].accountId,'account-1');assert.equal((await f.post('all-unavailable')).status,503);
    f.accounts[0].cooldownUntilMs=0;await f.runtime.sync();
    assert.equal((await f.post('central-recovered')).status,202);await until(()=>f.calls.length===2);assert.equal(f.calls[1].accountId,'account-0');
  }finally{await f.cleanup();}
});

test('a quota-limited account is skipped for a different model while another free account serves',async()=>{
  const f=await fixture(2);
  try{
    f.control.behavior=socket=>socket.send(JSON.stringify({type:'rate_limits.updated',rate_limits:[{name:'requests',remaining:0,reset_seconds:90}]}));
    assert.equal((await f.post('limited')).status,202);await until(()=>f.calls.length===1);
    f.calls[0].socket.send(JSON.stringify({type:'response.completed'}));
    await until(()=>f.execution.standardAvailable(f.accounts[0].id));
    f.control.behavior=()=>{};
    assert.equal((await f.post('other-model',{model:'fixture-b'})).status,202);await until(()=>f.calls.length===2);
    assert.deepEqual(f.calls.map(c=>c.accountId),['account-0','account-1']);
    assert.equal((await f.post('both-ineligible')).status,503);
    assert.equal(f.control.acquisitions,2,'no retries or other account attempts for the first request');
  }finally{await f.cleanup();}
});

test('quota notices count once per job and a successful fallback probe clears old zero observations',async()=>{
  const f=await fixture(1),realNow=Date.now;
  try{
    f.control.behavior=socket=>{
      for(let i=0;i<20;i++)socket.send(JSON.stringify({type:'rate_limits.updated',rate_limits:[{name:'requests',remaining:0}]}));
      socket.send(JSON.stringify({type:'response.failed',response:{error:{code:'usage_limit_reached'}}}));
    };
    assert.equal((await f.post('repeated-quota')).status,202);
    await until(()=>[...f.records.values()][0]?.state==='unknown');
    const internal=f.engines[0] as any,limited=internal.shardsTable.get(f.accounts[0].id);
    assert.equal(limited.quotaFailures,1);assert(limited.cooldownUntilMs<=realNow()+60000);
    const advanced=realNow()+61000;Date.now=()=>advanced;(f.runtime as any).refreshedAt=advanced;
    f.control.behavior=socket=>socket.send(JSON.stringify({type:'response.completed'}));
    assert.equal((await f.post('fallback-probe')).status,202);
    await until(()=>f.execution.standardAvailable(f.accounts[0].id));
    assert.equal(f.engines[0].standardAvailability('fixture-a').recovering,false,'confirmed completion must clear recovery even when grant completion aborts synchronously');
    assert.equal(internal.shardsTable.get(f.accounts[0].id).providerLimits.length,0);
    const recovered=JSON.parse(await readFile(path.join(f.directory,f.accounts[0].id,'relay.json'),'utf8'));
    assert.equal(recovered.shards[0].quotaFailures,0,'checkpoint confirmed recovery, not only the previous exclusion');
    assert.equal((await f.post('normal-after-recovery')).status,202,'healthy traffic must not remain trapped in cooldown/probe pacing');
    await until(()=>f.calls.length===3);
  }finally{Date.now=realNow;await f.cleanup();}
});

test('fresh exhausted limits during a recovery job preserve the new deadline after successful output',async()=>{
  const f=await fixture(1),realNow=Date.now;
  try{
    f.control.behavior=socket=>{socket.send(JSON.stringify({type:'rate_limits.updated',rate_limits:[{name:'requests',remaining:0}]}));socket.send(JSON.stringify({type:'response.completed'}));};
    assert.equal((await f.post('first-limit')).status,202);await until(()=>f.execution.standardAvailable(f.accounts[0].id));
    const advanced=realNow()+61000;Date.now=()=>advanced;(f.runtime as any).refreshedAt=advanced;
    f.control.behavior=socket=>{socket.send(JSON.stringify({type:'rate_limits.updated',rate_limits:[{name:'requests',remaining:0,reset_seconds:600}]}));socket.send(JSON.stringify({type:'response.completed'}));};
    assert.equal((await f.post('fresh-limit')).status,202);await until(()=>f.execution.standardAvailable(f.accounts[0].id));
    const state=(f.engines[0] as any).shardsTable.get(f.accounts[0].id);
    assert.equal(state.quotaFailures,2);assert.equal(state.cooldownUntilMs,advanced+600000);
    assert.equal((await f.post('must-wait')).status,503);assert.equal(f.calls.length,2);
  }finally{Date.now=realNow;await f.cleanup();}
});

test('late quota observations extend their deadline without treating one job as several failures',async()=>{
  const f=await fixture(1),realNow=Date.now;
  try{
    const internal=f.engines[0] as any,accountId=f.accounts[0].id,first=realNow();
    Date.now=()=>first;internal.recordQuotaFailure(accountId,undefined,false,'same-job');
    Date.now=()=>first+61000;internal.recordQuotaFailure(accountId,undefined,false,'same-job');
    const state=internal.shardsTable.get(accountId);assert.equal(state.quotaFailures,1);assert.equal(state.cooldownUntilMs,first+121000);
    internal.recordQuotaFailure(accountId,first+600000,false,'same-job');
    internal.recordQuotaFailure(accountId,first+200000,false,'same-job');
    assert.equal(internal.shardsTable.get(accountId).cooldownUntilMs,first+600000,'a later shorter hint cannot clear the longer deadline');
  }finally{Date.now=realNow;await f.cleanup();}
});

test('real runtime paces simultaneous quota recoveries without withholding healthy capacity',async()=>{
  const f=await fixture(3),realNow=Date.now;let monotonic=0;
  try{
    (f.runtime as any).standard=new StandardPoolScheduler(()=>monotonic);
    f.control.behavior=socket=>socket.send(JSON.stringify({type:'response.failed',response:{error:{code:'usage_limit_reached',retry_after_seconds:60}}}));
    assert.equal((await f.post('limit-a')).status,202);await until(()=>[...f.records.values()][0]?.state==='unknown');
    assert.equal((await f.post('limit-b')).status,202);await until(()=>[...f.records.values()][1]?.state==='unknown');
    const advanced=realNow()+61000;Date.now=()=>advanced;(f.runtime as any).refreshedAt=advanced;f.control.behavior=()=>{};
    const burst=await Promise.all([f.post('recovery-a'),f.post('recovery-b'),f.post('healthy')]);
    assert.deepEqual(burst.map(r=>r.status).sort(),[202,202,503]);await until(()=>f.calls.length===4);
    assert.equal(new Set(f.calls.slice(2).map(c=>c.accountId)).size,2);
    const healthy=f.calls.slice(2).find(c=>c.accountId==='account-2')!;assert(healthy);
    healthy.socket.send(JSON.stringify({type:'response.completed'}));await until(()=>f.execution.standardAvailable(f.accounts[2].id));
    assert.equal((await f.post('healthy-continues')).status,202);await until(()=>f.calls.length===5);assert.equal(f.calls[4].accountId,'account-2');
    monotonic=5000;assert.equal((await f.post('next-recovery')).status,202);await until(()=>f.calls.length===6);
    assert.equal(f.calls[5].accountId,'account-1');
  }finally{Date.now=realNow;await f.cleanup();}
});

test('central denials back off without retrying or reserving against another account',async()=>{
  const f=await fixture(2), realNow=Date.now;
  try{
    f.control.deny=true;
    assert.equal((await f.post('denied-1')).status,503);assert.equal(f.control.acquisitions,1);
    assert.equal((await f.post('denied-2')).status,503);assert.equal(f.control.acquisitions,2);
    assert.equal((await f.post('blocked')).status,503);assert.equal(f.control.acquisitions,2);assert.equal(f.calls.length,0);
    const advanced=realNow()+61000;Date.now=()=>advanced;(f.runtime as any).refreshedAt=advanced;
    assert.equal((await f.post('retry-admission')).status,503);assert.equal(f.control.acquisitions,3);
    assert.equal(f.execution.standardAvailable(f.accounts[0].id,advanced+61000),false,'second denial backs off for two minutes');
    assert.equal(f.execution.standardAvailable(f.accounts[0].id,advanced+120001),true);
  }finally{Date.now=realNow;await f.cleanup();}
});

test('replay and conflicting keys never consume another rotation slot; duplicates cannot unlock the original',async()=>{
  const f=await fixture(2);
  try{
    let release!:()=>void;f.control.holdLookup=new Promise<void>(r=>{release=r;});
    const original=f.post('same');await until(()=>(f.runtime as any).pending.size===1);
    assert.equal((await f.post('same')).status,409);assert.equal((await f.post('same')).status,409);
    assert.equal((f.runtime as any).pending.size,1);release();f.control.holdLookup=undefined;
    const accepted=await original;assert.equal(accepted.status,202);const job=await accepted.json();
    assert.equal((await f.post('same',{model:'fixture-b'})).status,409);
    const replay=await f.post('same');assert.equal(replay.status,202);assert.equal((await replay.json()).id,job.id);
    assert.equal(f.control.acquisitions,1);assert.equal((await f.post('next')).status,202);await until(()=>f.calls.length===2);
    assert.deepEqual(f.calls.map(c=>c.accountId),['account-0','account-1']);
  }finally{await f.cleanup();}
});

test('failed terminal persistence and missing original engines cannot trigger new execution',async()=>{
  const f=await fixture(2);
  try{
    f.control.finishFails=true;f.control.behavior=socket=>socket.send(JSON.stringify({type:'response.completed'}));
    assert.equal((await f.post('persist')).status,202);await until(()=>f.execution.standardAvailable(f.accounts[0].id));
    assert.equal((await f.post('while-unsettled')).status,503);assert.equal(f.control.acquisitions,1);
    f.control.finishFails=false;await f.execution.settlePending();
    (f.runtime as any).workers.delete(f.accounts[0].id);
    assert.equal((await f.post('persist')).status,409);assert.equal(f.control.acquisitions,1);
    await f.engines[0].stop();
  }finally{await f.cleanup();}
});

test('caller cancellation during lookup releases bookkeeping without reserving or rotating an account',async()=>{
  const f=await fixture(2);
  try{
    let release!:()=>void,closed=false;f.control.holdLookup=new Promise<void>(r=>{release=r;});
    f.runtime.server.once('request',(_req,res)=>res.once('close',()=>{closed=true;}));
    const controller=new AbortController(),request=f.post('abandoned',{},controller.signal).catch(()=>null);
    await until(()=>(f.runtime as any).pending.size===1);controller.abort();await request;await until(()=>closed);
    release();f.control.holdLookup=undefined;await until(()=>(f.runtime as any).pending.size===0);
    assert.equal(f.control.acquisitions,0);assert.equal(f.records.size,0);assert.equal(f.calls.length,0);
    assert.equal((await f.post('next-live-request')).status,202);await until(()=>f.calls.length===1);assert.equal(f.calls[0].accountId,'account-0');
  }finally{await f.cleanup();}
});

test('readiness is rechecked after a delayed lookup and future heartbeats do not authorize work',async()=>{
  const f=await fixture(1);
  try{
    let release!:()=>void;f.control.holdLookup=new Promise<void>(r=>{release=r;});
    const request=f.post('slow-lookup');await until(()=>(f.runtime as any).pending.size===1);
    (f.runtime as any).refreshedAt=Date.now()-21000;release();f.control.holdLookup=undefined;
    assert.equal((await request).status,503);assert.equal(f.control.acquisitions,0);assert.equal(f.records.size,0);
    (f.runtime as any).refreshedAt=Date.now()+60000;assert.equal((await f.post('future-heartbeat')).status,503);
    assert.equal(f.control.acquisitions,0);
  }finally{await f.cleanup();}
});

test('Standard rejects hosted tools before selection; Premium retains overlapping admission',async()=>{
  const standard=await fixture(1);
  try{assert.equal((await standard.post('forbidden',{tools:[{type:'image_generation'}]})).status,403);assert.equal(standard.control.acquisitions,0);assert.equal(standard.calls.length,0);}
  finally{await standard.cleanup();}
  const premium=await fixture(1,'premium');
  try{assert.deepEqual((await Promise.all([premium.post('one'),premium.post('two')])).map(r=>r.status),[202,202]);assert.equal(premium.control.acquisitions,2);}
  finally{await premium.cleanup();}
});


for (const pool of ['standard','premium'] as const) for (const streaming of [false,true]) {
  test(`${pool} automatically completes a function-tool chain over ${streaming?'streaming':'JSON'} relay transport`,async()=>{
    const f=await fixture(2,pool), payloads:any[]=[], wires:string[]=[], executed:string[]=[];
    try {
      f.control.behavior=(socket,payload)=>{
        payloads.push(payload);
        const results=payload.input.filter((x:any)=>x.type==='function_call_output');
        const step=results.length;
        assert.equal(payload.tool_choice,'auto');
        assert.deepEqual(payload.tools.map((x:any)=>x.name),['lookup','combine']);
        assert(payload.instructions.includes('authorized for automatic execution'));
        if(step<2){
          socket.send(JSON.stringify({type:'response.function_call_arguments.delta',delta:'PARTIAL_ARGUMENT_SENTINEL'}));
          socket.send(JSON.stringify({type:'response.completed',response:{status:'completed',output:[{type:'function_call',call_id:`call_${step}`,name:step?'combine':'lookup',arguments:JSON.stringify({value:step+1}),credential:'PRIVATE_TOOL_METADATA'}]}}));
        }else{
          assert.deepEqual(results.map((x:any)=>x.call_id),['call_0','call_1']);
          assert.deepEqual(results.map((x:any)=>JSON.parse(x.output)),[{value:2},{value:3}]);
          socket.send(JSON.stringify({type:'response.output_text.delta',delta:'Completed automatically'}));
          socket.send(JSON.stringify({type:'response.completed',response:{status:'completed',output:[]}}));
        }
      };
      const send=async(request:any)=>{
        const result=await executeRelayChat({url:f.origin,key:hash('inference'),tenant:'tenant',idempotencyKey:request.turn_id,payload:request,ttftTimeoutMs:3000});
        const wire=await result.response.text();wires.push(wire);return wire;
      };
      const completions={
        create:async(request:any)=>JSON.parse(await send(request)),
        stream:(request:any)=>new ChatCompletionStream((async function*(){
          const wire=await send({...request,stream:true});
          for(const frame of wire.split('\n\n'))if(frame.startsWith('data: ')&&frame!=='data: [DONE]')yield JSON.parse(frame.slice(6));
        })()),
      };
      const agent=new AgentRuntime(completions as any,{model:'fixture-a',maxSteps:4,tools:Object.fromEntries(['lookup','combine'].map(name=>[name,{parameters:{type:'object',properties:{value:{type:'number'}},required:['value']},execute:({value}:any)=>{executed.push(name);return {value:value+1};}}]))});
      let final:any;
      if(streaming){for await(const event of agent.stream('Finish the task'))if(event.type==='finish')final=event.result;}
      else final=await agent.run('Finish the task');
      assert.equal(final.text,'Completed automatically');assert.equal(final.stepsCount,3);assert.deepEqual(executed,['lookup','combine']);
      assert.equal(payloads.length,3);assert.equal(f.control.acquisitions,3);
      assert(!wires.join('').includes('PRIVATE_TOOL_METADATA'));assert(!wires.join('').includes('PARTIAL_ARGUMENT_SENTINEL'));
      if(pool==='standard')assert.notEqual(f.calls[0].accountId,f.calls[1].accountId,'tool continuation still uses Standard fair admission');
    }finally{await f.cleanup();}
  });
}

test('tool contracts reject orphan results, hosted tools and incomplete output before callback execution',async()=>{
  const f=await fixture(1);
  const tools=[{type:'function',function:{name:'lookup',parameters:{type:'object',properties:{}}}}];
  try {
    for(const body of [{tools,messages:[{role:'tool',content:'x',tool_call_id:'orphan'}]},{tools:[{type:'mcp',server_url:'https://private.invalid'}]},{tools,tool_choice:{type:'function',function:{name:'missing'}}}])assert([400,403].includes((await f.post(randomUUID(),body)).status));
    assert.equal(f.control.acquisitions,0);assert.equal(f.calls.length,0);
    for(const output of [
      {status:'incomplete',output:[{type:'function_call',call_id:'call_1',name:'lookup',arguments:'{}'}]},
      {status:'completed',output:[{type:'function_call',call_id:'call_1',name:'unregistered',arguments:'{}'}]},
      {status:'completed',output:[{type:'mcp_approval_request',approval_request_id:'PRIVATE_APPROVAL'}]},
    ]){
      f.control.behavior=socket=>socket.send(JSON.stringify({type:'response.completed',response:output}));
      const result=await f.post(randomUUID(),{tools});assert.equal(result.status,202);const job=await result.json();
      const stream=await (await fetch(f.origin+job.streamUrl,{headers:f.headers})).text();
      assert(!stream.includes('tool_calls'));assert(!stream.includes('PRIVATE_APPROVAL'));assert(stream.includes('request_failed'));
      await until(()=>f.execution.standardAvailable(f.accounts[0].id));
    }
  }finally{await f.cleanup();}
});

for(const pool of ['standard','premium'] as const) test(`${pool} rejected sign-in is fenced immediately, reported with its revision and removed from readiness`,async()=>{
  const f=await fixture(1,pool);
  try{
    f.control.behavior=socket=>socket.send(JSON.stringify({type:'response.failed',response:{error:{code:'invalid_api_key',message:'synthetic rejection'}}}));
    assert.equal((await f.post('rejected-token')).status,202);
    await until(()=>f.engines[0].credentialRejected());
    assert.equal((await fetch(f.origin+'/health/ready')).status,503);
    assert.equal((await f.post('no-reuse')).status,503);
    await f.runtime.sync();
    assert.equal(f.control.rejections.length,1);
    assert.equal(f.control.rejections[0].credentialRevision,hash('revision-0'));
    assert.equal(f.control.rejections[0].revision,1);
    assert.equal((f.runtime as any).workers.size,0);
    assert.equal(f.calls.length,1);
    // The same credential remains rejected across restarts; only replacement
    // credentials may clear the checkpointed rejection for this account identity.
    const config=(f.engines[0] as any).config;
    for(const [accessToken,rejected] of [['synthetic-token-0',true],['fresh-synthetic-token',false]] as const){
      const restarted=new GalxaiRelayServer({...config,assignedShard:{id:f.accounts[0].id,accountId:'account-0',accessToken}});
      try{await restarted.start();assert.equal(restarted.credentialRejected(),rejected);}
      finally{await restarted.stop();}
    }
  }finally{await f.cleanup();}
});

test('Premium shared-account exhaustion contains all sessions, retains cooldown and exposes only safe continuation',async()=>{
  const f=await fixture(2,'premium');
  try{
    const requests=await Promise.all(Array.from({length:8},(_,i)=>fetch(f.origin+'/v1/chat/completions',{method:'POST',headers:{...f.headers,'x-galx-tenant':hash(`owner-${i}`),'Idempotency-Key':`shared-${i}`},body:JSON.stringify({model:'fixture-a',messages:[{role:'user',content:`work-${i}`}]})})));
    assert.equal(requests.filter(r=>r.status===202).length,8);
    const jobs=await Promise.all(requests.map(r=>r.json()));
    await until(()=>f.calls.length===8);
    assert.equal(f.calls.filter(c=>c.accountId==='account-0').length,4);
    for(const call of f.calls.filter(c=>c.accountId==='account-0'))call.socket.send(JSON.stringify({type:'response.failed',response:{error:{code:'usage_limit_reached',retry_after_seconds:60,message:'private upstream detail'}}}));
    await until(()=>f.engines[0].accountAvailability('fixture-a').recovering);
    assert.equal((await f.post('blocked-after-quota')).status,503,'exhausted account and busy healthy account cannot accumulate a queue');
    for(const call of f.calls.filter(c=>c.accountId==='account-1'))call.socket.send(JSON.stringify({type:'response.completed'}));
    await until(()=>f.engines[1].accountAvailability('fixture-a').availableSlots===4);
    assert.equal((await f.post('healthy-continues')).status,202);await until(()=>f.calls.length===9);
    assert.equal(f.calls[8].accountId,'account-1');
    const saved=JSON.parse(await readFile(path.join(f.directory,f.accounts[0].id,'relay.json'),'utf8'));
    assert(saved.shards[0].cooldownUntilMs>Date.now()+58000);
    const internal=f.engines[0] as any;internal.shardsTable.clear();internal.recoverStateSnapshot();internal.installFleet([{id:f.accounts[0].id,...f.accounts[0].credential}]);
    assert.equal(f.engines[0].accountAvailability('fixture-b').eligible,false,'restart/model change cannot reopen account');
    // Owner identity is still checked even though all jobs share two provider accounts.
    assert.equal((await fetch(f.origin+jobs[0].statusUrl,{headers:{...f.headers,'x-galx-tenant':hash('owner-other')}})).status,404);
    const record=[...f.records.values()].find(r=>r.accountId===f.accounts[0].id)!;
    const owner=Array.from({length:8},(_,i)=>i).find(i=>hash(hash(`owner-${i}`))===record.tenantSha256)!;
    const stream=await fetch(f.origin+`/v1/jobs/${record.executionId}/stream`,{headers:{...f.headers,'x-galx-tenant':hash(`owner-${owner}`)}});
    const raw=await stream.text();assert(raw.includes('"execution_state":"failed"'));assert(!/private upstream|usage_limit|account-0/.test(raw));
    assert.equal(f.control.acquisitions,9,'no automatic failover of accepted work');
  }finally{await f.cleanup();}
});

for(const pool of ['premium','standard'] as const)test(`${pool} rejects unbounded continuation and unsupported strict caps before reservation`,async()=>{
  const f=await fixture(1,pool);let outputLimit:any;
  try{
    f.control.behavior=(socket,payload)=>{outputLimit=payload.response?.max_output_tokens??payload.max_output_tokens;socket.send(JSON.stringify({type:'response.completed'}));};
    for(const body of [{messages:[{role:'user',content:'x'.repeat(262145)}]},{max_tokens:1000000}]){
      const response=await f.post(randomUUID(),body);assert.equal(response.status,400);assert.equal((await response.json()).error.execution_state,'not_accepted');
    }
    assert.equal(f.control.acquisitions,0);assert.equal(f.records.size,0);
    const strict=await f.post('strict-cap',{require_output_limit:true,durable_receipt:true,max_tokens:64});
    assert.equal(strict.status,pool==='premium'?400:403);assert.equal(strict.headers.get('x-should-retry'),'false');
    assert.equal(f.control.acquisitions,0);assert.equal(f.records.size,0);
    assert.equal((await f.post('bounded')).status,202);await until(()=>f.calls.length===1);assert.equal(outputLimit,undefined);
  }finally{await f.cleanup();}
});

for(const pool of ['premium','standard'] as const)for(const mode of ['text','multibyte','reasoning','tool-delta','tool-terminal'])
test(`${pool} local output budget stops ${mode} overflow without retries or a successful receipt`,async()=>{
  const f=await fixture(1,pool);
  try{
    f.control.behavior=(socket,payload)=>{
      assert.equal(payload.max_output_tokens,undefined);
      const type=mode==='reasoning'?'response.reasoning_summary_text.delta':mode==='tool-delta'?'response.function_call_arguments.delta':'response.output_text.delta';
      if(mode!=='tool-terminal')socket.send(JSON.stringify({type,delta:mode==='multibyte'?'😀'.repeat(17):'x'.repeat(65)}));
      socket.send(JSON.stringify({type:'response.completed',response:{status:'completed',usage:{input_tokens:10,output_tokens:20,total_tokens:30},
        ...(mode==='tool-terminal'?{output:[{type:'function_call',call_id:'call_one',name:'lookup',arguments:JSON.stringify({x:'y'.repeat(80)})}]}:{})}}));
    };
    const tools=mode==='tool-terminal'?[{type:'function',function:{name:'lookup',parameters:{type:'object',properties:{x:{type:'string'}},required:['x']}}}]:undefined;
    const accepted=await f.post('overflow',{max_tokens:64,...(tools?{tools}:{durable_receipt:true})});assert.equal(accepted.status,202);const job=await accepted.json();
    await until(()=>[...f.records.values()].some(r=>r.state==='unknown'));
    const raw=await(await fetch(f.origin+job.streamUrl,{headers:f.headers})).text();
    assert(raw.includes('request_failed'));assert(!raw.includes('[DONE]'));assert(!raw.includes('"finish_reason":"stop"'));
    assert(!raw.includes('output_limit_exceeded'));assert(!raw.includes('"tool_calls"'));
    assert.equal(f.calls.length,1);assert.equal(f.control.acquisitions,1);
    if(!tools){const receipt=await(await fetch(f.origin+`/v1/jobs/${job.id}/receipt`,{headers:f.headers})).json();assert.equal(receipt.status,'unknown');assert.equal(receipt.usage,null);}
    assert.equal(f.engines[0].accountAvailability('fixture-a').recovering,false);
    f.control.behavior=socket=>{socket.send(JSON.stringify({type:'response.output_text.delta',delta:'RELAY_OK'}));socket.send(JSON.stringify({type:'response.completed',response:{status:'completed',usage:{input_tokens:10,output_tokens:4,total_tokens:14}}}));};
    const next=await f.post('new-small-work',{max_tokens:64,durable_receipt:true});assert.equal(next.status,202);const nextJob=await next.json();
    await until(()=>[...f.records.values()].some(r=>r.state==='completed'));
    const receipt=await(await fetch(f.origin+`/v1/jobs/${nextJob.id}/receipt`,{headers:f.headers})).json();assert.equal(receipt.status,'completed');assert.equal(receipt.output,'RELAY_OK');assert.equal(receipt.usage.total_tokens,14);
    assert.equal(f.calls.length,2);
  }finally{await f.cleanup();}
});

test('Premium recovery is paced across accounts while healthy concurrency remains available',async()=>{
  const f=await fixture(3,'premium');
  try{
    for(const engine of f.engines.slice(0,2)){const e=engine as any,s=e.shardsTable.getAll()[0];e.shardsTable.put(s.id,{...s,quotaFailures:1,cooldownUntilMs:Date.now()-1000,providerLimits:[]});}
    assert.equal((await f.post('recovery-first')).status,202);await until(()=>f.calls.length===1);assert.equal(f.calls[0].accountId,'account-0');
    const healthy=await Promise.all(Array.from({length:4},(_,i)=>f.post(`healthy-${i}`)));assert(healthy.every(r=>r.status===202));await until(()=>f.calls.length===5);
    assert(f.calls.slice(1).every(c=>c.accountId==='account-2'));
    assert.equal((await f.post('no-second-probe')).status,503);
    assert.equal(f.control.acquisitions,5);
  }finally{await f.cleanup();}
});

for(const streaming of [false,true])test(`real SDK ${streaming?'SSE':'JSON'} pauses on shared quota and resumes from committed tools on eligible capacity`,async(t)=>{
  const f=await fixture(2,'premium');let callbacks=0;const payloads:any[]=[];
  try{
    f.control.behavior=(socket,payload)=>{
      payloads.push(payload);
      if(payloads.length===1)socket.send(JSON.stringify({type:'response.completed',response:{status:'completed',output:[{type:'function_call',call_id:'committed-once',name:'work',arguments:'{}'}]}}));
      else if(payloads.length===2)socket.send(JSON.stringify({type:'response.failed',response:{error:{code:'usage_limit_reached',retry_after_seconds:60}}}));
      else{assert(payload.input.some((i:any)=>i.type==='function_call_output'&&i.output==='committed'));
        socket.send(JSON.stringify({type:'response.output_text.delta',delta:'Resumed'}));socket.send(JSON.stringify({type:'response.completed',response:{status:'completed',output:[]}}));}
    };
    const client=new GalxAI({apiKey:'fixture',baseURL:'https://fixture.test',fetch:async(_url,init)=>{
      const payload=JSON.parse(String(init?.body));
      try{return(await executeRelayChat({url:f.origin,key:hash('inference'),tenant:'tenant',idempotencyKey:payload.turn_id,payload,ttftTimeoutMs:3000})).response;}
      catch(e){if(e instanceof RelayDispatchError)return Response.json(publicRelayChatFailure(e),{status:503,headers:{'X-Should-Retry':'false'}});throw e;}
    }});
    const session=client.agent({model:'fixture-a',maxSteps:4,tools:{work:()=>{callbacks++;return 'committed';}}}).startSession();
    await assert.rejects(async()=>{if(streaming){for await(const _ of session.stream('Work')){}}else await session.run('Work');},(e:any)=>e.recovery==='wait');
    assert.equal(callbacks,1);assert.equal(payloads.length,2);
    assert.equal(session.getRecovery().action,'wait');await assert.rejects(()=>session.resume(),(e:any)=>e.code==='continuation_wait');assert.equal(payloads.length,2);
    const realNow=Date.now,offset=session.export().checkpoint!.retryAtMs!-realNow()+1;t.mock.method(Date,'now',()=>realNow()+offset);
    let result:any;if(streaming){for await(const e of session.resumeStream())if(e.type==='finish')result=e.result;}else result=await session.resume();assert.equal(result.text,'Resumed');assert.equal(callbacks,1);assert.equal(payloads.length,3);
    assert.deepEqual(f.calls.map(c=>c.accountId),['account-0','account-1','account-0']);
  }finally{await f.cleanup();}
});
