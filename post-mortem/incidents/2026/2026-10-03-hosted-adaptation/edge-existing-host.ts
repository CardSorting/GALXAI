import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {invokeNova} from '../../src/lib/nova/inference';
import {executeNova} from '../../src/lib/nova/executor';
import {NovaError} from '../../src/lib/nova/contract';
import {executeRelayChat} from '../../src/core/router/adapters/RelayChatTransport';
import {cf,tunnel,zone,write} from './api.mjs';

const hostname='images-service.galx.ai',origin='https://'+hostname;
const key=randomBytes(32).toString('hex'),jobs=new Map<string,any>(),posts=new Map<string,number>();
const counters={attempts:0,unauthorized:0,disconnects:0,requests:0};
const headers={Authorization:'Bearer '+key,'Content-Type':'application/json','x-galx-tenant':'a'.repeat(64)};
const json=(res:http.ServerResponse,status:number,v:any)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(v));};
const frame=(reason:string|null)=>'data: '+JSON.stringify({id:'PRIVATE_JOB',model:'PRIVATE_MODEL',private:'PRIVATE_ROUTE',choices:[{delta:{content:'synthetic result',reasoning_content:'PRIVATE_REASONING'},finish_reason:reason}]})+'\n\n';
const server=http.createServer(async(req,res)=>{
 try {
  counters.requests++;
  if(req.headers.authorization!=='Bearer '+key){counters.unauthorized++;json(res,401,{error:{code:'invalid_token'}});return;}
  if(req.url==='/health/live'||req.url==='/health'){json(res,200,{ok:true});return;}
  if(req.url==='/v1/models'){json(res,200,{data:[{id:'galx-nova'}]});return;}
  if(req.url==='/v1/chat/completions'&&req.method==='POST') {
   const parts=[];for await(const part of req)parts.push(part);const body=JSON.parse(Buffer.concat(parts).toString());
   assert.equal(req.headers['content-type'],'application/json');assert.match(String(req.headers['x-galx-tenant']),/^[a-f0-9]{64}$/);
   const id=String(req.headers['idempotency-key']);assert.notEqual(id,'undefined');posts.set(id,(posts.get(id)||0)+1);
   const mode=body.messages?.[0]?.content || 'complete';
   if(mode==='rejected'){json(res,503,{error:{code:'service_busy',execution_state:'not_accepted'}});return;}
   let job=jobs.get(id);if(!job){job={id:randomUUID(),mode,ended:false,closed:false,streams:0};jobs.set(id,job);counters.attempts++;}
   if(mode==='ambiguous'){req.socket.destroy();return;}
   json(res,202,{id:job.id,streamUrl:'/v1/jobs/'+job.id+'/stream'});return;
  }
  const match=req.url?.match(/^\/v1\/jobs\/([a-z0-9-]+)\/stream$/);
  if(match&&req.method==='GET') {
   const job=[...jobs.values()].find(j=>j.id===match[1]);if(!job){json(res,404,{});return;}
   job.streams++;res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Private':'PRIVATE_HEADER'});res.flushHeaders();
   res.write(frame(null));
   const timer=setTimeout(()=>{
    if(['cancel','deadline'].includes(job.mode))return;
    job.ended=true;
    if(job.mode==='lost'){res.destroy();return;}
    if(job.mode==='provider_failure'){res.end('event: error\ndata: {"error":{"execution_state":"failed","message":"PRIVATE_PROVIDER_FAILURE"}}\n\n');return;}
    if(job.mode==='unknown'){res.end();return;}
    res.end(frame('stop')+'data: [DONE]\n\n');
   },800);
   res.on('close',()=>{clearTimeout(timer);job.closed=true;job.closedAt=Date.now();if(!job.ended)counters.disconnects++;});return;
  }
  json(res,404,{error:{code:'not_found'}});
 }catch{if(!res.headersSent)json(res,500,{error:{code:'request_failed'}});else res.destroy();}
});
server.requestTimeout=15000;server.listen(13391,'127.0.0.1');await once(server,'listening');
assert.equal((await fetch('http://127.0.0.1:13391/health/live',{headers})).status,200);
let dnsId:string|undefined,configuredVersion:number|undefined;const results:any[]=[];
const before=(await cf(tunnel)).result;
write('edge-existing-host-before.json',{at:new Date().toISOString(),version:before.version,config:before.config});
const pathPattern='^/(health(/live)?|v1/(models|chat/completions|jobs/[A-Za-z0-9_.:-]+/(stream|receipt)))$';
const rule={hostname,path:pathPattern,service:'http://host.docker.internal:13391'};
try {
 const previous=await cf(zone+'/dns_records?name='+hostname);assert.equal(previous.result.length,1);assert.equal(previous.result[0].content,'3df90220-304b-4771-8be8-4569bc147b4e.cfargotunnel.com');
 assert(!before.config.ingress.some((r:any)=>r.hostname===hostname&&r.path===pathPattern));
 const next=structuredClone(before.config);next.ingress.unshift(rule);
 assert.equal((await cf(tunnel)).result.version,before.version);
 const update=await cf(tunnel,'PUT',{config:next});configuredVersion=update.result.version;
 // Reuse the existing tunnel hostname; its image routes remain on the original origin.
 write('edge-existing-host-temporary.json',{at:new Date().toISOString(),rule,version:configuredVersion,dnsId});
 let ready=false;for(let i=0;i<40;i++){try{const r=await fetch(origin+'/health/live',{headers,signal:AbortSignal.timeout(2000)});if(r.status===200){ready=true;break;}console.log(JSON.stringify({probe:i,status:r.status,originRequests:counters.requests,body:(await r.text()).slice(0,180)}));}catch(e){console.log(JSON.stringify({probe:i,error:e.name,originRequests:counters.requests}));}await new Promise(r=>setTimeout(r,1000));}assert(ready,'Edge fixture must become ready');
 assert.equal((await fetch(origin+'/v1/models')).status,401);
 assert.equal((await fetch(origin+'/operator/status',{headers})).status,404);
 process.env.GALX_PREMIUM_RELAY_URL=origin;process.env.GALX_PREMIUM_RELAY_KEY=key;
 for(const mode of ['complete','rejected','provider_failure','unknown','lost','cancel','deadline','ambiguous']) {
  const control=new AbortController(),states:string[]=[],id=randomUUID(),started=Date.now();let lifetime!:Promise<void>,dispatches=0;
  const request=new Request('https://nova.fixture.invalid/v1/inference',{method:'POST',signal:control.signal,headers:{Authorization:'Bearer galx_connect_at_'+'b'.repeat(43),'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({messages:[{role:'user',content:mode}],stream:true})});
  const response=await invokeNova(request,'https://nova.fixture.invalid',{admit:async()=>({id,userId:'synthetic-owner',grantId:'synthetic-grant'}),finish:async(_,state)=>{states.push(state);}},async(...args)=>{dispatches++;return executeNova(...args);},p=>{lifetime=p;});
  let body='',firstWhileOriginOpen=false;
  if(response.status===200){const reader=response.body!.getReader(),first=await reader.read();body+=new TextDecoder().decode(first.value);firstWhileOriginOpen=jobs.get(id)?.ended===false;
   if(mode==='cancel'){control.abort();await reader.cancel();}
   else if(mode==='deadline'){const timer=setTimeout(()=>control.abort(new DOMException('Fixture client deadline','TimeoutError')),1200);for(;;){const r=await reader.read();if(r.done)break;body+=new TextDecoder().decode(r.value);}clearTimeout(timer);}
   else for(;;){const r=await reader.read();if(r.done)break;body+=new TextDecoder().decode(r.value);}
  }else body=await response.text();
  await lifetime;await new Promise(r=>setTimeout(r,400));
  assert.equal(dispatches,1);assert.equal(posts.get(id),1,mode+' transport must not repeat POST');
  assert.deepEqual(states,[mode==='complete'?'completed':mode==='rejected'?'not_accepted':'unknown']);
  if(mode==='complete'){assert(firstWhileOriginOpen);assert(body.includes('[DONE]'));}else assert(!body.includes('[DONE]'));
  assert(!/PRIVATE_|cfargotunnel|13391/.test(body));assert(!response.headers.has('x-private'));assert(!response.headers.has('x-galx-job-id'));
  results.push({mode,status:response.status,state:states[0],novaDispatches:dispatches,ingressPosts:posts.get(id),firstWhileOriginOpen,originSawClose:jobs.get(id)?.closed??null,elapsedMs:Date.now()-started,sanitized:true});
  console.log(JSON.stringify(results.at(-1)));
 }
 const id=randomUUID(),attempts=counters.attempts;
 const opts={url:origin,key,tenant:'synthetic-owner',idempotencyKey:id,payload:{messages:[{role:'user',content:'complete'}],stream:true},ttftTimeoutMs:45000,idleTimeoutMs:45000,wallTimeoutMs:300000};
 const a=await executeRelayChat(opts);await a.response.text();const b=await executeRelayChat(opts);await b.response.text();
 assert.equal(counters.attempts-attempts,1);assert.equal(jobs.get(id).streams,2);
 results.push({mode:'duplicate-attachment',submissions:posts.get(id),providerAttempts:1,attachments:2,sameJob:a.headers['x-galx-job-id']===b.headers['x-galx-job-id']});
 write('edge-existing-host-result.json',{at:new Date().toISOString(),path:'local Nova -> actual Cloudflare edge/tunnel -> authenticated synthetic origin',syntheticOrigin:true,realProvider:false,realAccount:false,realVercelInvocation:false,requiredPathPattern:pathPattern,results,counters,providerHealthEvidence:'Separately verified using the real relay engine regression suite; synthetic origin does not classify provider health.'});
}finally {
 // Restore only our owned rule; preserve concurrent operator changes.
 if(configuredVersion!==undefined){const current=(await cf(tunnel)).result;const matches=current.config.ingress.filter((r:any)=>r.hostname===hostname&&r.path===pathPattern);assert.equal(matches.length,1);assert.deepEqual(matches[0],rule);const restored=structuredClone(current.config);restored.ingress=restored.ingress.filter((r:any)=>!(r.hostname===hostname&&r.path===pathPattern));const result=await cf(tunnel,'PUT',{config:restored});write('edge-existing-host-cleanup.json',{at:new Date().toISOString(),temporaryRuleRemoved:true,version:result.result.version,otherRulesPreserved:true});}
 if(dnsId){const d=(await cf(zone+'/dns_records/'+dnsId)).result;assert.equal(d.name,hostname);await cf(zone+'/dns_records/'+dnsId,'DELETE');}
 server.closeAllConnections();await new Promise(r=>server.close(r));
}
