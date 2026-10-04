// Offline host compatibility probe only; no deployment or production authority.
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{randomBytes}=require('node:crypto');
const ephemeral={GALX_VAULT_KEY_V1:randomBytes(32).toString('hex'),GALX_AUDIT_SIGNING_SECRET:randomBytes(32).toString('hex')};
const env={PATH:process.env.PATH,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',GALX_CONNECT_ENABLED:'0',GALX_CONNECT_ORIGIN:'https://galx.ai',GALX_NOVA_RESOURCE:'https://nova.galx.ai',GALX_CONNECT_CLIENTS:'[]',NEXT_PUBLIC_APP_URL:'https://galx.ai',NEXT_PUBLIC_SUPABASE_URL:'https://fixture.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-public-fixture',...ephemeral};
let logs='';const started=performance.now();
const child=spawn(process.execPath,['/app/node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','7787'],{cwd:'/app',env,stdio:['ignore','pipe','pipe']});
child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
const get=(path,host='galx.ai',method='GET')=>new Promise((resolve,reject)=>{
 const req=http.request({hostname:'127.0.0.1',port:7787,path,method,headers:{Host:host,'X-Forwarded-Proto':'https'}},res=>{
  const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({path,status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));
 });req.setTimeout(10000,()=>req.destroy(Error('probe_timeout')));req.on('error',reject);req.end();
});
(async()=>{
 const checks=[];let root;
 for(let i=0;i<100;i++){try{root=await get('/');break;}catch{if(child.exitCode!==null)throw Error('production_server_exited');await new Promise(r=>setTimeout(r,200));}}
 assert(root,'server unavailable');assert.equal(root.status,200);
 checks.push({name:'production home',status:root.status,bytes:Buffer.byteLength(root.body),contentType:root.headers['content-type']});
 const asset=root.body.match(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+\.js(?:\?[^" ]*)?)"/);
 assert(asset,'rendered script absent');const staticResult=await get(asset[1].replace(/&amp;/g,'&'));assert.equal(staticResult.status,200);checks.push({name:'rendered browser asset',status:staticResult.status,bytes:Buffer.byteLength(staticResult.body)});
 for(const [path,host,method]of [['/connect','galx.ai','GET'],['/.well-known/oauth-authorization-server','galx.ai','GET'],['/.well-known/oauth-protected-resource','nova.galx.ai','GET'],['/v1/inference','nova.galx.ai','POST'],['/post-mortem/CURRENT_STATE.md','galx.ai','GET']]){
  const r=await get(path,host,method);if(path==='/v1/inference'||path.startsWith('/.well-known/'))assert.equal(r.status,503);if(path==='/post-mortem/CURRENT_STATE.md')assert.equal(r.status,404);
  assert(!/GALX_PRIVATE_POST_MORTEM_CONTENT|GALX_PRIVATE_KNOWLEDGE_CONTENT|DATABASE_URL|GALX_PREMIUM_RELAY_KEY/.test(r.body));assert(!Object.values(ephemeral).some(v=>r.body.includes(v)));
  checks.push({name:path,status:r.status,contentType:r.headers['content-type'],sanitized:true});
 }
 const memory=fs.readFileSync('/proc/'+child.pid+'/status','utf8').match(/^VmRSS:\s+(\d+)\s+kB/m)?.[1];
 const stopAt=performance.now();const exitPromise=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
 child.kill('SIGTERM');const deadline=setTimeout(()=>child.kill('SIGKILL'),10000);const exit=await exitPromise;clearTimeout(deadline);assert.equal(exit.code,0);assert.equal(exit.signal,null);
 const result={at:new Date().toISOString(),runtime:process.version,architecture:process.arch,framework:require('/app/node_modules/next/package.json').version,mode:'next start production; unchanged retained clean-build output mounted read-only',network:'none; loopback probes inside container only',realDatabase:false,realProvider:false,connectEnabled:false,checks,readyAndProbeElapsedMs:Math.round(stopAt-started),rssKiB:memory?Number(memory):null,idleSigtermMs:Math.round(performance.now()-stopAt),exit,limits:'Idle shutdown only; active inference, real accounts, real storage, ARM64 package and public cutover not accepted by this smoke probe.'};
 fs.writeFileSync('/evidence/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>{if(child.exitCode===null)child.kill('SIGKILL');fs.writeFileSync('/evidence/server.log',logs);});
