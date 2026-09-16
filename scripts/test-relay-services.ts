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
import { poolMonitor } from '../src/relay/pool-monitor-server.js';
import { DesktopManager } from '../src/relay/desktop-manager.js';

async function listen(server:http.Server) {server.listen(0,'127.0.0.1');await once(server,'listening');return `http://127.0.0.1:${(server.address() as any).port}`;}
const close=(server:http.Server)=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());});
const key=(name:string)=>hash('synthetic-'+name);

test('fixed project, origin, and workload boundaries reject peer configuration and tool aliases',()=>{
  for(const pool of ['premium','standard'] as const){assertProjectDatabase(`postgresql://fixture@db.${PROJECTS[pool]}.supabase.co/postgres`,PROJECTS[pool]);assert.throws(()=>assertProjectDatabase(`postgresql://fixture@db.${PROJECTS.central}.supabase.co/postgres`,PROJECTS[pool]));}
  for(const origin of ['http://example.com','https://example.com/path','https://key@example.com','https://example.com/#fragment'])assert.throws(()=>new CentralClient(origin,key('runtime'),{pool:'premium',installationId:randomUUID()}));
  const base={model:'fixture',messages:[{role:'user',content:'hello'}]};
  for(const extra of [{sites_profile:'local-v1'},{require_output_limit:true},{tools:[{type:'image_generation'}]},{functions:[]},{modalities:['image']},{model:'image:fixture'},{model:'gpt-image-1'},{messages:[{role:'user',content:[{type:'image_url'}]}]}])assert.throws(()=>requestWorkload('standard','/v1/chat/completions',{...base,...extra}));
  assert.throws(()=>requestWorkload('standard','/v1/images/generations',{prompt:'hello'}));assert.equal(requestWorkload('standard','/v1/chat/completions',base),'text');assert.equal(requestWorkload('premium','/v1/chat/completions',{...base,sites_profile:'local-v1'}),'sites');
});

test('central HTTP routes cannot expose registration context or refresh tokens to a runtime',async()=>{
  const tokens=Object.fromEntries(['runtime','registrar','operator','viewer'].map(role=>[key(role),role]));let actions:string[]=[];
  const server=centralServer({identitySecret:key('identity'),decrypt:()=>({accessToken:'synthetic-access',accountId:'synthetic-account',refreshToken:'never-export'}),query:async(token,action,body)=>{
    const kind=tokens[Object.keys(tokens).find(k=>hash(k)===token)!];if(!kind)throw Error();actions.push(action);
    if(action==='authenticate')return{kind,pool:'standard',installationId:'fixture'};
    if(action==='projection')return{pool:'standard',installationId:'fixture',epoch:body.epoch,executionAllowed:true,accounts:[{id:'own',state:'enabled',revision:1,envelope:{secret:'private'},credentialRevision:key('credential'),models:['fixture']}]};
    if(action==='status')return{accounts:[],pool:'standard'};throw Error();
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
  const central=new CentralClient('http://127.0.0.1:1',key('runtime'),{pool:'standard',installationId:randomUUID()},(async(url:any)=>{
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
  const engine=new GalxaiRelayServer({host:'127.0.0.1',port:0,assignedShardId:'own',assignedShard:{id:'own',accessToken:'fixture-token',accountId:'fixture-account'},registryEnabled:false,discoverHostCredentials:false,apiKeys:[key('inference')],adminApiKeys:[key('admin')],maxUpstreamRetries:0,drainTimeoutMs:100,wsEndpoint:upstreamOrigin.replace('http:','ws:'),capabilityDiscovery:async()=>['fixture','image:fixture'],stateSnapshotPath:path.join(directory,'state.json'),executionPolicy:{pool:'standard',admit:async()=>{admissions++;return{signal:controller.signal,assert:()=>controller.signal.throwIfAborted(),complete:async()=>{settlements++;}};}}});
  try{
    await engine.start();const origin=`http://127.0.0.1:${engine.listeningPort()}`;
    const post=(url:string,body:object)=>fetch(origin+url,{method:'POST',headers:{Authorization:`Bearer ${key('inference')}`,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify(body)});
    const base={model:'fixture',messages:[{role:'user',content:'hello'}]};
    for(const body of [{...base,sites_profile:'local-v1',durable_receipt:true},{...base,tools:[{type:'image_generation'}]}])assert.equal((await post('/v1/chat/completions',body)).status,403);
    assert.equal((await post('/v1/images/generations',{model:'fixture',prompt:'hello'})).status,403);assert.equal(admissions,0);assert.equal(sockets,0);
    const accepted=await post('/v1/chat/completions',base);assert.equal(accepted.status,202);const job=await accepted.json();
    for(let i=0;i<50&&!sockets;i++)await new Promise(r=>setTimeout(r,20));assert.equal(sockets,1);controller.abort();
    for(let i=0;i<50&&!closed;i++)await new Promise(r=>setTimeout(r,20));assert.equal(closed,1);assert.equal(settlements,1);
    const status=await fetch(origin+`/v1/jobs/${job.id}`,{headers:{Authorization:`Bearer ${key('inference')}`}});assert.equal((await status.json()).status,'failed');
  }finally{await engine.stop();wss.close();await close(upstream);await rm(directory,{recursive:true,force:true});}
});

test('two real monitor servers isolate sessions, deny viewer mutations and enforce central revocation',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pool-monitor-'));let mutations=0,revoked=false;const monitors:any[]=[];
  try{
    for(const pool of ['premium','standard'] as const){const identity={pool,installationId:randomUUID()};
      const clients=['operator','viewer','registrar'].map(role=>new CentralClient('http://127.0.0.1:1',key(pool+role),identity,(async(url:any)=>{if(revoked)throw Error();if(String(url).endsWith('set_account'))mutations++;return Response.json({pool,accounts:[],registrations:[],activity:[]});}) as typeof fetch));
      const driver={available:async()=>true,list:async()=>[],create:async()=>{},start:async()=>{},stop:async()=>{},destroy:async()=>{},launch:async()=>{},display:async()=>{throw Error();},clipboard:async()=>''};
      const monitor=poolMonitor({operator:clients[0],viewer:clients[1],registrar:clients[2],operatorToken:key(pool+'operator'),viewerToken:key(pool+'viewer'),desktops:new DesktopManager(path.join(directory,pool+'.json'),driver)});
      monitors.push({monitor,origin:await listen(monitor.server),pool});
    }
    async function session(m:any,role:string){const r=await fetch(m.origin+'/session/ticket',{method:'POST',headers:{Authorization:`Bearer ${key(m.pool+role)}`}});const t=await r.json();const exchange=await fetch(m.origin+'/session',{method:'POST',headers:{Origin:m.origin,'Content-Type':'application/json'},body:JSON.stringify(t)});assert.equal(exchange.status,400,'unknown fields are rejected');const valid=await fetch(m.origin+'/session',{method:'POST',headers:{Origin:m.origin,'Content-Type':'application/json'},body:JSON.stringify({role,ticket:t.ticket})});assert.equal(valid.status,200);return valid.headers.get('set-cookie')!.split(';')[0];}
    const [premium,standard]=monitors;const viewer=await session(premium,'viewer'),operator=await session(premium,'operator');
    assert.equal((await fetch(premium.origin+'/assets/monitor.js')).status,401);
    assert.equal((await fetch(premium.origin+'/assets/monitor-model.js')).status,401);
    assert.equal((await fetch(premium.origin+'/api/registrations/start',{method:'POST',headers:{Cookie:viewer,Origin:premium.origin,'Content-Type':'application/json'},body:JSON.stringify({id:randomUUID()})})).status,403);
    const manage=(cookie:string,extra={})=>fetch(premium.origin+'/api/registrations/manage',{method:'POST',headers:{Cookie:cookie,Origin:premium.origin,'Content-Type':'application/json'},body:JSON.stringify({id:randomUUID(),registrationId:randomUUID(),expectedRevision:1,command:'remove',...extra})});
    assert.equal((await manage(viewer)).status,403);
    assert.equal((await manage(operator,{pool:'standard'})).status,400);
    assert.equal((await manage(operator,{desktopId:randomUUID()})).status,400);
    assert.equal((await fetch(standard.origin+'/api/status',{headers:{Cookie:operator}})).status,401);
    assert.equal((await fetch(premium.origin+'/api/status',{headers:{Cookie:viewer}})).status,200);
    const action=(cookie:string,origin=premium.origin,extra={})=>fetch(premium.origin+'/api/accounts/action',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:randomUUID(),accountId:'own',expectedRevision:1,command:'paused',...extra})});
    assert.equal((await action(viewer)).status,403);assert.equal((await action(operator,'https://hostile.example')).status,403);assert.equal((await action(operator,premium.origin,{pool:'standard'})).status,400);assert.equal(mutations,0);assert.equal((await action(operator)).status,200);assert.equal(mutations,1);revoked=true;assert.equal((await action(operator)).status,503);assert.equal(mutations,1);
  }finally{for(const m of monitors){await m.monitor.close();await close(m.monitor.server);}await rm(directory,{recursive:true,force:true});}
});

test('public job DTOs strip nested operational data and bound response bytes',async()=>{
  const {publicJob,boundedJson}=await import('../src/relay/pool-public-response.js');
  const result=publicJob({id:'job_fixture',status:'completed',retainedUntil:Date.now()+1000,output:'hello',usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3,secret:'private'},content:{secret:'private'},streamUrl:'https://peer.example/secret',accounts:[{secret:'private'}],headers:{secret:'private'}});
  assert.deepEqual(result.usage,{prompt_tokens:1,completion_tokens:2,total_tokens:3});assert(!JSON.stringify(result).includes('private'));assert(!('streamUrl' in result));assert.equal(result.output,'hello');
  await assert.rejects(boundedJson(new Response('x'.repeat(1025)),1024));
});

test('Premium image alias needs a grant and performs no background image probe',async()=>{
  const {default:sharp}=await import('sharp');const image=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
  const original=globalThis.fetch;let providerCalls=0,admitted=0,settled=0;
  globalThis.fetch=(async(url:any,options:any)=>{if(String(url).startsWith('https://chatgpt.com/')){assert.equal(admitted,1);providerCalls++;return Response.json({data:[{b64_json:image.toString('base64'),private:'must-disappear'}]});}return original(url,options);}) as typeof fetch;
  const directory=await mkdtemp(path.join(tmpdir(),'premium-engine-'));
  const engine=new GalxaiRelayServer({host:'127.0.0.1',port:0,assignedShardId:'own',assignedShard:{id:'own',accessToken:'fixture-token',accountId:'fixture-account'},registryEnabled:false,discoverHostCredentials:false,apiKeys:[key('premium-inference')],adminApiKeys:[key('premium-admin')],maxUpstreamRetries:0,drainTimeoutMs:100,capabilityDiscovery:async()=>['fixture'],codexImageToolAlias:true,stateSnapshotPath:path.join(directory,'state.json'),executionPolicy:{pool:'premium',admit:async()=>{admitted++;return{signal:new AbortController().signal,assert:()=>{},complete:async()=>{settled++;}};}}});
  try{await engine.start();assert.equal(providerCalls,0);const response=await original(`http://127.0.0.1:${engine.listeningPort()}/v1/images/generations`,{method:'POST',headers:{Authorization:`Bearer ${key('premium-inference')}`,'Content-Type':'application/json','Idempotency-Key':'image-one'},body:JSON.stringify({model:'gpt-image-2',prompt:'test',response_format:'b64_json'})});assert.equal(response.status,200,await response.clone().text());assert.equal(providerCalls,1);assert.equal(admitted,1);assert.equal(settled,1);assert(!(await response.text()).includes('must-disappear'));}
  finally{globalThis.fetch=original;await engine.stop();await rm(directory,{recursive:true,force:true});}
});

test('application selection fixes Sites/images to Premium and never borrows after failure',async()=>{
  const {isolatedRelay,isolatedChat}=await import('../src/core/router/adapters/IsolatedRelayTransport.js');
  const keys=['GALX_PREMIUM_RELAY_URL','GALX_STANDARD_RELAY_URL','GALX_PREMIUM_RELAY_KEY','GALX_STANDARD_RELAY_KEY','GALX_TEXT_RELAY_POOL'];const old=keys.map(k=>process.env[k]);const fetcher=globalThis.fetch;const calls:string[]=[];
  try{Object.assign(process.env,{GALX_PREMIUM_RELAY_URL:'https://premium.example',GALX_STANDARD_RELAY_URL:'https://standard.example',GALX_PREMIUM_RELAY_KEY:key('premium'),GALX_STANDARD_RELAY_KEY:key('standard'),GALX_TEXT_RELAY_POOL:'standard'});
    assert.equal(isolatedRelay('images').url,'https://premium.example');assert.equal(isolatedRelay('sites').url,'https://premium.example');assert.equal(isolatedRelay('text').url,'https://standard.example');
    globalThis.fetch=(async(url:any,init:any)=>{calls.push(new URL(url).origin);assert.equal(init.headers['x-galx-tenant'],hash('owner'));return Response.json({error:{code:'busy'}},{status:503});}) as typeof fetch;
    await assert.rejects(isolatedChat({model:'fixture',messages:[{role:'user',content:'test'}]},'owner','operation',()=>{}));assert.deepEqual(calls,['https://standard.example']);
    process.env.GALX_STANDARD_RELAY_KEY=process.env.GALX_PREMIUM_RELAY_KEY;assert.throws(()=>isolatedRelay('text'));
  }finally{globalThis.fetch=fetcher;keys.forEach((k,i)=>{if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];});}
});

test('runtime HTTP gateway rebuilds job, receipt and stream bodies without private fields',async()=>{
 const {PoolRuntime}=await import('../src/relay/pool-runtime.js');
 const upstream=http.createServer((req,res)=>{res.setHeader('x-private-secret','never-export');if(req.url?.endsWith('/stream')){res.setHeader('Content-Type','text/event-stream');res.end('data: '+JSON.stringify({id:'job_fixture',private:'never-export',choices:[{delta:{content:'hello',private:'never-export'}}],usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3,private:'never-export'}})+'\n\ndata: [DONE]\n\n');}else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:'job_fixture',status:'completed',output:'hello',retainedUntil:Date.now()+600000,private:'never-export',usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3,private:'never-export'}}));}});
 const port=Number(new URL(await listen(upstream)).port),record={executionId:'job_fixture',epoch:'epoch',accountId:'own',state:'completed',workload:'text'};
 const execution={epoch:'epoch',central:{identity:{pool:'standard'}},store:{call:async()=>record}};
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
 const central=new CentralClient('http://127.0.0.1:1',key('expiring'),{pool:'standard',installationId:randomUUID()},(async()=>Response.json({leaseId:'short',fencingToken:1,expiresAtMs:Date.now()+1200})) as typeof fetch);
 const execution=new PoolExecution(central,store),account={id:'own',revision:1,assignmentRevision:1,credentialRevision:key('revision'),state:'enabled' as const,desktopId:randomUUID(),models:['fixture'],expiresAtMs:Date.now()+60000};
 const req={url:'/v1/chat/completions',headers:{'idempotency-key':'expire'}} as any;
 const grant=await execution.policy(account).admit(req,{messages:[{content:'test'}]},'owner','job_one');
 await new Promise(r=>setTimeout(r,800));assert.equal(grant.signal.aborted,true);assert.throws(()=>grant.assert());
 await assert.rejects(grant.complete(false));await assert.rejects(execution.policy(account).admit(req,{messages:[{content:'test'}]},'owner','job_two'));
 failFinish=false;await execution.settlePending();assert.equal(row.state,'completed');execution.stop();
});

test('application router delegates without reading account credentials or acquiring a second lease',async()=>{
 const {GalxModelRouter}=await import('../src/core/router/GalxModelRouter.js');
 const names=['GALX_ISOLATED_RELAYS_ENABLED','GALX_PREMIUM_RELAY_URL','GALX_STANDARD_RELAY_URL','GALX_PREMIUM_RELAY_KEY','GALX_STANDARD_RELAY_KEY','GALX_TEXT_RELAY_POOL'];const old=names.map(k=>process.env[k]),original=globalThis.fetch;
 const forbidden=()=>{throw Error('Legacy authority was invoked');};
 try{
  Object.assign(process.env,{GALX_ISOLATED_RELAYS_ENABLED:'1',GALX_PREMIUM_RELAY_URL:'https://premium.example',GALX_STANDARD_RELAY_URL:'https://standard.example',GALX_PREMIUM_RELAY_KEY:key('p'),GALX_STANDARD_RELAY_KEY:key('s'),GALX_TEXT_RELAY_POOL:'standard'});
  let dispatches=0;globalThis.fetch=(async(url:any,init:any)=>{assert.equal(new URL(url).origin,'https://standard.example');assert.equal(init.headers['x-galx-tenant'],hash('owner'));if(init.method==='POST'){dispatches++;return Response.json({id:'job_fixture',streamUrl:'/v1/jobs/job_fixture/stream'},{status:202});}return new Response('data: '+JSON.stringify({choices:[{delta:{content:'hello'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});}) as typeof fetch;
  const router=new GalxModelRouter({ensureFreshFromAuthority:forbidden} as any,{} as any,{} as any,{acquireLeaseAuthoritatively:forbidden} as any,{} as any,{resolvePrivacyPolicy:()=>({profile:'standard',dataResidency:'global'})} as any,{} as any);
  const result=await router.routeChatCompletion({request:{model:'gpt-5.6-luna',messages:[{role:'user',content:'hello'}]},userId:'owner',requestId:'request-one'});assert.equal(result.statusCode,200);assert.equal(JSON.parse(result.body as string).choices[0].message.content,'hello');assert.equal(dispatches,1);
 }finally{globalThis.fetch=original;names.forEach((k,i)=>{if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];});}
});

test('manual registration reports the required account class without forwarding remote error text',async()=>{
 const central=new CentralClient('http://127.0.0.1:1',key('review'),{pool:'standard',installationId:randomUUID()},(async()=>Response.json({error:{code:'account_type_mismatch',message:'private-provider-secret'}},{status:422})) as typeof fetch);
 await assert.rejects(central.call('/registrar/review'),(error:any)=>error.status===422&&error.message.includes('free account')&&!error.message.includes('private-provider-secret'));
});
