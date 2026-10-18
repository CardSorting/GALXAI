/** Exact existing hostname routes only. No raw database/account-service exposure. */
import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { request } from 'node:http';
const state='.data/postgres-cutover',tunnel='3df90220-304b-4771-8be8-4569bc147b4e';
const save=async(file,value)=>{await fs.writeFile(state+'/'+file,JSON.stringify(value,null,2),{mode:0o600});await fs.chmod(state+'/'+file,0o600);};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const localStatus=(port,host,path)=>new Promise((resolve,reject)=>{
 const req=request({hostname:'127.0.0.1',port,path,headers:{Host:host},signal:AbortSignal.timeout(15000)},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});req.on('error',reject);req.end();
});
try{
 const mode=process.argv[2];assert(['inspect','inspect-progress','apply','resume-dns'].includes(mode));
 const env=parseEnv(await fs.readFile('.env.local','utf8'));
 const api=async(endpoint,method='GET',body,optional=false)=>{
  const response=await fetch('https://api.cloudflare.com/client/v4'+endpoint,{method,headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  if(optional&&!response.ok)return {unavailable:true,status:response.status};
  const value=await response.json();if(!response.ok||!value.success)throw Error('Ingress API rejected '+method+' '+endpoint+': '+response.status);return value.result;
 };
 const zones=await api('/zones?name=galx.ai');assert.equal(zones.length,1);const zone=zones[0].id,account=zones[0].account.id;
 const endpoint='/accounts/'+account+'/cfd_tunnel/'+tunnel+'/configurations';
 const config=await api(endpoint),dns={};for(const host of ['galx.ai','www.galx.ai','nova.galx.ai'])dns[host]=await api('/zones/'+zone+'/dns_records?name='+host);
 const redirects=await api('/zones/'+zone+'/rulesets/phases/http_request_dynamic_redirect/entrypoint','GET',undefined,true);
 const pageRules=await api('/zones/'+zone+'/pagerules','GET',undefined,true);const workerRoutes=await api('/zones/'+zone+'/workers/routes','GET',undefined,true);
 if(mode==='inspect-progress'){
  await save('ingress-progress.secret.json',{observedAt:new Date().toISOString(),config,dns});console.log(JSON.stringify({config:config.config,dns}));
 }else if(mode==='inspect'){
  try{await fs.access(state+'/ingress-cutover.json');throw Error('Do not overwrite before-state after ingress activation starts.');}catch(error){if(error.code!=='ENOENT')throw error;}
  await save('ingress-before.secret.json',{observedAt:new Date().toISOString(),zone,account,tunnel,config,dns,redirects,pageRules,workerRoutes});
  console.log(JSON.stringify({routes:config.config.ingress,dns:Object.fromEntries(Object.entries(dns).map(([host,rows])=>[host,rows.map(({type,content,proxied,id})=>({type,content,proxied,id}))])),redirects:redirects?.rules,pageRules,workerRoutes}));
 }else{
  const previous=JSON.parse(await fs.readFile(state+'/ingress-before.secret.json','utf8'));
  const cutover=JSON.parse(await fs.readFile(state+'/central-cutover.json','utf8'));
  const phase=JSON.parse(await fs.readFile(state+'/phase.json','utf8'));
  assert.equal(cutover.phase,'local-running');assert(cutover.sourceHashVerified&&cutover.guardsRemoved);assert.equal(phase.state,'central-local-authority');
  assert.equal(previous.tunnel,tunnel);assert.equal(previous.zone,zone);assert.equal(previous.account,account);
  if(mode==='apply')assert.deepEqual(config.config,previous.config.config);assert.deepEqual(dns,previous.dns);assert.deepEqual(workerRoutes,[]);
  if(mode==='apply')try{await fs.access(state+'/ingress-cutover.json');throw Error('An ingress phase already exists; inspect before any retry.');}catch(error){if(error.code!=='ENOENT')throw error;}
  for(const path of ['/','/auth/callback?error=setup_check','/api/auth/session']){
   const response=await fetch('https://www.galx.ai'+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
   assert.equal(response.status,308);assert.equal(response.headers.get('location'),'https://galx.ai'+path);await response.body?.cancel();
  }
  for(const [port,host,path,status]of [[17788,'galx.ai','/',200],[17788,'galx.ai','/api/auth/session',401],[17789,'nova.galx.ai','/.well-known/oauth-protected-resource',200]]){
   assert.equal(await localStatus(port,host,path),status,host+path);
  }
  const next=structuredClone(previous.config.config),nova=next.ingress.filter(v=>v.hostname==='nova.galx.ai');assert.equal(nova.length,1);assert.equal(nova[0].service,'http://host.docker.internal:17787');nova[0].service='http://host.docker.internal:17789';
  assert.equal(next.ingress.filter(v=>v.hostname==='galx.ai').length,0);assert.equal(next.ingress.at(-1).service,'http_status:404');
  next.ingress.splice(next.ingress.length-1,0,{hostname:'galx.ai',service:'http://host.docker.internal:17788',originRequest:{httpHostHeader:'galx.ai',connectTimeout:10,http2Origin:false,keepAliveTimeout:30,keepAliveConnections:10,disableChunkedEncoding:false}});
  const apex=dns['galx.ai'].filter(v=>v.type==='CNAME');assert.equal(apex.length,1);assert.equal(apex[0].content,'8bfc0582af6eb119.vercel-dns-017.com');assert.equal(apex[0].proxied,true);
  let receipt;
  if(mode==='apply'){
   receipt={phase:'tunnel-update-started',startedAt:new Date().toISOString(),beforeConfigSha256:hash(config.config),afterConfigSha256:hash(next),apexRecordId:apex[0].id,wwwRetainedCanonicalRedirect:true,unrelatedRoutesPreserved:true};await save('ingress-cutover.json',receipt);
   await api(endpoint,'PUT',{config:next});assert.deepEqual((await api(endpoint)).config,next);
  }else{
   receipt=JSON.parse(await fs.readFile(state+'/ingress-cutover.json','utf8'));assert.equal(receipt.phase,'tunnel-update-started');assert.equal(receipt.afterConfigSha256,hash(next));assert.deepEqual(config.config,next);
   receipt.tunnelReadback='All values match; Cloudflare reordered object fields. No tunnel mutation repeated.';
  }
  receipt.phase='dns-update-started';await save('ingress-cutover.json',receipt);
  const target=tunnel+'.cfargotunnel.com';await api('/zones/'+zone+'/dns_records/'+apex[0].id,'PATCH',{content:target,proxied:true});
  const actual=await api('/zones/'+zone+'/dns_records/'+apex[0].id);assert.equal(actual.content,target);assert.equal(actual.proxied,true);
  receipt.phase='routed';receipt.updatedAt=new Date().toISOString();await save('ingress-cutover.json',receipt);
  phase.publicTraffic=true;phase.publicRoutedAt=receipt.updatedAt;await save('phase.json',phase);
  console.log('Canonical web and Nova now route to the accepted local listeners; existing www canonical redirect and unrelated routes are preserved.');
 }
}catch(error){await save('ingress-error.json',{observedAt:new Date().toISOString(),message:String(error.message)});console.error('Ingress setup stopped; inspect its private before-state and error.');process.exitCode=1;}
