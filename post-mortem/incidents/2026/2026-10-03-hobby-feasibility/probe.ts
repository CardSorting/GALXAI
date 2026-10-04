import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {cf,tunnel,vercel,link} from '../hosted-adaptation/api.mjs';
const dir='.relay/hobby-feasibility',write=(name:string,v:any)=>fs.writeFileSync(dir+'/'+name,JSON.stringify(v,null,2)+'\n');
const hostname='images-service.galx.ai',suffix=randomBytes(12).toString('hex'),prefix='/_transport_probe/'+suffix,key=randomBytes(32).toString('hex');
const before=(await cf(tunnel)).result,project=await vercel('/v9/projects/'+link.projectId),team=await vercel('/v2/teams/'+link.orgId);
write('before.json',{at:new Date().toISOString(),version:before.version,config:before.config,plan:team.billing.plan,productionId:project.targets.production.id,productionState:project.targets.production.readyState});
const jobs:any[]=[];
const server=http.createServer((req,res)=>{
 if(req.headers.authorization!=='Bearer '+key){res.writeHead(401,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":{"code":"invalid_token"}}');return;}
 if(req.url===prefix+'/ready'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"ok":true}');return;}
 const mode=req.url===prefix+'/json'?'json':req.url===prefix+'/stream'?'stream':undefined;
 if(!mode){res.writeHead(404);res.end();return;}
 const job={mode,startedAt:Date.now(),endRequested:false,closedAt:null as number|null};jobs.push(job);
 let heartbeat:NodeJS.Timeout|undefined;
 if(mode==='stream'){
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});res.flushHeaders();res.write('data: {"fixture":"started"}\n\n');
  heartbeat=setInterval(()=>res.write(': keepalive\n\n'),15000);
 }
 const timer=setTimeout(()=>{
  job.endRequested=true;if(heartbeat)clearInterval(heartbeat);
  if(mode==='json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"fixture":"completed"}');}
  else res.end('data: {"fixture":"completed"}\n\ndata: [DONE]\n\n');
 },310000);
 res.on('close',()=>{job.closedAt=Date.now();clearTimeout(timer);if(heartbeat)clearInterval(heartbeat);});
});
server.listen(13392,'127.0.0.1');await once(server,'listening');
const rule={hostname,path:'^'+prefix+'/(ready|json|stream)$',service:'http://host.docker.internal:13392'};
let installed=false;
try{
 assert.equal((await cf(tunnel)).result.version,before.version);
 const config=structuredClone(before.config);config.ingress.unshift(rule);
 const updated=await cf(tunnel,'PUT',{config});installed=true;
 write('temporary-route.json',{at:new Date().toISOString(),version:updated.result.version,rule,syntheticOnly:true});
 let ready=false;
 for(let i=0;i<35;i++){try{if((await fetch('https://'+hostname+prefix+'/ready',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
 assert(ready,'Fixture ingress did not become ready');
 const results=await Promise.all(['json','stream'].map(async mode=>{
  const start=Date.now();let status:number|null=null,firstByteMs:number|null=null,body='',error:string|null=null;
  try{
   const response=await fetch('https://'+hostname+prefix+'/'+mode,{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(340000),redirect:'error'});status=response.status;
   const reader=response.body!.getReader();for(;;){const p=await reader.read();if(p.done)break;if(firstByteMs===null)firstByteMs=Date.now()-start;body+=new TextDecoder().decode(p.value);if(body.length>16384){await reader.cancel();throw Error('oversized fixture response');}}
  }catch(e:any){error=e.name;}
  const result={mode,status,firstByteMs,elapsedMs:Date.now()-start,completed:body.includes('"fixture":"completed"'),done:body.includes('[DONE]'),error};
  console.log(JSON.stringify(result));return result;
 }));
 await new Promise(r=>setTimeout(r,300));
 write('result.json',{at:new Date().toISOString(),scope:'Actual existing edge/tunnel to local synthetic origin. No Vercel candidate invocation, Nova execution, database or provider request.',originDelayMs:310000,results,jobs:jobs.map(j=>({mode:j.mode,endRequested:j.endRequested,originConnectionLifetimeMs:j.closedAt===null?null:j.closedAt-j.startedAt})),sameServingDeployment:project.targets.production.id});
}finally{
 if(installed){const current=(await cf(tunnel)).result;const matches=current.config.ingress.filter((r:any)=>r.hostname===hostname&&r.path===rule.path);assert.equal(matches.length,1);assert.deepEqual(matches[0],rule);const config=structuredClone(current.config);config.ingress=config.ingress.filter((r:any)=>!(r.hostname===hostname&&r.path===rule.path));const result=await cf(tunnel,'PUT',{config});write('cleanup.json',{at:new Date().toISOString(),temporaryRuleRemoved:true,version:result.result.version,otherRulesPreserved:true});}
 server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
}
