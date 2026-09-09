import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { CapabilityRegistry } from '../src/relay/capability-registry.js';
import { RelayFederationLifecycle, type RelayHandle } from '../src/relay/federation-lifecycle.js';
import { RelayFederationServer } from '../src/relay/federation-server.js';
import { AdmissionReceipts } from '../src/relay/admission-receipts.js';

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn:()=>boolean) { for(let i=0;i<200;i++){if(fn())return;await pause(5);}throw Error('Timed out'); }
async function fixture(handler:(req:http.IncomingMessage,res:http.ServerResponse,body:any)=>void, extra:Record<string,any>={}) {
  const worker=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;handler(req,res,body?JSON.parse(body):{});});
  await new Promise<void>(r=>worker.listen(0,'127.0.0.1',r));
  const record=new CapabilityRegistry();
  let handle:RelayHandle={id:'relay-a',shardId:'a',generation:'one',credentialRevision:'v1',endpoint:`http://127.0.0.1:${(worker.address() as any).port}`,inferenceKey:'internal',adminKey:'admin'};
  const publish=()=>{record.register('a','relay-a',handle.generation,'openai',8);record.publishInventory(record.beginRefresh('a')!,['A','image:A']);record.heartbeat('a',{});};publish();
  const lifecycle=new RelayFederationLifecycle(async()=>[{id:'a',accountId:'a',provider:'openai',credentialRevision:'v1',accessToken:'fake'}],{
    list:async()=>[handle],start:async()=>handle,remove:async()=>{},inspect:async()=>{record.heartbeat('a',{});return{record:record.get('a')};}});
  await lifecycle.reconcile();
  const front=new RelayFederationServer(lifecycle,{apiKeys:['client','other'],adminKeys:['admin'],secret:'test-signing-secret-at-least-32-characters',port:0,...extra});await front.start();clearInterval((front as any).timer);
  const base=`http://127.0.0.1:${(front.server.address() as any).port}`;
  const headers=(key='client')=>({Authorization:`Bearer ${key}`,'Content-Type':'application/json'});
  const submit=(body:any={model:'A',messages:[{role:'user',content:'hi'}]},more:Record<string,string>={},route='/v1/chat/completions')=>fetch(base+route,{method:'POST',headers:{...headers(),...more},body:JSON.stringify(body)});
  return{front,lifecycle,record,base,headers,submit,get handle(){return handle;},rotate:async()=>{record.remove('a');handle={...handle,generation:'two'};publish();await lifecycle.reconcile();},close:async()=>{await front.stop();await lifecycle.stop();worker.closeAllConnections();await new Promise<void>(r=>worker.close(()=>r()));}};
}
const answer=(res:http.ServerResponse,id='job-1')=>{res.writeHead(202,{'Content-Type':'application/json','Retry-After':'3','X-Galx-Trace-Id':'trace-1'});res.end(JSON.stringify({id,status:'queued',streamUrl:`/v1/jobs/${id}/stream`,statusUrl:`/v1/jobs/${id}`}));};

test('egress diagnostics require administrator authorization before collecting counters', async () => {
  let reads = 0;
  const f = await fixture((_req, res) => answer(res), { egressSnapshot: () => { reads++; return { accountedBytes: 100, blocked: 0 }; } });
  try {
    assert.equal((await fetch(f.base + '/api/egress')).status, 401);
    assert.equal((await fetch(f.base + '/api/egress', { headers: f.headers('client') })).status, 401);
    assert.equal(reads, 0);
    const allowed = await fetch(f.base + '/api/egress', { headers: f.headers('admin') });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await allowed.json(), { accountedBytes: 100, blocked: 0 });
    assert.equal(reads, 1);
    const health = await fetch(f.base + '/health');
    assert.deepEqual(await health.json(), { status: 'ok' });
  } finally { await f.close(); }
});

test('parent status URLs, retry guidance, API-key compatibility, and task identity survive the front door',async()=>{
  let captured:http.IncomingHttpHeaders|undefined;
  const f=await fixture((req,res)=>{captured=req.headers;if(req.url?.startsWith('/v1/jobs/')){res.writeHead(200);res.end(JSON.stringify({id:'job-1',status:'running',streamUrl:'/v1/jobs/job-1/stream',statusUrl:'/v1/jobs/job-1'}));}else answer(res);});
  try{
    const response=await f.submit(undefined,{'X-Galx-Task-Id':'parent.child-7','X-Galx-Tenant':'spoofed'});assert.equal(response.status,202);
    assert.equal(captured!['x-galx-task-id'],'parent.child-7');assert.notEqual(captured!['x-galx-tenant'],'spoofed');assert(captured!['x-request-id']);
    const job=await response.json();assert.equal(response.headers.get('location'),job.streamUrl);assert.equal(response.headers.get('operation-location'),job.statusUrl);assert.equal(response.headers.get('retry-after'),'3');
    const status=await(await fetch(f.base+job.statusUrl,{headers:f.headers()})).json();assert.equal(status.id,job.id);assert.equal(status.streamUrl,job.streamUrl);
    assert.equal((await fetch(f.base+'/v1/models',{headers:{Authorization:'client'}})).status,401);
    assert.equal((await fetch(f.base+'/v1/models',{headers:{'X-Galx-Api-Key':'client'}})).status,200);
  }finally{await f.close();}
});
test('explicit idempotency keys coalesce concurrent submissions and replay accepted jobs across model loss',async()=>{
  let calls=0,finish:()=>void=()=>{};
  const f=await fixture((_req,res)=>{calls++;finish=()=>answer(res);});
  try{
    const pending=f.submit(undefined,{'Idempotency-Key':'task-step-1'});await until(()=>calls===1);
    const duplicate=await f.submit(undefined,{'Idempotency-Key':'task-step-1'});assert.equal(duplicate.status,409);assert.equal(duplicate.headers.get('retry-after'),'2');assert.equal((await duplicate.json()).error.execution_state,'unknown');
    finish();const first=await(await pending).json();
    f.record.publishInventory(f.record.beginRefresh('a')!,[]);await f.lifecycle.reconcile();
    const repeat=await f.submit({messages:[{content:'hi',role:'user'}],model:'A'},{'Idempotency-Key':'task-step-1'});
    assert.equal(repeat.status,202);assert.equal(repeat.headers.get('x-galx-idempotency-hit'),'true');assert.equal((await repeat.json()).id,first.id);assert.equal(calls,1);
    const mismatch=await f.submit({model:'A',messages:[{role:'user',content:'different'}]},{'Idempotency-Key':'task-step-1'});assert.equal(mismatch.status,409);
  }finally{await f.close();}
});
test('image replay returns retained output without dispatching again',async()=>{
  let calls=0;const output={data:[{b64_json:'test-payload'}]};
  const f=await fixture((_req,res)=>{calls++;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(output));});
  try{for(let i=0;i<2;i++){const response=await f.submit({model:'A',prompt:'image'},{'Idempotency-Key':'image-step'},'/v1/images/generations');assert.equal(response.status,200);assert.deepEqual(await response.json(),output);}assert.equal(calls,1);}finally{await f.close();}
});
test('ambiguous admissions never replay and an old reservation cannot block a replacement generation',async()=>{
  let calls=0;const f=await fixture((_req,res)=>{calls++;if(calls===1)res.destroy();else answer(res);});
  try{
    const first=await f.submit(undefined,{'Idempotency-Key':'uncertain'});assert.equal(first.status,502);assert.equal(first.headers.get('x-should-retry'),'false');assert.equal((await first.json()).error.execution_state,'unknown');
    const repeat=await f.submit(undefined,{'Idempotency-Key':'uncertain'});assert.equal(repeat.status,502);assert.equal(calls,1);
    // Saturate the old generation's ledger; replacing it must not inherit the hold.
    (f.front as any).reservations.set(JSON.stringify(['a','one']),100);
    await f.rotate();assert.equal((await f.submit()).status,202);assert.equal(calls,2);
  }finally{await f.close();}
});
test('provider cooldown headers and oversized acknowledgement errors remain explicit',async()=>{
  let calls=0;const f=await fixture((_req,res)=>{if(++calls===1){res.writeHead(503,{'Content-Type':'application/json','Retry-After':'137','X-Should-Retry':'false'});res.end(JSON.stringify({error:{code:'upstream_cooldown'}}));}else{res.writeHead(202);res.end(JSON.stringify({id:'job-1',padding:'x'.repeat(70000)}));}});
  try{const denied=await f.submit();assert.equal(denied.status,503);assert.equal(denied.headers.get('retry-after'),'137');assert.equal(denied.headers.get('x-should-retry'),'false');
    const oversized=await f.submit();assert.equal(oversized.status,502);assert.equal((await oversized.json()).error.code,'relay_admission_unknown');
  }finally{await f.close();}
});
test('background polling is bounded and rotates work instead of hammering one relay',async()=>{
  const seen:string[]=[];const f=await fixture((req,res)=>{seen.push(req.url!);res.writeHead(200);res.end(JSON.stringify({status:'running'}));});
  try{const internals=f.front as any;for(let i=0;i<200;i++)internals.jobs.set(String(i),{relay:f.handle,tenant:'test',job:`job-${i}`,expires:Date.now()+600000,nextPollAt:0,pollDelayMs:2000});
    await internals.poll();assert.equal(seen.length,2);await internals.poll();assert.equal(seen.length,4);assert.equal(new Set(seen).size,4);
  }finally{await f.close();}
});
test('shutdown is single-flight and bounds a stalled image operation',async()=>{
  let started=false;const f=await fixture(()=>{started=true;},{drainTimeoutMs:30});
  const request=f.submit({model:'A',prompt:'stall'},{},'/v1/images/generations').catch(()=>null);
  try{await until(()=>started);const start=Date.now(),stop=f.front.stop();assert.equal(f.front.stop(),stop);await stop;assert(Date.now()-start<1000);await request;}finally{await f.close();}
});
test('receipt budgets retain live keys, isolate tenants, and never retain oversized response bodies',()=>{
  let now=100;const r=new AdmissionReceipts(()=>now,1000,2,10);
  const first=r.begin('a','chat','key',{model:'A'});r.complete(first.receipt,202,{},Buffer.from('ok'));
  assert.equal(r.begin('a','chat','key',{model:'A'}).existing,true);assert.equal(r.begin('b','chat','key',{model:'A'}).existing,false);
  assert.throws(()=>r.begin('c','chat','key',{model:'A'}),/retry window is full/);
  now+=1001;const replacement=r.begin('a','chat','key',{model:'A'});assert.equal(replacement.existing,false);
  r.complete(replacement.receipt,200,{},Buffer.alloc(11));assert.equal(replacement.receipt.response,undefined);
  assert.equal(r.begin('a','chat','key',{model:'A'}).receipt.state,'complete');
});


test('a changed retry scope rejects submission before any worker dispatch', async () => {
  let calls = 0;
  const f = await fixture((_req, res) => { calls++; answer(res); });
  try {
    const response = await f.submit(undefined, { 'Idempotency-Key': 'step', 'X-Galx-Idempotency-Scope': 'previous-controller' });
    assert.equal(response.status, 409);
    assert.equal(response.headers.get('x-should-retry'), 'false');
    assert.equal((await response.json()).error.execution_state, 'unknown');
    assert.equal(calls, 0);
  } finally { await f.close(); }
});


test('image keys retain identity when moving from body to the standard header', async () => {
  let calls = 0;
  const f = await fixture((_req, res) => { calls++; res.writeHead(200); res.end(JSON.stringify({ data: [{ b64_json: 'fixture' }] })); });
  try {
    const first = await f.submit({ model: 'A', prompt: 'image', idempotency_key: 'image-key' }, {}, '/v1/images/generations');
    assert.equal(first.status, 200); await first.json();
    const repeat = await f.submit({ model: 'A', prompt: 'image' }, { 'Idempotency-Key': 'image-key' }, '/v1/images/generations');
    assert.equal(repeat.status, 200); assert.equal(repeat.headers.get('x-galx-idempotency-hit'), 'true'); await repeat.json();
    assert.equal(calls, 1);
  } finally { await f.close(); }
});
