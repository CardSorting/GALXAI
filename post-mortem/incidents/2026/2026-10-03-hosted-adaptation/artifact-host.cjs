const http=require('node:http'), {AsyncLocalStorage}=require('node:async_hooks');
globalThis.AsyncLocalStorage=AsyncLocalStorage;
// Fixture-only egress guard; production package bytes remain untouched.
const net=require('node:net'),tls=require('node:tls');
const databaseHost=new URL(process.env.DATABASE_URL).hostname;
const allowed=new Set(['127.0.0.1','localhost','::1',databaseHost]);
const originalConnect=net.connect;
net.connect=net.createConnection=function(...args){const first=args[0];const host=typeof first==='object'?first.host:(typeof args[1]==='string'?args[1]:'localhost');if(host&&!allowed.has(host))throw Error('Fixture external TCP denied');return originalConnect.apply(this,args);};
tls.connect=()=>{throw Error('Fixture external TLS denied');};
const originalFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))throw Error('Fixture external fetch denied');return originalFetch(input,init);};
const context=new AsyncLocalStorage();globalThis[Symbol.for('@vercel/request-context')]={get:()=>context.getStore()};
const jobs=new Map();let submissions=0,attempts=0,registered=0,settled=0,disconnects=0;
const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
const delta=finish=>'data: '+JSON.stringify({id:'PRIVATE_PROVIDER_JOB',model:'PRIVATE_MODEL',private:'PRIVATE_TOPOLOGY',choices:[{delta:{content:'Synthetic artifact result.',reasoning_content:'PRIVATE_REASONING'},finish_reason:finish}]})+'\n\n';
const provider=http.createServer(async(req,res)=>{
 if(req.headers.authorization!=='Bearer '+process.env.GALX_PREMIUM_RELAY_KEY){json(res,401,{});return;}
 if(req.url==='/health/live'||req.url==='/health'){json(res,200,{ok:true});return;}
 if(req.url==='/v1/models'){json(res,200,{data:[{id:'galx-nova'}]});return;}
 if(req.url==='/v1/chat/completions'&&req.method==='POST'){
  submissions++;const chunks=[];for await(const c of req)chunks.push(c);const b=JSON.parse(Buffer.concat(chunks));const id=req.headers['idempotency-key'];
  if(!jobs.has(id)){jobs.set(id,{mode:b.messages[0].content});attempts++;}json(res,202,{id,streamUrl:'/v1/jobs/'+id+'/stream'});return;
 }
 const m=req.url.match(/^\/v1\/jobs\/([^/]+)\/stream$/);if(m&&jobs.has(m[1])){const job=jobs.get(m[1]);res.writeHead(200,{'Content-Type':'text/event-stream','X-Private-Upstream':'PRIVATE_HEADER'});res.write(delta(null));
  const timer=setTimeout(()=>{if(job.mode==='hold')return;if(job.mode==='unknown'){res.end();return;}res.end(delta('stop')+'data: [DONE]\n\n');},120);
  res.on('close',()=>{clearTimeout(timer);if(job.mode==='hold')disconnects++;});return;
 }json(res,404,{});
});
provider.listen(7779,'127.0.0.1');
const config=require('/function/.vc-config.json');
if(config.maxDuration!==360||config.supportsCancellation!==true)throw Error('Artifact lifetime configuration mismatch');
const handler=require('/function/'+config.handler);
http.createServer((req,res)=>{
 if(req.url==='/_fixture/status'){json(res,200,{submissions,attempts,registered,settled,disconnects});return;}
 req.headers.host=req.headers['x-fixture-host']||'nova.galx.ai';delete req.headers['x-fixture-host'];req.headers['x-forwarded-proto']='https';
 const tasks=[];
 context.run({waitUntil(task){registered++;tasks.push(task);void task.finally(()=>{settled++;});}},()=>{Promise.resolve(handler(req,res)).catch(()=>{if(!res.headersSent)json(res,500,{error:'fixture_handler_error'});else res.destroy();});});
}).listen(7777,'0.0.0.0',()=>console.log('Artifact fixture ready'));
