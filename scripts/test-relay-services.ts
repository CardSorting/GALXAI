import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { centralServer } from '../src/relay/pool-central.js';
import { PoolExecution } from '../src/relay/pool-execution.js';
import { CentralClient, hash, requestWorkload, assertProjectDatabase, PROJECTS } from '../src/relay/pool-protocol.js';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';
import { PoolRuntime } from '../src/relay/pool-runtime.js';
import { AdmissionEventBuffer } from '../src/relay/admission-observability.js';
import { poolMonitor } from '../src/relay/pool-monitor-server.js';
import { DesktopManager } from '../src/relay/desktop-manager.js';
import { classifyImageRelayFailure, decodePrivateRelayFailure, encodePrivateRelayFailure, privateRelayFailure, PRIVATE_RELAY_FAILURE_HEADER } from '../src/relay/private-failure.js';

async function listen(server:http.Server) {server.listen(0,'127.0.0.1');await once(server,'listening');return `http://127.0.0.1:${(server.address() as any).port}`;}
const close=(server:http.Server)=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());});
const key=(name:string)=>hash('synthetic-'+name);

test('fixed project, origin, and workload boundaries reject retired configuration',()=>{
  assertProjectDatabase(`postgresql://fixture@db.${PROJECTS.premium}.supabase.co/postgres`,PROJECTS.premium);assert.throws(()=>assertProjectDatabase(`postgresql://fixture@db.${PROJECTS.central}.supabase.co/postgres`,PROJECTS.premium));
  for(const origin of ['http://example.com','https://example.com/path','https://key@example.com','https://example.com/#fragment'])assert.throws(()=>new CentralClient(origin,key('runtime'),{pool:'premium',installationId:randomUUID()}));
  const base={model:'fixture',messages:[{role:'user',content:'hello'}]};
  for(const [body,expected] of [[base,'text'],[{...base,sites_profile:'local-v1'},'sites'],[{model:'image:fixture',prompt:'hello'},'images'] ] as const) assert.equal(requestWorkload('premium',body.model?.startsWith('image:')?'/v1/images/generations':'/v1/chat/completions',body),expected);
  assert.throws(()=>new CentralClient('http://127.0.0.1:1',key('runtime'),{pool:'retired' as any,installationId:randomUUID()}));
});

test('central HTTP routes cannot expose registration context or refresh tokens to a runtime',async()=>{
  const tokens=Object.fromEntries(['runtime','registrar','operator','viewer'].map(role=>[key(role),role]));let actions:string[]=[];
  const server=centralServer({identitySecret:key('identity'),decrypt:()=>({accessToken:'synthetic-access',accountId:'synthetic-account',refreshToken:'never-export'}),query:async(token,action,body)=>{
    const kind=tokens[Object.keys(tokens).find(k=>hash(k)===token)!];if(!kind)throw Error();actions.push(action);
    if(action==='authenticate')return{kind,pool:'premium',installationId:'fixture'};
    if(action==='projection')return{pool:'premium',installationId:'fixture',epoch:body.epoch,executionAllowed:true,accounts:[{id:'own',state:'enabled',revision:1,envelope:{secret:'private'},credentialRevision:key('credential'),models:['fixture']}]};
    if(action==='status')return{accounts:[],pool:'premium'};throw Error();
  }});const origin=await listen(server);
  try{
    const call=(route:string,role:string,body:object={})=>fetch(origin+route,{method:'POST',headers:{Authorization:`Bearer ${key(role)}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await call('/runtime/registration_context','runtime')).status,404);
    assert.equal((await call('/registrar/review','runtime',{})).status,403);
    assert.equal((await call('/operator/set_account','viewer',{})).status,403);
    assert.equal((await call('/operator/manage_registration','viewer',{})).status,403);
    assert.equal((await call('/operator/manage_registration','runtime',{})).status,403);
    assert.equal((await call('/operator/manage_registration','operator',{desktopId:randomUUID()})).status,400);
    assert.equal((await call('/runtime/projection','runtime',{epoch:randomUUID(),sql:'select secrets'})).status,400);
    const r=await call('/runtime/projection','runtime',{epoch:randomUUID()});assert.equal(r.status,200);const raw=await r.text();assert(!/never-export|envelope|private/.test(raw));assert.equal(JSON.parse(raw).accounts[0].credential.accessToken,'synthetic-access');
    const hostile=await fetch(origin+'/operator/status',{method:'POST',headers:{Origin:'https://hostile.example',Authorization:`Bearer ${key('operator')}`},body:'{}'});assert.equal(hostile.status,403);
    assert(!actions.includes('registration_context'));
  }finally{await close(server);}
});

test('execution admission persists first, fails closed and retains settlement when central is unavailable',async()=>{
  const records=new Map<string,any>();let available=true,settleCalls=0;
  const store={call:async(action:string,b:any={})=>{
    if(action==='reserve'){if(!records.has(b.requestKey))records.set(b.requestKey,{...b,state:'reserved'});return records.get(b.requestKey);}
    const r=records.get(b.requestKey);
    if(action==='bind'){r.state='running';r.leaseId=b.leaseId;return r;}
    if(action==='finish'){r.state=b.success?'completed':'unknown';r.success=b.success;return r;}
    if(action==='pending')return[...records.values()].filter(r=>['completed','unknown'].includes(r.state)&&!r.settled&&r.leaseId);
    if(action==='settled'){r.settled=true;return r;}throw Error();
  }};
  const central=new CentralClient('http://127.0.0.1:1',key('runtime'),{pool:'premium',installationId:randomUUID()},(async(url:any)=>{
    if(!available)throw Error('offline');if(String(url).endsWith('/acquire')){assert.equal([...records.values()][0].state,'reserved');return Response.json({leaseId:'lease',fencingToken:1,expiresAtMs:Date.now()+30000});}
    if(String(url).endsWith('/settle')){settleCalls++;return Response.json({success:true});}throw Error();
  }) as typeof fetch);
  let recoveryNow=0;const execution=new PoolExecution(central,store,undefined,{now:()=>recoveryNow,random:()=>0}),account={id:'codex_sh_'+key('a').slice(0,24),revision:1,assignmentRevision:1,credentialRevision:key('c'),state:'enabled' as const,desktopId:randomUUID(),models:['fixture'],expiresAtMs:Date.now()+600000};
  const req={url:'/v1/chat/completions',headers:{'idempotency-key':'one'}} as any;
  const grant=await execution.policy(account).admit(req,{messages:[{role:'user',content:'hello'}]},'tenant','job_one');grant.assert();available=false;await grant.complete(true,10);assert(grant.signal.aborted);assert.equal(settleCalls,0);assert.equal([...records.values()][0].state,'completed');available=true;await execution.settlePending();recoveryNow=2000;await execution.settlePending();assert.equal(settleCalls,1);
  await assert.rejects(execution.policy(account).admit(req,{messages:[{role:'user',content:'hello'}]},'tenant','job_repeat'));
  available=false;await assert.rejects(execution.policy(account).admit({...req,headers:{'idempotency-key':'two'}},{messages:[{role:'user',content:'hello'}]},'tenant','job_two'));assert.equal([...records.values()][1].state,'unknown');execution.stop();
});

test('real relay engine blocks forbidden work before admission and aborts upstream when its grant expires',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pool-engine-'));const upstream=http.createServer(),wss=new WebSocketServer({server:upstream});const upstreamOrigin=await listen(upstream);
  let sockets=0,admissions=0,settlements=0,closed=0;const controller=new AbortController();
  wss.on('connection',socket=>{sockets++;socket.on('close',()=>closed++);socket.on('message',()=>socket.send(JSON.stringify({type:'response.output_text.delta',delta:'synthetic output'})));});
  const engine=new GalxaiRelayServer({host:'127.0.0.1',port:0,assignedShardId:'own',assignedShard:{id:'own',accessToken:'fixture-token',accountId:'fixture-account'},registryEnabled:false,discoverHostCredentials:false,apiKeys:[key('inference')],adminApiKeys:[key('admin')],maxUpstreamRetries:0,drainTimeoutMs:100,wsEndpoint:upstreamOrigin.replace('http:','ws:'),capabilityDiscovery:async()=>['fixture','image:fixture'],stateSnapshotPath:path.join(directory,'state.json'),executionPolicy:{pool:'premium',admit:async()=>{admissions++;return{signal:controller.signal,assert:()=>controller.signal.throwIfAborted(),complete:async()=>{settlements++;}};}}});
  try{
    await engine.start();const origin=`http://127.0.0.1:${engine.listeningPort()}`;
    const post=(url:string,body:object)=>fetch(origin+url,{method:'POST',headers:{Authorization:`Bearer ${key('inference')}`,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify(body)});
    const base={model:'fixture',messages:[{role:'user',content:'hello'}]};
    assert.equal(admissions,0);assert.equal(sockets,0);
    const accepted=await post('/v1/chat/completions',base);assert.equal(accepted.status,202);const job=await accepted.json();
    for(let i=0;i<50&&!sockets;i++)await new Promise(r=>setTimeout(r,20));assert.equal(sockets,1);controller.abort();
    for(let i=0;i<50&&!closed;i++)await new Promise(r=>setTimeout(r,20));assert.equal(closed,1);assert.equal(settlements,1);
    const status=await fetch(origin+`/v1/jobs/${job.id}`,{headers:{Authorization:`Bearer ${key('inference')}`}});assert.equal((await status.json()).status,'failed');
  }finally{await engine.stop();wss.close();await close(upstream);await rm(directory,{recursive:true,force:true});}
});

test('two real monitor servers isolate sessions, deny viewer mutations and enforce central revocation',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pool-monitor-'));let mutations=0,revoked=false;const monitors:any[]=[];
  try{
    for(const pool of ['premium'] as const){const identity={pool,installationId:randomUUID()};
      const clients=['operator','viewer','registrar'].map(role=>new CentralClient('http://127.0.0.1:1',key(pool+role),identity,(async(url:any)=>{if(revoked)throw Error();if(String(url).endsWith('set_account'))mutations++;return Response.json({pool,accounts:[],registrations:[],activity:[]});}) as typeof fetch));
      const driver={available:async()=>true,list:async()=>[],create:async()=>{},start:async()=>{},stop:async()=>{},destroy:async()=>{},launch:async()=>{},display:async()=>{throw Error();},clipboard:async()=>''};
      const monitor=poolMonitor({operator:clients[0],viewer:clients[1],registrar:clients[2],operatorToken:key(pool+'operator'),viewerToken:key(pool+'viewer'),desktops:new DesktopManager(path.join(directory,pool+'.json'),driver)});
      monitors.push({monitor,origin:await listen(monitor.server),pool});
    }
    async function session(m:any,role:string){const r=await fetch(m.origin+'/session/ticket',{method:'POST',headers:{Authorization:`Bearer ${key(m.pool+role)}`}});const t=await r.json();const exchange=await fetch(m.origin+'/session',{method:'POST',headers:{Origin:m.origin,'Content-Type':'application/json'},body:JSON.stringify(t)});assert.equal(exchange.status,400,'unknown fields are rejected');const valid=await fetch(m.origin+'/session',{method:'POST',headers:{Origin:m.origin,'Content-Type':'application/json'},body:JSON.stringify({role,ticket:t.ticket})});assert.equal(valid.status,200);return valid.headers.get('set-cookie')!.split(';')[0];}
    const [premium]=monitors;const viewer=await session(premium,'viewer'),operator=await session(premium,'operator');
    assert.equal((await fetch(premium.origin+'/assets/monitor.js')).status,401);
    assert.equal((await fetch(premium.origin+'/assets/monitor-model.js')).status,401);
    assert.equal((await fetch(premium.origin+'/api/registrations/start',{method:'POST',headers:{Cookie:viewer,Origin:premium.origin,'Content-Type':'application/json'},body:JSON.stringify({id:randomUUID()})})).status,403);
    const manage=(cookie:string,extra={})=>fetch(premium.origin+'/api/registrations/manage',{method:'POST',headers:{Cookie:cookie,Origin:premium.origin,'Content-Type':'application/json'},body:JSON.stringify({id:randomUUID(),registrationId:randomUUID(),expectedRevision:1,command:'remove',...extra})});
    assert.equal((await manage(viewer)).status,403);
    assert.equal((await manage(operator,{pool:'retired'})).status,400);
    assert.equal((await manage(operator,{desktopId:randomUUID()})).status,400);
    assert.equal((await fetch(premium.origin+'/api/status',{headers:{Cookie:viewer}})).status,200);
    const action=(cookie:string,origin=premium.origin,extra={})=>fetch(premium.origin+'/api/accounts/action',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:randomUUID(),accountId:'own',expectedRevision:1,command:'paused',...extra})});
    assert.equal((await action(viewer)).status,403);assert.equal((await action(operator,'https://hostile.example')).status,403);assert.equal((await action(operator,premium.origin,{pool:'retired'})).status,400);assert.equal(mutations,0);assert.equal((await action(operator)).status,200);assert.equal(mutations,1);revoked=true;assert.equal((await action(operator)).status,503);assert.equal(mutations,1);
  }finally{for(const m of monitors){await m.monitor.close();await close(m.monitor.server);}await rm(directory,{recursive:true,force:true});}
});

test('public job DTOs strip nested operational data and bound response bytes',async()=>{
  const {publicJob,boundedJson}=await import('../src/relay/pool-public-response.js');
  const result=publicJob({id:'job_fixture',status:'completed',retainedUntil:Date.now()+1000,output:'hello',usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3,secret:'private'},content:{secret:'private'},streamUrl:'https://peer.example/secret',accounts:[{secret:'private'}],headers:{secret:'private'}});
  assert.deepEqual(result.usage,{prompt_tokens:1,completion_tokens:2,total_tokens:3});assert(!JSON.stringify(result).includes('private'));assert(!('streamUrl' in result));assert.equal(result.output,'hello');
  await assert.rejects(boundedJson(new Response('x'.repeat(1025)),1024));
});

test('private worker failures open a scoped circuit, fail over future work, and stay out of public responses',async()=>{
  const failure=encodePrivateRelayFailure(privateRelayFailure({class:'capability_denied',scope:'worker',retryAfterMs:120000}));
  assert.deepEqual(decodePrivateRelayFailure(failure),{version:'v1',class:'capability_denied',scope:'worker',retryAfterMs:120000});
  const calls={a:0,b:0};
  const workerServer=(name:'a'|'b')=>http.createServer((_req,res)=>{
    calls[name]++;
    res.writeHead(502,{'Content-Type':'application/json',[PRIVATE_RELAY_FAILURE_HEADER]:failure});
    res.end(JSON.stringify({error:{code:'upstream_image_synthesis_failed',message:'private provider detail'}}));
  });
  const servers=[workerServer('a'),workerServer('b')];
  const origins=await Promise.all(servers.map(server=>listen(server)));
  const account=(id:string)=>({id,revision:1,credentialRevision:key(`credential-${id}`),state:'enabled' as const,desktopId:randomUUID(),models:[],expiresAtMs:Date.now()+600000});
  const engine={credentialRejected:()=>false,accountAvailability:()=>({eligible:true,lastUsedAtMs:0,recovering:false,availableSlots:1})};
  const execution={epoch:'epoch',central:{identity:{pool:'premium'}},accountAvailable:()=>true,accountRecovering:()=>false,store:{call:async(action:string)=>action==='lookup'?null:[]}};
  const runtime=new PoolRuntime(execution as any,key('wire'),'/unused');
  (runtime as any).refreshedAt=Date.now();
  (runtime as any).workers.set('a',{account:account('a'),engine,port:Number(new URL(origins[0]).port),key:key('inner-a'),failureCircuits:{}});
  (runtime as any).workers.set('b',{account:account('b'),engine,port:Number(new URL(origins[1]).port),key:key('inner-b'),failureCircuits:{}});
  const origin=await listen(runtime.server);
  const post=(id:string)=>fetch(origin+'/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${key('wire')}`,'Content-Type':'application/json','x-galx-tenant':hash('owner'),'Idempotency-Key':id},body:JSON.stringify({model:'gpt-image-2',prompt:'a quiet blue moon'})});
  try {
    const first=await post('first');
    assert.equal(first.status,503); assert.equal(first.headers.get(PRIVATE_RELAY_FAILURE_HEADER),null);
    assert.equal(first.headers.get('retry-after'),'120'); assert(!JSON.stringify(await first.json()).includes('capability_denied'));
    const second=await post('second');
    assert.equal(second.status,503); assert.equal(calls.a,1); assert.equal(calls.b,1);
    assert((runtime as any).workers.get('a').failureCircuits.images.openUntilMs>Date.now());
  } finally {
    await close(runtime.server); await Promise.all(servers.map(close));
  }
});

test('confirmed pre-generation image rejection fails over within one admission lifecycle', async () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  assert.equal(classifyImageRelayFailure({ upstream: { type: 'response.failed', response: { error: { code: 'usage_limit_reached' } } } }).class, 'pre_generation_rejected');
  assert.notEqual(classifyImageRelayFailure({ upstream: { type: 'error', error: { code: 'usage_limit_reached' } } }).class, 'pre_generation_rejected');
  const preGeneration = encodePrivateRelayFailure(privateRelayFailure({ class: 'pre_generation_rejected', scope: 'worker', retryAfterMs: 90_000 }));
  let aCalls = 0, bCalls = 0;
  const aServer = http.createServer((_req, res) => {
    aCalls++;
    res.writeHead(502, { 'Content-Type': 'application/json', [PRIVATE_RELAY_FAILURE_HEADER]: preGeneration });
    res.end(JSON.stringify({ error: { code: 'upstream_image_synthesis_failed', message: 'private detail' } }));
  });
  const bServer = http.createServer((_req, res) => {
    bCalls++;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ b64_json: png }] }));
  });
  const [aOrigin, bOrigin] = await Promise.all([listen(aServer), listen(bServer)]);
  const account = (id: string) => ({id,revision:1,credentialRevision:key(`failover-${id}`),state:'enabled' as const,desktopId:randomUUID(),models:[],expiresAtMs:Date.now()+600000});
  const engine = {credentialRejected:()=>false,accountAvailability:()=>({eligible:true,lastUsedAtMs:0,recovering:false,availableSlots:1})};
  const execution={epoch:'epoch',central:{identity:{pool:'premium'}},accountAvailable:()=>true,accountRecovering:()=>false,store:{call:async(action:string)=>action==='lookup'?null:[]}};
  const admissionEvents:any[] = [];
  const runtime = new PoolRuntime(execution as any, key('failover-wire'), '/unused', undefined, new AdmissionEventBuffer(128, event => admissionEvents.push(event)));
  (runtime as any).refreshedAt = Date.now();
  (runtime as any).workers.set('a',{account:account('a'),engine,port:Number(new URL(aOrigin).port),key:key('failover-a'),failureCircuits:{}});
  (runtime as any).workers.set('b',{account:account('b'),engine,port:Number(new URL(bOrigin).port),key:key('failover-b'),failureCircuits:{}});
  const origin = await listen(runtime.server);
  try {
    const response = await fetch(origin + '/v1/images/generations', {
      method:'POST',
      headers:{Authorization:`Bearer ${key('failover-wire')}`,'Content-Type':'application/json','x-galx-tenant':hash('failover-owner'),'Idempotency-Key':'failover-one'},
      body:JSON.stringify({model:'gpt-image-2',prompt:'a quiet blue moon',response_format:'b64_json'}),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.match(body.data[0].b64_json, /^iVBORw0KGgo/);
    assert.notEqual(body.data[0].b64_json, '');
    assert.deepEqual({a:aCalls,b:bCalls},{a:1,b:1});
    assert.equal((runtime as any).workers.get('a').failureCircuits.images.lastClass, 'pre_generation_rejected');
    const names = admissionEvents.map(event => event.name);
    for (const name of ['received','candidate_evaluated','reservation_attempted','reservation_acquired','dispatch_started','worker_pregrant_started','worker_pregrant_rejected','reselection_started','terminal']) assert(names.includes(name), `missing private admission event: ${name}`);
    assert(admissionEvents.some(event => event.name === 'candidate_rejected' && event.targetId === 'a' && event.reason === 'excluded_target'));
    assert(admissionEvents.some(event => event.name === 'reservation_acquired' && event.targetId === 'b'));
    assert.equal(admissionEvents.at(-1).state, 'completed');
    assert(!JSON.stringify(admissionEvents).includes('quiet blue moon'));
  } finally {
    await close(runtime.server); await Promise.all([close(aServer), close(bServer)]);
  }
});

test('ambiguous image outcome does not suppress future capacity on the worker that received it', async () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  let aCalls = 0, bCalls = 0;
  const unclassified = classifyImageRelayFailure({ code: 'unclassified_failure' });
  assert.equal(unclassified.class, 'unknown');
  assert.equal(unclassified.scope, 'request');
  const preGeneration = encodePrivateRelayFailure(privateRelayFailure({ class: 'pre_generation_rejected', scope: 'worker', retryAfterMs: 90_000 }));
  const aServer = http.createServer((_req, res) => {
    aCalls++;
    res.writeHead(502, { 'Content-Type': 'application/json', [PRIVATE_RELAY_FAILURE_HEADER]: preGeneration });
    res.end(JSON.stringify({ error: { code: 'upstream_image_synthesis_failed' } }));
  });
  const bServer = http.createServer((_req, res) => {
    bCalls++;
    if (bCalls === 1) {
      // The request outcome is intentionally ambiguous. It must remain
      // terminal for that request, but it does not prove B lacks future
      // image capacity.
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { execution_state: 'unknown', code: 'request_unavailable' } }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ b64_json: png }] }));
  });
  const [aOrigin, bOrigin] = await Promise.all([listen(aServer), listen(bServer)]);
  const account = (id: string) => ({id,revision:1,credentialRevision:key(`ambiguous-scope-${id}`),state:'enabled' as const,desktopId:randomUUID(),models:[],expiresAtMs:Date.now()+600000});
  const engine = {credentialRejected:()=>false,accountAvailability:()=>({eligible:true,lastUsedAtMs:0,recovering:false,availableSlots:1})};
  const execution={epoch:'epoch',central:{identity:{pool:'premium'}},accountAvailable:()=>true,accountRecovering:()=>false,store:{call:async(action:string)=>action==='lookup'?null:[]}};
  const runtime = new PoolRuntime(execution as any, key('ambiguous-scope-wire'), '/unused');
  (runtime as any).refreshedAt = Date.now();
  (runtime as any).workers.set('a',{account:account('a'),engine,port:Number(new URL(aOrigin).port),key:key('ambiguous-scope-a'),failureCircuits:{}});
  (runtime as any).workers.set('b',{account:account('b'),engine,port:Number(new URL(bOrigin).port),key:key('ambiguous-scope-b'),failureCircuits:{}});
  const origin = await listen(runtime.server);
  const post = (id: string) => fetch(origin+'/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${key('ambiguous-scope-wire')}`,'Content-Type':'application/json','x-galx-tenant':hash('ambiguous-scope-owner'),'Idempotency-Key':id},body:JSON.stringify({model:'gpt-image-2',prompt:id,response_format:'b64_json'})});
  try {
    const first = await post('ambiguous-scope-first');
    assert.equal(first.status, 503);
    assert.deepEqual({a:aCalls,b:bCalls},{a:1,b:1});
    assert((runtime as any).workers.get('a').failureCircuits.images.openUntilMs > Date.now());
    assert.equal((runtime as any).workers.get('b').failureCircuits.images, undefined,
      'an ambiguous result must not create worker-scoped image cooldown evidence');

    const second = await post('ambiguous-scope-second');
    assert.equal(second.status, 200);
    assert.deepEqual({a:aCalls,b:bCalls},{a:1,b:2});
  } finally {
    await close(runtime.server); await Promise.all([close(aServer), close(bServer)]);
  }
});

test('single assigned image worker preserves target-local quota scope for its parent pool', async () => {
  const original = globalThis.fetch;
  const directory = await mkdtemp(path.join(tmpdir(), 'relay-image-target-scope-'));
  globalThis.fetch = (async (url, options) => {
    if (String(url).startsWith('https://api.openai.com/')) {
      return new Response(JSON.stringify({ error: { code: 'usage_limit_reached', message: 'private provider detail' } }), {
        status: 429, headers: { 'retry-after': '9' },
      });
    }
    return original(url, options);
  }) as typeof fetch;
  const engine = new GalxaiRelayServer({
    host:'127.0.0.1', port:0, assignedShardId:'own',
    assignedShard:{id:'own',accessToken:'sk-test-token',accountId:'fixture-account'},
    registryEnabled:false,discoverHostCredentials:false,apiKeys:[key('target-scope')],adminApiKeys:[key('target-scope-admin')],
    maxUpstreamRetries:0,drainTimeoutMs:100,capabilityDiscovery:async()=>['image:gpt-image-2'],
    codexImageToolAlias:false,stateSnapshotPath:path.join(directory,'state.json'),
    executionPolicy:{pool:'premium',admit:async()=>({signal:new AbortController().signal,assert:()=>{},complete:async()=>{}})},
  });
  try {
    await engine.start();
    const response = await original(`http://127.0.0.1:${engine.listeningPort()}/v1/images/generations`, {
      method:'POST', headers:{Authorization:`Bearer ${key('target-scope')}`,'Content-Type':'application/json','Idempotency-Key':'target-scope-one'},
      body:JSON.stringify({model:'gpt-image-2',prompt:'a quiet blue moon',response_format:'b64_json'}),
    });
    assert.equal(response.status, 502);
    assert.match(response.headers.get(PRIVATE_RELAY_FAILURE_HEADER) ?? '', /^v1:pre_generation_rejected:worker:/);
    const body = await response.text();
    assert(!body.includes('private provider detail') && !body.includes('all_shards_unavailable'));
    assert.equal(engine.accountAvailability('image:gpt-image-2', true).eligible, false);
  } finally {
    globalThis.fetch = original; await engine.stop(); await rm(directory,{recursive:true,force:true});
  }
});

test('a worker quarantined during an active request keeps that request once and stays excluded afterward', async () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  let aCalls = 0, bCalls = 0, aResponse: http.ServerResponse | undefined;
  const aServer = http.createServer((_req, res) => {
    aCalls++;
    if (aCalls === 1) { aResponse = res; return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ data: [{ b64_json: png }] }));
  });
  const bServer = http.createServer((_req, res) => {
    bCalls++;
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ data: [{ b64_json: png }] }));
  });
  const [aOrigin, bOrigin] = await Promise.all([listen(aServer), listen(bServer)]);
  const account = (id: string) => ({id,revision:1,credentialRevision:key(`occupied-${id}`),state:'enabled' as const,desktopId:randomUUID(),models:['image:gpt-image-2'],expiresAtMs:Date.now()+600000});
  const engine = {credentialRejected:()=>false,accountAvailability:()=>({eligible:true,lastUsedAtMs:0,recovering:false,availableSlots:1})};
  const execution={epoch:'epoch',central:{identity:{pool:'premium'}},accountAvailable:()=>true,accountRecovering:()=>false,store:{call:async(action:string)=>action==='lookup'?null:[]}};
  const runtime = new PoolRuntime(execution as any, key('occupied-wire'), '/unused');
  (runtime as any).refreshedAt = Date.now();
  (runtime as any).workers.set('a',{account:account('a'),engine,port:Number(new URL(aOrigin).port),key:key('occupied-a'),failureCircuits:{}});
  (runtime as any).workers.set('b',{account:account('b'),engine,port:Number(new URL(bOrigin).port),key:key('occupied-b'),failureCircuits:{}});
  const origin = await listen(runtime.server);
  const post = (id: string) => fetch(origin+'/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${key('occupied-wire')}`,'Content-Type':'application/json','x-galx-tenant':hash('occupied-owner'),'Idempotency-Key':id},body:JSON.stringify({model:'gpt-image-2',prompt:id,response_format:'b64_json'})});
  try {
    const first = post('occupied-first');
    for (let i=0; i<100 && !aResponse; i++) await new Promise(resolve => setTimeout(resolve, 2));
    assert(aResponse);
    (runtime as any).workers.get('a').failureCircuits.images = {consecutiveFailures:1,openUntilMs:Date.now()+60000,lastClass:'capability_temporarily_unavailable'};
    aResponse.writeHead(200, {'Content-Type':'application/json'}); aResponse.end(JSON.stringify({data:[{b64_json:png}]}));
    assert.equal((await first).status, 200);
    const second = await post('occupied-second');
    assert.equal(second.status, 200);
    assert.equal(aCalls, 1, 'quarantine must not duplicate the already-running request');
    assert.equal(bCalls, 1, 'future work must fail over to the eligible worker');
    assert((runtime as any).workers.get('a').failureCircuits.images.openUntilMs>Date.now());
  } finally {
    await close(runtime.server); await Promise.all([close(aServer), close(bServer)]);
  }
});

test('ambiguous worker POST outcomes are never replayed to another worker', async () => {
  const calls = { a: 0, b: 0 };
  const ambiguous = http.createServer((_req, res) => { calls.a++; res.destroy(); });
  const alternate = http.createServer((_req, res) => { calls.b++; res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ data: [{ b64_json: 'never-used' }] })); });
  const origins = await Promise.all([listen(ambiguous), listen(alternate)]);
  const account = (id:string) => ({id,revision:1,credentialRevision:key(`ambiguous-${id}`),state:'enabled' as const,desktopId:randomUUID(),models:[],expiresAtMs:Date.now()+600000});
  const execution={epoch:'epoch',central:{identity:{pool:'premium'}},accountAvailable:()=>true,accountRecovering:()=>false,store:{call:async(action:string)=>action==='lookup'?null:[]}};
  const runtime = new PoolRuntime(execution as any, key('ambiguous-wire'), '/unused');
  (runtime as any).refreshedAt = Date.now();
  (runtime as any).workers.set('a', {account:account('a'), engine:{credentialRejected:()=>false, accountAvailability:()=>({eligible:true,lastUsedAtMs:0,recovering:false,availableSlots:1})}, port:Number(new URL(origins[0]).port), key:key('inner-ambiguous-a'), failureCircuits:{}});
  (runtime as any).workers.set('b', {account:account('b'), engine:{credentialRejected:()=>false, accountAvailability:()=>({eligible:true,lastUsedAtMs:0,recovering:false,availableSlots:1})}, port:Number(new URL(origins[1]).port), key:key('inner-ambiguous-b'), failureCircuits:{}});
  const origin = await listen(runtime.server);
  try {
    const response = await fetch(origin + '/v1/images/generations', {
      method:'POST', headers:{Authorization:`Bearer ${key('ambiguous-wire')}`,'Content-Type':'application/json','x-galx-tenant':hash('owner'),'Idempotency-Key':'ambiguous-one'},
      body:JSON.stringify({model:'gpt-image-2',prompt:'a quiet blue moon'}),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.execution_state, 'unknown');
    assert.deepEqual(calls, {a:1,b:0});
  } finally {
    await close(runtime.server); await Promise.all([close(ambiguous), close(alternate)]);
  }
});

test('Premium image alias needs a grant and performs no background image probe',async()=>{
  const {default:sharp}=await import('sharp');const image=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
  const original=globalThis.fetch;let providerCalls=0,admitted=0,settled=0;
  globalThis.fetch=(async(url:any,options:any)=>{if(String(url).startsWith('https://chatgpt.com/')){assert.equal(admitted,1);providerCalls++;return Response.json({data:[{b64_json:image.toString('base64'),private:'must-disappear'}]});}return original(url,options);}) as typeof fetch;
  const directory=await mkdtemp(path.join(tmpdir(),'premium-engine-'));
  const engine=new GalxaiRelayServer({host:'127.0.0.1',port:0,assignedShardId:'own',assignedShard:{id:'own',accessToken:'fixture-token',accountId:'fixture-account'},registryEnabled:false,discoverHostCredentials:false,apiKeys:[key('premium-inference')],adminApiKeys:[key('premium-admin')],maxUpstreamRetries:0,drainTimeoutMs:100,capabilityDiscovery:async()=>['fixture'],codexImageToolAlias:true,stateSnapshotPath:path.join(directory,'state.json'),executionPolicy:{pool:'premium',admit:async()=>{admitted++;return{signal:new AbortController().signal,assert:()=>{},complete:async()=>{settled++;}};}}});
  try{await engine.start();assert.equal(engine.imageAvailability(),null);assert.equal(providerCalls,0);const response=await original(`http://127.0.0.1:${engine.listeningPort()}/v1/images/generations`,{method:'POST',headers:{Authorization:`Bearer ${key('premium-inference')}`,'Content-Type':'application/json','Idempotency-Key':'image-one'},body:JSON.stringify({model:'gpt-image-2',prompt:'test',response_format:'b64_json'})});assert.equal(response.status,200,await response.clone().text());assert.equal(providerCalls,1);assert.equal(admitted,1);assert.equal(settled,1);assert(!(await response.text()).includes('must-disappear'));assert.equal(engine.imageAvailability(),true);
    const registry=(engine as any).capabilities; const ticket=registry.beginObservation('own','image:gpt-image-2');registry.observe(ticket,'image:gpt-image-2','NOT_AUTHORIZED');assert.equal(engine.imageAvailability(),false);assert.equal(engine.accountAvailability('image:gpt-image-2',true).eligible,false);
    const record=registry.shards.get('own');record.models.find((m:any)=>m.model==='image:gpt-image-2').expiresAtMs=Date.now()-1;assert.equal(engine.imageAvailability(),null);assert.equal(engine.accountAvailability('image:gpt-image-2',true).eligible,true);assert.equal(providerCalls,1);}
  finally{globalThis.fetch=original;await engine.stop();await rm(directory,{recursive:true,force:true});}
});

test('Premium image workers publish a private capability outcome without leaking it to callers', async () => {
  const original = globalThis.fetch;
  const directory = await mkdtemp(path.join(tmpdir(), 'premium-image-failure-'));
  globalThis.fetch = (async (url, options) => {
    if (String(url).startsWith('https://chatgpt.com/')) {
      return new Response('private provider credential and topology', { status: 403, headers: { 'retry-after': '7' } });
    }
    return original(url, options);
  }) as typeof fetch;
  const engine = new GalxaiRelayServer({
    host: '127.0.0.1', port: 0, assignedShardId: 'own',
    assignedShard: { id: 'own', accessToken: 'fixture-token', accountId: 'fixture-account' },
    registryEnabled: false, discoverHostCredentials: false, apiKeys: [key('premium-failure')],
    adminApiKeys: [key('premium-failure-admin')], maxUpstreamRetries: 0, drainTimeoutMs: 100,
    capabilityDiscovery: async () => ['fixture'], codexImageToolAlias: true,
    stateSnapshotPath: path.join(directory, 'state.json'),
    executionPolicy: { pool: 'premium', admit: async () => ({
      signal: new AbortController().signal, assert: () => {}, complete: async () => {},
    }) },
  });
  try {
    await engine.start();
    const response = await original(`http://127.0.0.1:${engine.listeningPort()}/v1/images/generations`, {
      method: 'POST', headers: {
        Authorization: `Bearer ${key('premium-failure')}`, 'Content-Type': 'application/json',
        'Idempotency-Key': 'image-capability-failure',
      }, body: JSON.stringify({ model: 'gpt-image-2', prompt: 'test', response_format: 'b64_json' }),
    });
    assert.equal(response.status, 502);
    assert.equal(response.headers.get(PRIVATE_RELAY_FAILURE_HEADER), 'v1:capability_denied:worker:120000');
    const body = await response.text();
    assert(!body.includes('private provider credential') && !body.includes('capability_denied'));
    assert.equal(engine.accountAvailability('image:gpt-image-2', true).eligible, false);
  } finally {
    globalThis.fetch = original; await engine.stop(); await rm(directory, { recursive: true, force: true });
  }
});

test('model-backed image requests preserve the requested model for Codex tool dispatch', async () => {
  const { imageExecution } = await import('../src/relay/image-compatibility.js');
  const execution = imageExecution('gpt-5.6-terra', false, true);
  assert.equal(execution.requestedModel, 'gpt-5.6-terra');
  assert.equal(execution.executionModel, 'gpt-5.6-terra');
  assert.equal(execution.routingMode, 'exact');
  assert.equal(execution.tool, undefined);
});

test('application selection fixes Sites/images to Premium and never borrows after failure',async()=>{
  const {isolatedRelay,isolatedChat}=await import('../src/core/router/adapters/IsolatedRelayTransport.js');
  const keys=['GALX_PREMIUM_RELAY_URL','GALX_PREMIUM_RELAY_KEY','GALX_TEXT_RELAY_POOL'];const old=keys.map(k=>process.env[k]);const fetcher=globalThis.fetch;const calls:string[]=[];
  try{Object.assign(process.env,{GALX_PREMIUM_RELAY_URL:'https://premium.example',GALX_PREMIUM_RELAY_KEY:key('premium')});
    assert.equal(isolatedRelay('images').url,'https://premium.example');assert.equal(isolatedRelay('sites').url,'https://premium.example');assert.equal(isolatedRelay('text').url,'https://premium.example');
    globalThis.fetch=(async(url:any,init:any)=>{const target=new URL(url);if(target.pathname==='/health/live')return Response.json({ok:true});if(target.pathname==='/v1/models')return Response.json({object:'list',data:[{id:'fixture'}]});calls.push(target.origin);assert.equal(init.headers['x-galx-tenant'],hash('owner'));return Response.json({error:{code:'busy'}},{status:503});}) as typeof fetch;
    await assert.rejects(isolatedChat({model:'fixture',messages:[{role:'user',content:'test'}]},'owner','operation',()=>{}));assert.deepEqual(calls,['https://premium.example']);
    process.env.GALX_TEXT_RELAY_POOL='retired';assert.throws(()=>isolatedRelay('text'));delete process.env.GALX_TEXT_RELAY_POOL;
  }finally{globalThis.fetch=fetcher;keys.forEach((k,i)=>{if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];});}
});

test('runtime HTTP gateway rebuilds job, receipt and stream bodies without private fields',async()=>{
 const {PoolRuntime}=await import('../src/relay/pool-runtime.js');
 const upstream=http.createServer((req,res)=>{res.setHeader('x-private-secret','never-export');if(req.url?.endsWith('/stream')){res.setHeader('Content-Type','text/event-stream');res.end('data: '+JSON.stringify({id:'job_fixture',private:'never-export',choices:[{delta:{content:'hello',private:'never-export'}}],usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3,private:'never-export'}})+'\n\ndata: [DONE]\n\n');}else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:'job_fixture',status:'completed',output:'hello',retainedUntil:Date.now()+600000,private:'never-export',usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3,private:'never-export'}}));}});
 const port=Number(new URL(await listen(upstream)).port),record={executionId:'job_fixture',epoch:'epoch',accountId:'own',state:'completed',workload:'text'};
 const execution={epoch:'epoch',central:{identity:{pool:'premium'}},store:{call:async()=>record}};
 const runtime=new PoolRuntime(execution as any,key('wire'),'/unused');(runtime as any).refreshedAt=Date.now();(runtime as any).workers.set('own',{port,key:key('inner'),engine:{credentialRejected:()=>false},account:{models:['fixture']}});
 const origin=await listen(runtime.server);
 try{for(const route of ['/v1/jobs/job_fixture','/v1/jobs/job_fixture/receipt','/v1/jobs/job_fixture/stream']){const response=await fetch(origin+route,{headers:{Authorization:`Bearer ${key('wire')}`,'x-galx-tenant':hash('owner')}});assert.equal(response.status,200);assert.equal(response.headers.get('x-private-secret'),null);assert(!(await response.text()).includes('never-export'));}
 const denied=await fetch(origin+'/api/sites/contract',{headers:{Authorization:`Bearer ${key('wire')}`}});assert.equal(denied.status,401);
 }finally{await close(runtime.server);await close(upstream);}
});

test('Premium private preflight never advertises an unsupported provider output ceiling',async()=>{
 const {PoolRuntime}=await import('../src/relay/pool-runtime.js');
 const runtime=new PoolRuntime({central:{identity:{pool:'premium'}}} as any,key('wire'),'/unused',key('capability'));
 (runtime as any).refreshedAt=Date.now();(runtime as any).workers.set('own',{engine:{credentialRejected:()=>false},account:{models:['fixture']}});
 const origin=await listen(runtime.server),query=`?model=fixture&maxOutputTokens=64&nonce=${randomUUID()}`;
 try{
  for(const token of [key('wire'),key('wrong')])assert.equal((await fetch(origin+'/api/sites/contract'+query,{headers:{Authorization:`Bearer ${token}`}})).status,401);
  const headers={Authorization:`Bearer ${key('capability')}`};
  const strict=await fetch(origin+'/api/sites/contract'+query,{headers});assert.equal(strict.status,503);assert(!(await strict.text()).includes('outputLimitForwarded'));
  const local=await fetch(origin+'/api/sites/contract'+query+'&profile=sites-local-v1',{headers});assert.equal(local.status,200);const contract=await local.json();assert.equal(contract.profile,'sites-local-v1');assert.equal('outputLimitForwarded' in contract,false);
 }finally{await close(runtime.server);}
});

test('grant expires without another request and terminal database failures block new admission until reconciled',async()=>{
 let row:any,failFinish=true;
 const store={call:async(action:string,body:any={})=>{if(action==='reserve'){row={...body,state:'reserved'};return row;}if(action==='bind'){row.leaseId=body.leaseId;row.state='running';return row;}if(action==='finish'){if(failFinish)throw Error('database offline');row.state='completed';return row;}if(action==='pending')return[];throw Error();}};
 const central=new CentralClient('http://127.0.0.1:1',key('expiring'),{pool:'premium',installationId:randomUUID()},(async()=>Response.json({leaseId:'short',fencingToken:1,expiresAtMs:Date.now()+1200})) as typeof fetch);
 const execution=new PoolExecution(central,store),account={id:'own',revision:1,assignmentRevision:1,credentialRevision:key('revision'),state:'enabled' as const,desktopId:randomUUID(),models:['fixture'],expiresAtMs:Date.now()+60000};
 const req={url:'/v1/chat/completions',headers:{'idempotency-key':'expire'}} as any;
 const grant=await execution.policy(account).admit(req,{messages:[{content:'test'}]},'owner','job_one');
 await new Promise(r=>setTimeout(r,800));assert.equal(grant.signal.aborted,true);assert.throws(()=>grant.assert());
 await assert.rejects(grant.complete(false));await assert.rejects(execution.policy(account).admit(req,{messages:[{content:'test'}]},'owner','job_two'));
 failFinish=false;await execution.settlePending();assert.equal(row.state,'completed');execution.stop();
});

test('application router delegates without reading account credentials or acquiring a second lease',async()=>{
 const {GalxModelRouter}=await import('../src/core/router/GalxModelRouter.js');
 const names=['GALX_ISOLATED_RELAYS_ENABLED','GALX_PREMIUM_RELAY_URL','GALX_PREMIUM_RELAY_KEY','GALX_TEXT_RELAY_POOL'];const old=names.map(k=>process.env[k]),original=globalThis.fetch;
 const forbidden=()=>{throw Error('Legacy authority was invoked');};
 try{
  Object.assign(process.env,{GALX_ISOLATED_RELAYS_ENABLED:'1',GALX_PREMIUM_RELAY_URL:'https://premium.example',GALX_PREMIUM_RELAY_KEY:key('p')});
  let dispatches=0;globalThis.fetch=(async(url:any,init:any)=>{const target=new URL(url);assert.equal(target.origin,'https://premium.example');if(target.pathname==='/health/live')return Response.json({ok:true});if(target.pathname==='/v1/models')return Response.json({object:'list',data:[{id:'gpt-5.6-luna'}]});assert.equal(init.headers['x-galx-tenant'],hash('owner'));if(init.method==='POST'){dispatches++;return Response.json({id:'job_fixture',streamUrl:'/v1/jobs/job_fixture/stream'},{status:202});}return new Response('data: '+JSON.stringify({choices:[{delta:{content:'hello'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});}) as typeof fetch;
  const router=new GalxModelRouter({ensureFreshFromAuthority:forbidden} as any,{} as any,{} as any,{acquireLeaseAuthoritatively:forbidden} as any,{} as any,{resolvePrivacyPolicy:()=>({profile:'standard',dataResidency:'global'})} as any,{} as any);
  const result=await router.routeChatCompletion({request:{model:'gpt-5.6-luna',messages:[{role:'user',content:'hello'}]},userId:'owner',requestId:'request-one'});assert.equal(result.statusCode,200);assert.equal(JSON.parse(result.body as string).choices[0].message.content,'hello');assert.equal(dispatches,1);
 }finally{globalThis.fetch=original;names.forEach((k,i)=>{if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];});}
});

test('manual registration reports the required account class without forwarding remote error text',async()=>{
 const central=new CentralClient('http://127.0.0.1:1',key('review'),{pool:'premium',installationId:randomUUID()},(async()=>Response.json({error:{code:'account_type_mismatch',message:'private-provider-secret'}},{status:422})) as typeof fetch);
 await assert.rejects(central.call('/registrar/review'),(error:any)=>error.status===422&&error.message.includes('paid account')&&!error.message.includes('private-provider-secret'));
});


test('Premium availability reads actual engine evidence without worker HTTP or provider calls',async()=>{
 const {PoolRuntime}=await import('../src/relay/pool-runtime.js');
 const runtime=new PoolRuntime({central:{identity:{pool:'premium'}}} as any,key('availability'),'/unused');
 let observed:boolean|null=false, reads=0;
 (runtime as any).refreshedAt=Date.now();(runtime as any).workers.set('own',{engine:{credentialRejected:()=>false,imageAvailability:()=>{reads++;return observed;}},account:{models:['fixture']}});
 const origin=await listen(runtime.server);
 try {
  const response=await fetch(origin+'/v1/images/availability?model=gpt-image-2',{headers:{Authorization:`Bearer ${key('availability')}`}});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(await response.json(),{available:false});
  assert.equal((await fetch(origin+'/v1/images/availability',{headers:{Authorization:`Bearer ${key('availability')}`}})).status,400);
  assert.equal((await fetch(origin+'/v1/images/availability?model=bad%20model',{headers:{Authorization:`Bearer ${key('availability')}`}})).status,400);
  assert.equal((await fetch(origin+'/v1/images/availability?model=gpt-image-2')).status,401);
  assert.equal((await fetch(origin+'/v1/images/availability',{headers:{Authorization:`Bearer ${key('availability')}`,Origin:'https://customer.invalid'}})).status,401);
  for(const value of [null,true,false] as const){observed=value;const result=await fetch(origin+'/v1/images/availability?model=gpt-image-2',{headers:{Authorization:`Bearer ${key('availability')}`}});assert.equal(result.status,200);assert.deepEqual(await result.json(),{available:value});}
  assert.equal(reads,4,'availability reads must use engine evidence without dispatching generation');
  (runtime as any).refreshedAt=0;const stopped=await fetch(origin+'/v1/images/availability?model=gpt-image-2',{headers:{Authorization:`Bearer ${key('availability')}`}});assert.deepEqual(await stopped.json(),{available:false});
 }finally{await close(runtime.server);}
});
