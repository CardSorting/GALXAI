import { installTestCapabilities, testModels } from './relay-test-capabilities.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PassThrough } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';
import { RetryBudget, readJsonBody } from '../src/relay/request-policy.js';

async function fixture(extra: Record<string, unknown> = {}) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'relay-hardening-'));
 const ws=new WebSocketServer({port:0,host:'127.0.0.1'});await new Promise<void>(r=>ws.once('listening',r));
 const relay=new GalxaiRelayServer({ testOnlyMultiShard: true, capabilityDiscovery: async () => testModels,port:0,host:'127.0.0.1',registryEnabled:false,discoverHostCredentials:false,shardsJsonPath:path.join(dir,'absent'),stateSnapshotPath:path.join(dir,'snapshot'),wsEndpoint:`ws://127.0.0.1:${(ws.address() as any).port}`,drainTimeoutMs:10,retryBaseDelayMs:1,retryMaxDelayMs:2,...extra});
 const internals=relay as any;installTestCapabilities(internals);internals.installFleet([0,1,2].map(i=>({id:`shard-${i}`,accountId:`account-${i}`,accessToken:`secret-${i}`})));await relay.start();
 return {relay,internals,ws,base:`http://127.0.0.1:${internals.server.address().port}`,close:async()=>{await relay.stop();for(const c of ws.clients)c.terminate();await new Promise<void>(r=>ws.close(()=>r()));fs.rmSync(dir,{recursive:true,force:true})}};
}
async function until(predicate:()=>boolean){const deadline=Date.now()+2000;while(!predicate()){assert(Date.now()<deadline,'state did not settle');await new Promise(r=>setTimeout(r,5))}}
const body={model:'test-model',messages:[{role:'user',content:'same content'}]};
function submit(base:string,key='key-a',value:unknown=body){return fetch(base+'/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','X-Tenant-Id':'spoofed-shared-tenant'},body:JSON.stringify(value)})}

test('API principals isolate deduplication, job reads, streams and cancellation',async()=>{
 const f=await fixture({apiKeys:['key-a','key-b']});try{
 const a=await(await submit(f.base)).json(), b=await(await submit(f.base,'key-b')).json();assert.notEqual(a.id,b.id);
 const duplicate=await(await submit(f.base)).json();assert.equal(duplicate.id,a.id);
 const effort=await(await submit(f.base,'key-a',{...body,reasoning_effort:'low'})).json();assert.notEqual(effort.id,a.id);
 for(const [suffix,method] of [['','GET'],['/stream','GET'],['/cancel','POST']]){
 const r=await fetch(f.base+'/v1/jobs/'+a.id+suffix,{method,headers:{Authorization:'Bearer key-b'}});assert.equal(r.status,404);
 }
 const own=await fetch(f.base+'/v1/jobs/'+a.id,{headers:{Authorization:'Bearer key-a'}});assert.equal(own.status,200);
 }finally{await f.close()}
});
test('malformed requests are rejected before consuming shard capacity',async()=>{
 const f=await fixture();try{for(const value of [null,[],{}, {model:5,messages:[]},{model:'test',messages:'text'},{...body,max_tokens:-1},{...body,messages:[{role:'tool',content:'result'}]}]){assert.equal((await submit(f.base,'',value)).status,400)}assert.equal(f.internals.jobsTable.count(),0);assert(f.internals.shardsTable.getAll().every((s:any)=>s.inFlight===0))}finally{await f.close()}
});
test('permanent provider errors do not retry or quarantine healthy shards; sessions expire',async()=>{
 const f=await fixture({jobTokenRetentionMs:40});let connections=0;f.ws.on('connection',s=>{connections++;s.on('message',()=>s.send(JSON.stringify({type:'error',error:{code:'invalid_request_error'}})))});
 try{const job=await(await submit(f.base)).json();await until(()=>f.internals.jobsTable.get(job.id)?.status==='failed');assert.equal(connections,1);assert.equal(f.internals.sessions.size,0);assert(f.internals.shardsTable.getAll().every((s:any)=>s.inFlight===0&&s.consecutiveFailures===0));await until(()=>!f.internals.jobsTable.get(job.id))}finally{await f.close()}
});
test('image wall deadline closes the transport, returns capacity and stops attempts',async()=>{
 const f=await fixture({jobMaxWallTimeMs:50});let connections=0;f.ws.on('connection',()=>connections++);
 try{const r=await fetch(f.base+'/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'test',model:'test-model'})});assert.equal(r.status,502);assert.equal(connections,1);assert.equal(f.internals.imageControllers.size,0);assert(f.internals.shardsTable.getAll().every((s:any)=>s.inFlight===0));const data=await(await fetch(f.base+'/api/telemetry')).json();assert.equal(data.traces[0].error,'image_wall_time_exceeded');assert.equal(data.traces[0].layer,'relay')}finally{await f.close()}
});
test('retry credits bound outage amplification and recover over time or success',()=>{let now=0;const b=new RetryBudget(()=>now);for(let i=0;i<20;i++)assert(b.take());assert(!b.take());now=10000;assert(b.take());assert(!b.take());b.success();assert(b.take())});
test('body parser preserves split UTF-8 and enforces byte and time limits',async()=>{
 const stream=new PassThrough(), bytes=Buffer.from(JSON.stringify({text:'你好'}));const parsed=readJsonBody(stream as unknown as IncomingMessage,100,1000);for(const b of bytes)stream.write(Buffer.from([b]));stream.end();assert.deepEqual(await parsed,{text:'你好'});
 const large=new PassThrough();const limited=readJsonBody(large as unknown as IncomingMessage,3,1000);large.end('12345');await assert.rejects(limited,{status:413});
 const slow=new PassThrough();await assert.rejects(readJsonBody(slow as unknown as IncomingMessage,100,5),{status:408});slow.end();
});

test('bounded replay returns an explicit conflict instead of silently omitting earlier output',async()=>{
 const f=await fixture({maxBufferedTokensPerJob:2});f.ws.on('connection',s=>s.on('message',()=>{for(let i=0;i<4;i++)s.send(JSON.stringify({type:'response.output_text.delta',delta:`chunk ${i}`}));s.send(JSON.stringify({type:'response.completed'}))}));
 try{const job=await(await submit(f.base)).json();await until(()=>f.internals.jobsTable.get(job.id)?.status==='completed');assert.equal(f.internals.tokensTable.count(),2);
 assert.equal((await fetch(f.base+job.streamUrl)).status,409);
 assert.equal((await fetch(f.base+job.streamUrl,{headers:{'Last-Event-ID':'-1'}})).status,400);
 const r=await fetch(f.base+job.streamUrl,{headers:{'Last-Event-ID':'2'}});assert.equal(r.status,200);const stream=await r.text();assert(stream.includes('chunk 2'));assert(stream.includes('[DONE]'));
 }finally{await f.close()}
});
test('concurrent image idempotency prevents duplicate dispatch and conflicting cached reuse',async()=>{
 const f=await fixture();let calls=0,complete:()=>void=()=>{};
 f.internals.synthesizeImageWithFailover=async()=>{calls++;await new Promise<void>(r=>complete=r);return {result:{b64_json:'test'},shardId:'shard-0'}};
 const submitImage=(prompt:string)=>fetch(f.base+'/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'image-key'},body:JSON.stringify({prompt})});
 try{const first=submitImage('same');await until(()=>calls===1);const pending=await submitImage('same');assert.equal(pending.status,409);assert.equal(pending.headers.get('retry-after'),'2');assert.equal(calls,1);complete();assert.equal((await first).status,200);assert.equal((await submitImage('same')).status,200);assert.equal(calls,1);assert.equal((await submitImage('different')).status,409);
 }finally{complete();await f.close()}
});

test('cancellation during backoff cannot release another job capacity on the failed shard',async()=>{
 const f=await fixture({retryBaseDelayMs:10000,retryMaxDelayMs:10000});
 f.internals.installFleet([{id:'only-shard',accountId:'only-account',accessToken:'test'}]);const sockets:any[]=[];f.ws.on('connection',s=>sockets.push(s));
 try{const a=await(await submit(f.base)).json();const b=await(await submit(f.base,'key-a',{...body,messages:[{role:'user',content:'other'}]})).json();await until(()=>sockets.length===2);
 sockets[0].send(JSON.stringify({type:'error',error:{code:'insufficient_quota'}}));await until(()=>f.internals.sessions.get(a.id)?.retryCount===1);
 assert.equal(f.internals.shardsTable.get('only-shard').inFlight,1);
 await fetch(f.base+`/v1/jobs/${a.id}/cancel`,{method:'POST'});assert.equal(f.internals.shardsTable.get('only-shard').inFlight,1);
 await fetch(f.base+`/v1/jobs/${b.id}/cancel`,{method:'POST'});assert.equal(f.internals.shardsTable.get('only-shard').inFlight,0);
 }finally{await f.close()}
});
test('cancelled recovery probes do not count as successful provider recovery',async()=>{
 const f=await fixture();try{const shard=f.internals.shardsTable.get('shard-0');f.internals.shardsTable.put(shard.id,{...shard,quotaFailures:2,cooldownUntilMs:Date.now()-1});
 const acquired=f.internals.acquireHealthyShard(undefined, 'test-model');assert.equal(acquired.id,shard.id);f.internals.releaseShard(shard.id);assert.equal(f.internals.shardsTable.get(shard.id).quotaFailures,2);
 }finally{await f.close()}
});
test('overload rejects new inference before provider dispatch while telemetry remains reachable',async()=>{
 const f=await fixture({maxConcurrentRequests:1});let complete:()=>void=()=>{};
 f.internals.synthesizeImageWithFailover=async()=>{await new Promise<void>(r=>complete=r);return {result:{b64_json:'test'},shardId:'shard-0'}};
 try{const active=fetch(f.base+'/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'test'})});await until(()=>f.internals.imageControllers.size===1);
 const denied=await submit(f.base);assert.equal(denied.status,503);assert.equal((await denied.json()).error.code,'relay_overloaded');assert.equal(denied.headers.get('retry-after'),'2');assert.equal(f.internals.jobsTable.count(),0);
 assert.equal((await fetch(f.base+'/health/ready')).status,503);assert.equal((await fetch(f.base+'/health/live')).status,200);assert.equal((await fetch(f.base+'/api/telemetry')).status,200);
 complete();assert.equal((await active).status,200);await until(()=>f.internals.admittedRequests===0);assert.equal((await fetch(f.base+'/health/ready')).status,200);
 }finally{complete();await f.close()}
});
test('readiness fails during drain; unfinished HTTP bodies cannot hold shutdown open',async()=>{
 const {createConnection}=await import('node:net');const f=await fixture({drainTimeoutMs:100});const port=Number(new URL(f.base).port);const socket=createConnection({port,host:'127.0.0.1'});socket.on('error',()=>{});
 try{await new Promise<void>(r=>socket.once('connect',r));socket.write('POST /v1/chat/completions HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 100000\r\n\r\n{');await until(()=>f.internals.admittedRequests===1);
 const started=Date.now(),stopped=f.relay.stop();assert.equal(f.relay.stop(),stopped);assert.equal((await fetch(f.base+'/health/ready')).status,503);assert.equal((await fetch(f.base+'/health/live')).status,200);await stopped;assert(Date.now()-started<1000);assert.equal(f.internals.sessions.size,0);
 }finally{socket.destroy();await f.close()}
});
test('image work can finish during grace rather than being aborted when drain begins',async()=>{
 const f=await fixture({drainTimeoutMs:500});let complete:()=>void=()=>{};
 f.internals.synthesizeImageWithFailover=async()=>{await new Promise<void>(r=>complete=r);return {result:{b64_json:'test'},shardId:'shard-0'}};
 try{const request=fetch(f.base+'/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'test'})});await until(()=>f.internals.imageControllers.size===1);const stopped=f.relay.stop();complete();assert.equal((await request).status,200);await stopped;
 }finally{complete();await f.close()}
});

test('invalid reconnection does not cancel the existing disconnect grace timer',async()=>{
 const f=await fixture();try{const job=await(await submit(f.base)).json();await until(()=>f.internals.sessions.has(job.id));const session=f.internals.sessions.get(job.id);const timer=setTimeout(()=>{},1000);session.graceTimer=timer;f.internals.jobQueue.setDetached(job.id,true);
 const r=await fetch(f.base+job.streamUrl,{headers:{'Last-Event-ID':'invalid'}});assert.equal(r.status,400);assert.equal(session.graceTimer,timer);assert.equal(f.internals.jobsTable.get(job.id).isDetached,true);
 }finally{await f.close()}
});
test('memory-pressure admission fails closed without making liveness fail',async()=>{
 const f=await fixture({maxRssBytes:1});try{const r=await submit(f.base);assert.equal(r.status,503);assert.equal((await r.json()).error.code,'relay_memory_pressure');assert.equal((await fetch(f.base+'/health/ready')).status,503);assert.equal((await fetch(f.base+'/health/live')).status,200);assert.equal(f.internals.jobsTable.count(),0)}finally{await f.close()}
});
test('crash recovery does not advertise jobs as resumable when their transport and output are gone',async()=>{
 const f=await fixture();try{fs.writeFileSync(f.internals.config.stateSnapshotPath,JSON.stringify({timestampMs:Date.now(),jobs:[{id:'crashed',tenantId:'127.0.0.1',model:'test',status:'streaming',createdAtMs:Date.now()-100,seqCounter:10}]}));f.internals.recoverStateSnapshot();const job=f.internals.jobsTable.get('crashed');assert.equal(job.status,'failed');assert.equal(job.error,'relay_restarted_start_new_request');assert.equal(f.internals.jobQueue.activeCount(),0)}finally{await f.close()}
});

test('async operation contract exposes status polling and reports chunks without invented token counts or ETA',async()=>{
 const f=await fixture();let socket:any;f.ws.on('connection',s=>socket=s);
 try{const response=await submit(f.base);const job=await response.json();assert.equal(response.status,202);assert.equal(response.headers.get('operation-location'),job.statusUrl);assert.equal(response.headers.get('retry-after'),'2');assert.equal(response.headers.get('x-galx-eta-ms'),null);assert.equal(job.estimatedWaitSec,null);assert.equal(job.queuePosition,null);assert.equal(job.traceId,response.headers.get('x-galx-trace-id'));assert.equal(job.pollAfterMs,2000);
 const polling=await fetch(f.base+job.statusUrl);const running=await polling.json();assert.equal(polling.headers.get('cache-control'),'no-store');assert.equal(polling.headers.get('retry-after'),'2');assert.equal(running.terminal,false);assert.equal(running.traceId,job.traceId);assert.equal(running.tokensGenerated,null);
 await until(()=>!!socket);socket.send(JSON.stringify({type:'response.output_text.delta',delta:'many words in one chunk'}));socket.send(JSON.stringify({type:'response.completed'}));await until(()=>f.internals.jobsTable.get(job.id)?.status==='completed');const finished=await fetch(f.base+job.statusUrl);const result=await finished.json();assert.equal(finished.headers.get('retry-after'),null);assert.equal(result.terminal,true);assert.equal(result.pollAfterMs,null);assert.equal(result.outputChunks,1);assert.equal(result.tokensGenerated,null);
 const stats=await(await fetch(f.base+'/api/dashboard/stats')).json();assert.equal(stats.activeJobsList[0].outputChunks,1);assert.equal(stats.activeJobsList[0].tokensStreamed,null);
 }finally{await f.close()}
});
test('cancellation is idempotent and never represents a refund transaction',async()=>{
 const f=await fixture();try{const job=await(await submit(f.base)).json();const cancel=()=>fetch(f.base+`/v1/jobs/${job.id}/cancel`,{method:'POST'});const first=await(await cancel()).json(),again=await(await cancel()).json();assert.equal(first.cancellationApplied,true);assert.equal(again.cancellationApplied,false);for(const result of [first,again]){assert.equal(result.status,'cancelled');assert.equal(result.refunded,null);assert.equal(result.refundStatus,'not_managed_by_relay');assert.equal(result.tokensGenerated,null);assert.equal(result.outputChunks,0)}}finally{await f.close()}
});

test('retry configuration rejects unbounded counts and timer overflow', () => {
 for (const maxUpstreamRetries of [Infinity, NaN, -1, 1.5, 33]) {
  assert.throws(() => new GalxaiRelayServer({ testOnlyMultiShard: true, capabilityDiscovery: async () => testModels, maxUpstreamRetries }), /maxUpstreamRetries/);
 }
 for (const retryMaxDelayMs of [Infinity, NaN, 2147483648]) {
  assert.throws(() => new GalxaiRelayServer({ testOnlyMultiShard: true, capabilityDiscovery: async () => testModels, retryMaxDelayMs }), /retryMaxDelayMs/);
 }
});

test('cancellation while failover awaits registry cannot acquire replacement capacity', async () => {
 const f = await fixture();
 let completeRefresh!: () => void;
 try {
  const job = await (await submit(f.base)).json();
  await until(() => !!f.internals.sessions.get(job.id)?.currentShardId);
  f.internals.installFleet([
   { id: 'shard-0', accountId: 'account-0', accessToken: 'secret-0' },
   { id: 'replacement', accountId: 'replacement-account', accessToken: 'fake-replacement' },
  ]);
  f.internals.refreshShardRegistry = () => new Promise<void>(resolve => { completeRefresh = resolve; });
  const recovery = f.internals.performInFlightFailover(job.id, 'test_transport_drop', 'shard-0');
  await until(() => !!completeRefresh);
  await fetch(f.base + `/v1/jobs/${job.id}/cancel`, { method: 'POST' });
  completeRefresh();
  await recovery;
  assert.equal(f.internals.shardsTable.get('replacement').inFlight, 0);
  assert.equal(f.internals.shardsTable.get('replacement').slidingWindowTimestamps.length, 0);
  assert.equal(f.internals.sessions.has(job.id), false);
 } finally { completeRefresh?.(); await f.close(); }
});

test('zero retries stops after first provider failure and exposes terminal recovery', async () => {
 const f = await fixture({ maxUpstreamRetries: 0 });
 let connections = 0;
 f.ws.on('connection', socket => { connections++; socket.on('message', () => socket.send(JSON.stringify({ type: 'error', error: { code: 'server_error' } }))); });
 try {
  const job = await (await submit(f.base)).json();
  await until(() => f.internals.jobsTable.get(job.id)?.status === 'failed');
  const status = await (await fetch(f.base + `/v1/jobs/${job.id}`)).json();
  assert.equal(connections, 1);
  assert.equal(status.recovery.state, 'stopped');
  assert.equal(status.recovery.automaticRetry, false);
  assert.equal(status.recovery.nextRetryAtMs, null);
  assert.equal(f.internals.sessions.size, 0);
  assert(f.internals.shardsTable.getAll().every((shard: any) => shard.inFlight === 0));
 } finally { await f.close(); }
});

test('administrator boundaries protect metrics, telemetry and fleet mutations', async () => {
 const f = await fixture({ apiKeys: ['admin-key', 'inference-key'] });
 try {
  for (const route of ['/metrics', '/api/telemetry', '/api/dashboard/stats', '/api/shards']) {
   assert.equal((await fetch(f.base + route)).status, 401);
   assert.equal((await fetch(f.base + route, { headers: { Authorization: 'Bearer inference-key' } })).status, 403);
   assert.equal((await fetch(f.base + route, { headers: { Authorization: 'Bearer admin-key' } })).status, 200);
  }
  const mutation = await fetch(f.base + '/api/quota/profile', { method: 'POST', headers: { Authorization: 'Bearer inference-key', 'Content-Type': 'application/json' }, body: JSON.stringify({ customCap: 1 }) });
  assert.equal(mutation.status, 403);
  assert.equal(f.internals.currentQuotaProfile.maxCalls, 0);
  assert.equal((await submit(f.base, 'inference-key')).status, 202);
 } finally { await f.close(); }
});

test('local relay rejects cross-origin writes and DNS-rebinding hostnames', async () => {
 const f = await fixture();
 try {
  for (const origin of ['https://untrusted.example', 'null']) {
   const r = await fetch(f.base + '/api/quota/profile', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'text/plain' }, body: '{"customCap":1}' });
   assert.equal(r.status, 403);
   assert.equal(r.headers.get('access-control-allow-origin'), null);
  }
  const http = await import('node:http');
  const reboundStatus = await new Promise<number>((resolve, reject) => {
   http.get(f.base + '/api/shards', { headers: { Host: 'rebound.example' } }, res => { res.resume(); resolve(res.statusCode!); }).on('error', reject);
  });
  assert.equal(reboundStatus, 403);
  const same = await fetch(f.base + '/api/shards', { headers: { Origin: f.base } });
  assert.equal(same.status, 200);
  assert.equal(same.headers.get('access-control-allow-origin'), f.base);
  assert.equal(same.headers.get('x-frame-options'), 'DENY');
  assert.equal(same.headers.get('cache-control'), 'no-store');
  assert.equal(f.internals.currentQuotaProfile.maxCalls, 0);
 } finally { await f.close(); }
});

test('explicit browser allowlist still requires an authenticated API request', async () => {
 const f = await fixture({ apiKeys: ['admin-key'], allowedOrigins: ['https://app.example'] });
 try {
  const headers = { Origin: 'https://app.example' };
  assert.equal((await fetch(f.base + '/api/shards', { headers })).status, 401);
  const r = await fetch(f.base + '/api/shards', { headers: { ...headers, Authorization: 'Bearer admin-key' } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://app.example');
  assert.equal((await fetch(f.base + '/api/shards', { headers: { Origin: 'https://app.example.attacker.test', Authorization: 'Bearer admin-key' } })).status, 403);
 } finally { await f.close(); }
});

test('management bodies have size limits, validation and read deadlines', async () => {
 const f = await fixture({ httpBodyTimeoutMs: 30 });
 try {
  for (const route of ['/api/quota/profile', '/api/quota/reset']) {
   const r = await fetch(f.base + route, { method: 'POST', body: JSON.stringify({ extra: 'x'.repeat(17000) }) });
   assert.equal(r.status, 413);
   assert.equal((await r.json()).error.code, 'payload_too_large');
   assert.equal((await fetch(f.base + route, { method: 'POST', body: '[]' })).status, 400);
  }
  const http = await import('node:http');
  const status = await new Promise<number>((resolve, reject) => {
   const req = http.request(f.base + '/api/quota/profile', { method: 'POST' }, res => {
    res.resume(); req.end(); resolve(res.statusCode!);
   });
   req.on('error', reject); req.write('{');
  });
  assert.equal(status, 408);
  assert.equal(f.internals.currentQuotaProfile.maxCalls, 0);
 } finally { await f.close(); }
});

test('network listeners require credentials and dedicated admin keys stay separate', async () => {
 assert.throws(() => new GalxaiRelayServer({ testOnlyMultiShard: true, capabilityDiscovery: async () => testModels, host: '0.0.0.0', apiKeys: [], adminApiKeys: [] }), /require RELAY_API_KEYS/);
 assert.throws(() => new GalxaiRelayServer({ testOnlyMultiShard: true, capabilityDiscovery: async () => testModels, apiKeys: [''] }), /nonempty keys/);
 const f = await fixture({ apiKeys: ['client-key'], adminApiKeys: ['operator-key'] });
 try {
  assert.equal((await fetch(f.base + '/metrics', { headers: { Authorization: 'Bearer client-key' } })).status, 403);
  assert.equal((await fetch(f.base + '/metrics', { headers: { Authorization: 'Bearer operator-key' } })).status, 200);
 } finally { await f.close(); }
});
