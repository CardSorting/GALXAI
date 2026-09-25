import assert from 'node:assert/strict';
import { chmod, lstat, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PoolRuntime } from '../src/relay/pool-runtime.js';
import { PoolRequestQueue, type QueuedGenerationRequest, type QueuedHttpResponse } from '../src/relay/pool-request-queue.js';
import { failure, hash } from '../src/relay/pool-protocol.js';
import { asIncomingMessage, asServerResponse, QueueIncomingMessage, QueueServerResponse } from '../src/relay/pool-queue-http.js';
import { RequestError } from '../src/relay/request-policy.js';

const key=(label:string)=>hash(`relay-queue-test-${label}`);

async function invoke(runtime:any,pathname:string,headers:Record<string,string>,body:Record<string,unknown>){
  const inbound=new QueueIncomingMessage(pathname,headers,body),outbound=new QueueServerResponse();
  const req=asIncomingMessage(inbound),res=asServerResponse(outbound);
  try{await runtime.route(req,res);}catch(error){failure(res,error);}
  const captured=outbound.captured();
  return {status:captured.status,headers:captured.headers,body:captured.body};
}

test('Premium generation passes through the durable local queue without widening public responses',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-http-'));
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  let textCalls=0,imageCalls=0;
  const durableExecutions=new Map<string,Record<string,unknown>>();
  const originalFetch=globalThis.fetch;
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const pathname=new URL(String(input)).pathname;
    const requestBody=JSON.parse(String(init?.body ?? '{}')) as Record<string,unknown>;
    const headers=init?.headers as Record<string,string>;
    const workload=pathname.includes('/images/')?'images':'text';
    const tenantSha256=hash(headers['x-galx-tenant']);
    const requestKey=hash(JSON.stringify([tenantSha256,workload,headers['idempotency-key']]));
    const executionId=`job_${requestKey.slice(0,32)}`;
    durableExecutions.set(requestKey,{requestSha256:hash(JSON.stringify(requestBody)),epoch:'queue-test-epoch',workload,accountId:'account',state:'completed',executionId});
    if(pathname.includes('/images/')){imageCalls++;return Response.json({data:[{b64_json:png}],private:'internal'},{headers:{'x-private-upstream':'must-not-escape'}});}
    textCalls++;return Response.json({id:'job_queue_test',status:'completed',output:'queued answer',private:'internal'},{headers:{'x-private-upstream':'must-not-escape'}});
  }) as typeof fetch;
  const execution={
    epoch:'queue-test-epoch',central:{identity:{pool:'premium'}},
    store:{call:async(action:string,args:Record<string,unknown>={})=>action==='lookup'?durableExecutions.get(String(args.requestKey))??null:[]},
    accountAvailable:()=>true,accountRecovering:()=>false,stop:()=>{},settlePending:async()=>{},
  };
  const runtime=new PoolRuntime(execution as any,key('runtime'),path.join(directory,'state'));
  (runtime as any).refreshedAt=Date.now();
  (runtime as any).workers.set('account',{account:{id:'account',models:['fixture','image:gpt-image-2'],expiresAtMs:Date.now()+600_000},
    engine:{credentialRejected:()=>false,accountAvailability:()=>({eligible:true,lastUsedAtMs:0,recovering:false,availableSlots:1})},port:3002,key:key('worker'),failureCircuits:{}});
  const requestQueue=await PoolRequestQueue.open(path.join(directory,'state'),(request,signal)=>(runtime as any).executeQueuedRequest(request,signal));
  (runtime as any).requestQueue=requestQueue;
  await requestQueue.startWorkers();
  t.after(async()=>{globalThis.fetch=originalFetch;await requestQueue.close();await rm(directory,{recursive:true,force:true});});
  const headers=(id:string)=>({authorization:`Bearer ${key('runtime')}`,'content-type':'application/json','x-galx-tenant':hash('queue-owner'),'idempotency-key':id});
  const textBody={model:'fixture',messages:[{role:'user',content:'test prompt'}]};

  const unauthorized=await invoke(runtime,'/v1/chat/completions',{...headers('unauthorized'),authorization:`Bearer ${key('wrong')}`},textBody);
  assert.equal(unauthorized.status,401);assert.equal(textCalls,0);

  const first=await invoke(runtime,'/v1/chat/completions',headers('text-idempotency'),textBody);
  assert.equal(first.status,200);assert.equal(first.headers.has('x-private-upstream'),false);
  const firstBody=JSON.parse(first.body.toString()) as Record<string,unknown>;
  assert.equal(firstBody.output,'queued answer');assert.equal('private' in firstBody,false);
  const replay=await invoke(runtime,'/v1/chat/completions',headers('text-idempotency'),textBody);
  assert.equal(replay.status,202);assert.equal(JSON.parse(replay.body.toString()).status,'completed');assert.equal(textCalls,1);
  const conflict=await invoke(runtime,'/v1/chat/completions',headers('text-idempotency'),{...textBody,messages:[{role:'user',content:'changed'}]});
  assert.equal(conflict.status,409);assert.equal(JSON.parse(conflict.body.toString()).error.code,'idempotency_conflict');

  const image=await invoke(runtime,'/v1/images/generations',headers('image-binary'),{model:'gpt-image-2',prompt:'blue moon'});
  assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.equal(image.headers.has('x-private-upstream'),false);
  assert(image.body.byteLength>0);
  const imageJson=await invoke(runtime,'/v1/images/generations',headers('image-json'),{model:'gpt-image-2',prompt:'blue moon',response_format:'b64_json'});
  assert.equal(imageJson.status,200);assert.match(JSON.parse(imageJson.body.toString()).data[0].b64_json,/^iVBORw0KGgo/);
  assert.equal(imageCalls,2);

  (runtime as any).draining=true;
  requestQueue.beginDrain();
  const acceptedDuringDrain=await (runtime as any).executeQueuedRequest({pathname:'/v1/chat/completions',
    body:{model:'fixture',messages:[{role:'user',content:'already accepted'}]},delegated:hash('queue-owner'),
    idempotencyKey:'accepted-during-drain',requestKey:key('accepted-during-drain'),owner:key('queue-owner'),workload:'text',
    fingerprint:key('accepted-during-drain-fingerprint')},new AbortController().signal) as QueuedHttpResponse;
  assert.equal(acceptedDuringDrain.status,200);
  assert.equal(JSON.parse(acceptedDuringDrain.body).output,'queued answer');
  assert.equal(textCalls,2);
});

test('a waiting request survives runtime replacement in BroccoliDB and is processed once',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-restart-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const request:QueuedGenerationRequest={pathname:'/v1/chat/completions',body:{model:'fixture',messages:[{role:'user',content:'persisted'}]},
    delegated:hash('opaque-owner'),idempotencyKey:'restart-key',requestKey:key('request'),owner:key('owner'),workload:'text',fingerprint:key('fingerprint')};
  let executions=0;
  const handler=async():Promise<QueuedHttpResponse>=>{executions++;return {status:200,headers:{'content-type':'application/json','cache-control':'no-store'},body:'{"ok":true}',encoding:'utf8'};};
  const first=await PoolRequestQueue.open(directory,handler);
  const job=await first.enqueue(request);
  await first.close();

  const resumed=await PoolRequestQueue.open(directory,handler);
  assert.equal(resumed.healthy,false);
  await resumed.startWorkers();
  assert.equal(resumed.healthy,true);
  t.after(()=>resumed.close());
  const result=await resumed.waitForResult(job.id,()=>true);
  assert.deepEqual(result?.body,'{"ok":true}');assert.equal(executions,1);
  const duplicate=await resumed.enqueue(request);
  assert.equal(duplicate.id,job.id);assert.equal(duplicate.state,'completed');assert.equal(executions,1);
});

test('a persisted request whose queue deadline expired before claim is never dispatched after restart',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-expired-recovery-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  let executions=0;
  const request:QueuedGenerationRequest={pathname:'/v1/chat/completions',body:{messages:[]},delegated:key('expired-recovery-owner'),
    idempotencyKey:'expired-recovery-key',requestKey:key('expired-recovery-request'),owner:key('expired-recovery-owner'),
    workload:'text',deadlineAtEpochMs:Date.now()+40,fingerprint:key('expired-recovery-fingerprint')};
  const first=await PoolRequestQueue.open(directory,async()=>{executions++;return {status:200,headers:{},body:'unexpected',encoding:'utf8'};});
  const saved=await first.enqueue(request);
  await first.close();
  await new Promise(resolve=>setTimeout(resolve,60));

  const resumed=await PoolRequestQueue.open(directory,async()=>{executions++;return {status:200,headers:{},body:'unexpected',encoding:'utf8'};});
  t.after(()=>resumed.close());
  await resumed.startWorkers();
  const response=await resumed.waitForResult(saved.id,()=>true);
  assert.equal(response?.status,503);
  assert.equal(response?.headers['x-should-retry'],'true');
  assert.equal(JSON.parse(response!.body).error.execution_state,'not_accepted');
  assert.equal(executions,0);
});

test('queue storage is private and rejects symbolic-link workspaces',async t=>{
  if(process.platform==='win32') return t.skip('POSIX file modes are not available');
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-private-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const workspace=path.join(directory,'request-queue');
  const database=path.join(workspace,'.broccolidb');
  await mkdir(database,{recursive:true,mode:0o777});
  await writeFile(path.join(workspace,'existing.txt'),'private');
  await chmod(workspace,0o777);await chmod(database,0o777);await chmod(path.join(workspace,'existing.txt'),0o644);
  const queue=await PoolRequestQueue.open(directory,async()=>({status:200,headers:{},body:'ok',encoding:'utf8'}));
  try {
    assert.equal((await lstat(workspace)).mode&0o777,0o700);
    assert.equal((await lstat(database)).mode&0o777,0o700);
    assert.equal((await lstat(path.join(workspace,'existing.txt'))).mode&0o777,0o600);
    const wal=path.join(database,'wal.log');
    try { assert.equal((await lstat(wal)).mode&0o777,0o600); } catch(error) { if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error; }
  } finally { await queue.close(); }

  const linkedRoot=path.join(directory,'linked-state');
  const target=path.join(directory,'outside');
  await mkdir(linkedRoot);await mkdir(target);await symlink(target,path.join(linkedRoot,'request-queue'));
  await assert.rejects(PoolRequestQueue.open(linkedRoot,async()=>({status:200,headers:{},body:'ok',encoding:'utf8'})),/non-directory|symbolic links|regular directory/);
});

test('queue wait deadlines cancel only unclaimed work and report safe retryability',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-deadline-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const queue=await PoolRequestQueue.open(directory,async()=>({status:200,headers:{},body:'ok',encoding:'utf8'}));
  t.after(()=>queue.close());
  const request:QueuedGenerationRequest={pathname:'/v1/chat/completions',body:{messages:[]},delegated:key('deadline-owner'),
    idempotencyKey:'deadline-key',requestKey:key('deadline-request'),owner:key('deadline-owner'),workload:'text',
    deadlineAtEpochMs:Date.now()+40,fingerprint:key('deadline-fingerprint')};
  const job=await queue.enqueue(request);
  const response=await queue.waitForResult(job.id,()=>true);
  assert.equal(response?.status,503);
  assert.equal(response?.headers['x-should-retry'],'true');
  assert.equal(JSON.parse(response!.body).error.execution_state,'not_accepted');
  assert.equal((await queue.enqueue(request)).state,'waiting');
});

test('disconnect leaves an already claimed generation running',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-disconnect-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  let finish!:()=>void;
  let started!:()=>void;
  let handlerAborted=false;
  const handlerStarted=new Promise<void>(resolve=>{started=resolve;});
  const queue=await PoolRequestQueue.open(directory,async(_request,signal)=>{
    signal.addEventListener('abort',()=>{handlerAborted=true;},{once:true});
    started();
    await new Promise<void>(resolve=>{finish=resolve;});
    return {status:200,headers:{'content-type':'application/json'},body:'{"ok":true}',encoding:'utf8'};
  });
  t.after(()=>queue.close());
  const request:QueuedGenerationRequest={pathname:'/v1/chat/completions',body:{messages:[]},delegated:key('disconnect-owner'),
    idempotencyKey:'disconnect-key',requestKey:key('disconnect-request'),owner:key('disconnect-owner'),workload:'text',fingerprint:key('disconnect-fingerprint')};
  const job=await queue.enqueue(request);
  await queue.startWorkers();
  await handlerStarted;
  assert.equal(await queue.waitForResult(job.id,()=>false),undefined);
  assert.equal(handlerAborted,false);
  finish();
  const response=await queue.waitForResult(job.id,()=>true);
  assert.equal(response?.status,200);
});

test('graceful drain stops new admission and finishes work already in the queue',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-drain-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  let finish!:()=>void;
  let started!:()=>void;
  let startedCount=0;
  let handlerAborted=false;
  const handlerStarted=new Promise<void>(resolve=>{started=resolve;});
  const handlerMayFinish=new Promise<void>(resolve=>{finish=resolve;});
  const queue=await PoolRequestQueue.open(directory,async(_request,signal)=>{
    signal.addEventListener('abort',()=>{handlerAborted=true;},{once:true});
    startedCount++;
    if(startedCount===8)started();
    if(startedCount<=8)await handlerMayFinish;
    return {status:200,headers:{'content-type':'application/json'},body:'{"ok":true}',encoding:'utf8'};
  });
  t.after(async()=>{finish();await queue.close();});
  const request=(label:string):QueuedGenerationRequest=>{
    const owner=key(`drain-owner-${label}`);
    return {pathname:'/v1/chat/completions',body:{messages:[]},delegated:owner,idempotencyKey:`drain-${label}`,
      requestKey:key(`drain-request-${label}`),owner,workload:'text',fingerprint:key(`drain-fingerprint-${label}`)};
  };
  const activeJobs=await Promise.all(Array.from({length:8},(_,index)=>queue.enqueue(request(`active-${index}`))));
  await queue.startWorkers();
  await handlerStarted;
  const queued=await queue.enqueue(request('waiting'));
  assert.equal(queued.state,'waiting');
  const result=queue.waitForResult(queued.id,()=>true);
  queue.beginDrain();
  assert.equal(queue.healthy,false);
  await assert.rejects(queue.enqueue(request('late')),(error:any)=>error.code==='queue_unavailable');
  assert.equal((queue as any).queue.getJob(queued.id)?.state,'waiting');
  assert.equal(handlerAborted,false);
  finish();
  assert.equal((await result)?.status,200);
  for(const job of activeJobs)assert.equal((await queue.waitForResult(job.id,()=>true))?.status,200);
  assert.equal(startedCount,9);
  assert.equal(handlerAborted,false);
});

test('runtime shutdown keeps the execution store open until its claimed queue handler finishes',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-runtime-drain-order-'));
  let finish!:()=>void;
  let started!:()=>void;
  const events:string[]=[];
  const handlerStarted=new Promise<void>(resolve=>{started=resolve;});
  const handlerMayFinish=new Promise<void>(resolve=>{finish=resolve;});
  const execution={stop(){events.push('execution-stop');},async settlePending(){events.push('settle-pending');}};
  const runtime=new PoolRuntime(execution as any,key('drain-order-runtime'),path.join(directory,'state'));
  const queue=await PoolRequestQueue.open(path.join(directory,'state'),async()=>{
    events.push('handler-started');started();await handlerMayFinish;events.push('handler-finished');
    return {status:200,headers:{'content-type':'application/json'},body:'{"ok":true}',encoding:'utf8'};
  });
  (runtime as any).requestQueue=queue;
  t.after(async()=>{finish();await runtime.stop().catch(()=>{});await rm(directory,{recursive:true,force:true});});
  const owner=key('drain-order-owner');
  const request:QueuedGenerationRequest={pathname:'/v1/chat/completions',body:{messages:[]},delegated:owner,
    idempotencyKey:'drain-order-key',requestKey:key('drain-order-request'),owner,workload:'text',fingerprint:key('drain-order-fingerprint')};
  await queue.enqueue(request);
  await queue.startWorkers();
  await handlerStarted;
  const stopping=runtime.stop();
  await new Promise(resolve=>setTimeout(resolve,40));
  assert.equal(events.includes('execution-stop'),false);
  finish();
  await stopping;
  assert(events.indexOf('handler-finished')>=0&&events.indexOf('handler-finished')<events.indexOf('execution-stop'));
  assert(events.indexOf('execution-stop')<events.indexOf('settle-pending'));
});

test('manual failed-job retries still obey the per-owner capacity limit',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-retry-cap-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const queue=await PoolRequestQueue.open(directory,async()=>{throw new Error('fixture failure');});
  t.after(()=>queue.close());
  const owner=key('retry-cap-owner');
  const failedRequest:QueuedGenerationRequest={pathname:'/v1/chat/completions',body:{messages:[]},delegated:owner,idempotencyKey:'failed',
    requestKey:key('retry-cap-failed'),owner,workload:'text',fingerprint:key('retry-cap-failed-fingerprint')};
  const failed=await queue.enqueue(failedRequest);
  await queue.startWorkers();
  assert.equal((await queue.waitForResult(failed.id,()=>true))?.status,503);
  await queue.close();

  const resumed=await PoolRequestQueue.open(directory,async()=>({status:200,headers:{},body:'ok',encoding:'utf8'}));
  t.after(()=>resumed.close());
  for(let index=0;index<8;index++) await resumed.enqueue({ ...failedRequest,idempotencyKey:`live-${index}`,requestKey:key(`retry-cap-live-${index}`),fingerprint:key(`retry-cap-live-fingerprint-${index}`) });
  await assert.rejects(resumed.enqueue(failedRequest),error=>(error as {code?:string}).code==='queue_full');
});

test('a retained failed job receives a fresh admission deadline when explicitly retried',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-retry-deadline-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const first=await PoolRequestQueue.open(directory,async()=>{throw new Error('fixture failure');});
  const request:QueuedGenerationRequest={pathname:'/v1/chat/completions',body:{messages:[]},delegated:key('retry-deadline-owner'),
    idempotencyKey:'retry-deadline',requestKey:key('retry-deadline-request'),owner:key('retry-deadline-owner'),workload:'text',
    deadlineAtEpochMs:Date.now()-1_000,fingerprint:key('retry-deadline-fingerprint')};
  const failed=await first.enqueue(request);
  await first.startWorkers();
  assert.equal((await first.waitForResult(failed.id,()=>true))?.status,503);
  await first.close();

  const resumed=await PoolRequestQueue.open(directory,async()=>({status:200,headers:{'content-type':'application/json'},body:'{"ok":true}',encoding:'utf8'}));
  t.after(()=>resumed.close());
  const freshDeadline=Date.now()+60_000;
  const retried=await resumed.enqueue({...request,deadlineAtEpochMs:freshDeadline});
  assert.equal(retried.state,'waiting');
  assert.equal(retried.data.deadlineAtEpochMs,freshDeadline);
  await resumed.startWorkers();
  assert.equal((await resumed.waitForResult(retried.id,()=>true))?.status,200);
});

test('concurrent producers cannot overrun image or total queue capacity',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-bounds-'));
  const queue=await PoolRequestQueue.open(directory,async()=>({status:200,headers:{},body:'ok',encoding:'utf8'}));
  t.after(async()=>{await queue.close();await rm(directory,{recursive:true,force:true});});
  const request=(label:string,workload:'text'|'images'):QueuedGenerationRequest=>{
    const owner=key(`bounds-owner-${label}`);
    return {pathname:workload==='images'?'/v1/images/generations':'/v1/chat/completions',body:{prompt:label},delegated:owner,
      idempotencyKey:label,requestKey:key(`bounds-request-${label}`),owner,workload,fingerprint:key(`bounds-fingerprint-${label}`)};
  };
  const images=await Promise.allSettled(Array.from({length:40},(_,index)=>queue.enqueue(request(`image-${index}`,'images'))));
  assert.equal(images.filter(result=>result.status==='fulfilled').length,32);
  assert(images.filter(result=>result.status==='rejected').every(result=>(result.reason as {code?:string}).code==='queue_full'));
  const text=await Promise.allSettled(Array.from({length:120},(_,index)=>queue.enqueue(request(`text-${index}`,'text'))));
  assert.equal(text.filter(result=>result.status==='fulfilled').length,96);
  assert(text.filter(result=>result.status==='rejected').every(result=>(result.reason as {code?:string}).code==='queue_full'));
});

test('known queue rejection preserves backoff and exposes only the safe no-dispatch state',()=>{
  const response=new QueueServerResponse();
  response.setHeader('Retry-After','5');
  failure(asServerResponse(response),new RequestError(429,'busy','Try again shortly.','not_accepted',true));
  const captured=response.captured();
  assert.equal(captured.status,429);
  assert.equal(captured.headers.get('retry-after'),'5');
  assert.equal(captured.headers.get('x-should-retry'),'true');
  assert.deepEqual(JSON.parse(captured.body.toString()),{error:{code:'busy',message:'Try again shortly.',execution_state:'not_accepted'}});
});

test('response acknowledgements coalesce compaction and retry an incomplete WAL rotation',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'relay-queue-compaction-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const queue=await PoolRequestQueue.open(directory,async()=>({status:200,headers:{'content-type':'application/json'},body:'{"ok":true}',encoding:'utf8'}));
  t.after(()=>queue.close());
  let compactions=0;
  (queue as any).database.compact=async()=>++compactions>1;
  await queue.startWorkers();
  for(let index=0;index<8;index++) {
    const owner=key(`compact-owner-${index}`);
    const request:QueuedGenerationRequest={pathname:'/v1/chat/completions',body:{messages:[]},delegated:owner,
      idempotencyKey:`compact-${index}`,requestKey:key(`compact-request-${index}`),owner,workload:'text',fingerprint:key(`compact-fingerprint-${index}`)};
    const job=await queue.enqueue(request);
    assert.equal((await queue.waitForResult(job.id,()=>true))?.status,200);
    queue.acknowledge(job.id);
  }
  const deadline=Date.now()+4_000;
  while(compactions<2&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(compactions,2);
});
