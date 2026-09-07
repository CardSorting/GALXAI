import { installTestCapabilities, testModels } from './relay-test-capabilities.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { RelayTelemetry, classifyFailure } from '../src/relay/telemetry.js';
import { GalxaiRelayServer } from '../src/relay/relay-server.js';

test('monotonic timing separates attempts, first output and retry wait; completion is immutable', () => {
 let ms=0,wall=1000;const t=new RelayTelemetry(()=>ms,()=>wall);const id=t.start('Chat completion','task-1');t.bind(id,'job-1');
 ms=5;t.attempt('job-1','shard-1');ms=15;t.phase('job-1','Wait for first output','provider');
 ms=40;t.output('job-1');ms=50;t.output('job-1');ms=60;t.failedAttempt('job-1','upstream_http_429');
 ms=80;t.attempt('job-1','shard-2');ms=100;t.output('job-1');ms=120;t.finish('job-1','completed');
 ms=1000;wall=-10000;t.finish('job-1','failed','too late');const trace=t.snapshot().traces[0];
 assert.equal(trace.durationMs,120);assert.equal(trace.firstOutputMs,40);assert.equal(trace.chunks,3);assert.equal(trace.maxChunkGapMs,10);
 assert.equal(trace.attempts.length,2);assert.equal(trace.attempts[0].layer,'provider');assert.equal(trace.status,'completed');
 assert.equal(trace.spans.reduce((n,s)=>n+(s.endMs!-s.startMs),0),120);
});
test('bounded retention evicts records and never retains unsafe labels or arbitrary error messages',()=>{
 let now=0;const t=new RelayTelemetry(()=>now,()=>now);const id=t.start('Chat completion','private prompt with spaces');t.model(id,{secret:'token'},'<script>');t.finish(id,'failed','ws_socket_error: Bearer SUPER_SECRET');
 assert(!JSON.stringify(t.snapshot()).includes('SUPER_SECRET'));assert.equal(t.snapshot().traces[0].model,undefined);
 for(let i=0;i<501;i++)t.start('Chat completion');assert.equal(t.snapshot().traces.length,500);assert.equal(t.snapshot().evicted,2);
 now=3600001;assert.equal(t.snapshot().traces.length,0);
 assert.equal(classifyFailure('ws_connect_handshake_timeout').layer,'transport');assert.equal(classifyFailure('shard_registry_unavailable').layer,'relay');
});
test('HTTP integration captures async completion, recovered quota failure, rejection and auth protection',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'relay-trace-'));const ws=new WebSocketServer({port:0});await new Promise<void>(r=>ws.once('listening',r));
 let connections=0;ws.on('connection',socket=>{const attempt=++connections;socket.on('message',()=>{if(attempt===1)socket.send(JSON.stringify({type:'error',error:{code:'insufficient_quota',message:'sensitive-provider-message'}}));else{socket.send(JSON.stringify({type:'response.output_text.delta',delta:'private output'}));setTimeout(()=>socket.send(JSON.stringify({type:'response.completed'})),20)}})});
 const relay=new GalxaiRelayServer({ testOnlyMultiShard: true, capabilityDiscovery: async () => testModels,port:0,host:'127.0.0.1',registryEnabled:false,discoverHostCredentials:false,shardsJsonPath:path.join(dir,'absent'),stateSnapshotPath:path.join(dir,'state'),wsEndpoint:`ws://127.0.0.1:${(ws.address() as any).port}`,apiKeys:['test-key'],retryBaseDelayMs:1,retryMaxDelayMs:2,drainTimeoutMs:10});
 const internals=relay as any;installTestCapabilities(internals);internals.installFleet([0,1].map(i=>({id:`shard-${i}`,accountId:`account-${i}`,accessToken:`secret-${i}`})));
 try{await relay.start();const base=`http://127.0.0.1:${internals.server.address().port}`,headers={Authorization:'Bearer test-key','Content-Type':'application/json','X-Galx-Task-Id':'task-42'};
 assert.equal((await fetch(`${base}/api/telemetry`)).status,401);
 const r=await fetch(`${base}/v1/chat/completions`,{method:'POST',headers,body:JSON.stringify({model:'gpt-5.6-sol',messages:[{role:'user',content:'private prompt'}]})});assert.equal(r.status,202);const job=await r.json();const id=r.headers.get('x-galx-trace-id');assert(id);
 const deadline=Date.now()+3000;while(internals.jobsTable.get(job.id).status!=='completed'){assert(Date.now()<deadline,'job should complete');await new Promise(r=>setTimeout(r,10))}
 const response=await fetch(`${base}/api/telemetry`,{headers});assert.equal(response.headers.get('cache-control'),'no-store');const data=await response.json();const t=data.traces.find((x:any)=>x.id===id);
 assert.equal(t.status,'completed');assert.equal(t.httpStatus,202);assert.equal(t.attempts.length,2);assert.equal(t.attempts[0].layer,'provider');assert.equal(t.taskId,'task-42');assert.equal(t.model,'gpt-5.6-sol');assert.equal(t.requestedModel,'gpt-5.6-sol');assert(t.firstOutputMs>=0);assert(t.durationMs>=t.firstOutputMs);
 const serialized=JSON.stringify(data);for(const secret of ['private prompt','private output','sensitive-provider-message','secret-0','test-key'])assert(!serialized.includes(secret));
 const bad=await fetch(`${base}/v1/chat/completions`,{method:'POST',headers,body:'invalid json'});assert.equal(bad.status,400);
 const latest=await (await fetch(`${base}/api/telemetry`,{headers})).json();assert.equal(latest.traces[0].layer,'client');assert.equal(latest.traces[0].httpStatus,400);
 const page=await fetch(`${base}/telemetry`);assert.equal(page.status,200);assert((await page.text()).includes('Request waterfall'));
 }finally{await relay.stop();for(const client of ws.clients)client.terminate();await new Promise<void>(r=>ws.close(()=>r()));fs.rmSync(dir,{recursive:true,force:true})}
});

test('attachments remain distinct from successful executions when the original job fails',()=>{
 let now=0;const telemetry=new RelayTelemetry(()=>now,()=>now);
 const original=telemetry.start('Chat completion');telemetry.bind(original,'job-original');
 now=20;const duplicate=telemetry.start('Chat completion');now=25;telemetry.attach(duplicate,'job-original');
 now=100;telemetry.finish('job-original','failed','upstream_http_500');
 const traces=telemetry.snapshot().traces;const attachment=traces.find(t=>t.id===duplicate)!;
 assert.equal(attachment.status,'attached');assert.equal(attachment.attachedToJobId,'job-original');assert.equal(attachment.durationMs,5);
 assert.equal(traces.find(t=>t.id===original)!.status,'failed');
 assert.equal(traces.filter(t=>t.status==='completed'||t.status==='failed').length,1);
});

test('HTTP duplicate links the original job without converting a later provider failure into success',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'relay-attach-'));
 const ws=new WebSocketServer({port:0,host:'127.0.0.1'});await new Promise<void>(r=>ws.once('listening',r));
 let upstream:any;ws.on('connection',socket=>{upstream=socket});
 const relay=new GalxaiRelayServer({ testOnlyMultiShard: true, capabilityDiscovery: async () => testModels,port:0,host:'127.0.0.1',registryEnabled:false,discoverHostCredentials:false,shardsJsonPath:path.join(dir,'absent'),stateSnapshotPath:path.join(dir,'state'),wsEndpoint:`ws://127.0.0.1:${(ws.address() as any).port}`,maxUpstreamRetries:0,drainTimeoutMs:10});
 const internals=relay as any;installTestCapabilities(internals);internals.installFleet([{id:'shard',accountId:'account',accessToken:'test-secret'}]);
 try{await relay.start();const base=`http://127.0.0.1:${internals.server.address().port}`;
 const submit=()=>fetch(base+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'test-model',messages:[{role:'user',content:'same request'}]})});
 const first=await submit();const job=await first.json();const duplicate=await submit();const attached=await duplicate.json();assert.equal(attached.id,job.id);assert.equal(duplicate.headers.get('x-attached-stream'),'true');
 const deadline=Date.now()+2000;while(!upstream){assert(Date.now()<deadline);await new Promise(r=>setTimeout(r,5))}
 upstream.send(JSON.stringify({type:'error',error:{code:'server_error'}}));
 while(internals.jobsTable.get(job.id).status!=='failed'){assert(Date.now()<deadline);await new Promise(r=>setTimeout(r,5))}
 const data=await(await fetch(base+'/api/telemetry')).json();const original=data.traces.find((t:any)=>t.id===first.headers.get('x-galx-trace-id')),attachment=data.traces.find((t:any)=>t.id===duplicate.headers.get('x-galx-trace-id'));
 assert.equal(original.status,'failed');assert.equal(attachment.status,'attached');assert.equal(attachment.attachedToJobId,job.id);
 }finally{await relay.stop();for(const c of ws.clients)c.terminate();await new Promise<void>(r=>ws.close(()=>r()));fs.rmSync(dir,{recursive:true,force:true})}
});
