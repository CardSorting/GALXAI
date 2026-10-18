/** One owned infrastructure canary. Never automatically resubmits an uncertain request. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { randomBytes,createHash,randomUUID } from 'node:crypto';
import pg from 'pg';
const state='.data/postgres-cutover',file=state+'/premium-execution-canary.json';
const read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const write=async value=>{await fs.writeFile(file,JSON.stringify(value,null,2),{mode:0o600});await fs.chmod(file,0o600);};
const hash=value=>createHash('sha256').update(value).digest('hex');
let record,ownsEvidence=false;
try{
 try{await fs.access(file);throw Error('A canary already exists; inspect its original outcome instead of resubmitting.');}catch(error){if(error.code!=='ENOENT')throw error;}
 ownsEvidence=true;
 const phase=await read(state+'/premium-cutover.json');assert.equal(phase.phase,'verified-local');
 const config=await read('.relay/service-deployment/components/premium-runtime.json');assert.equal(config.databaseDeployment,'native-postgres-v1');
 const origin='http://127.0.0.1:13301',delegated=randomBytes(32).toString('hex'),key='local-database-cutover-'+randomUUID();
 const headers={Authorization:'Bearer '+config.inferenceKey,'x-galx-tenant':delegated,'Content-Type':'application/json'};
 const models=await fetch(origin+'/v1/models',{headers,signal:AbortSignal.timeout(12000)});
 if(models.status!==200){await write({observedAt:new Date().toISOString(),state:'preflight-blocked',status:models.status,providerRequestSent:false,scope:'Read-only capability preflight; no canary generation submitted.'});throw Error('Accepted runtime capabilities are required.');}
 const ids=(await models.json()).data.map(value=>value.id);
 const model=ids.includes('gpt-5.6-terra')?'gpt-5.6-terra':ids.find(value=>typeof value==='string'&&!value.startsWith('image:'));
 assert(model,'A verified text capability is required.');
 const body=JSON.stringify({model,messages:[{role:'user',content:'Reply with only OK.'}],reasoning_effort:'low',max_tokens:8,stream:true});
 const requestKey=hash(JSON.stringify([hash(delegated),'text',key]));
 record={submittedAt:new Date().toISOString(),state:'submission-started',requestKey,idempotencyKey:key,delegated,requestBodySha256:hash(body),scope:'One synthetic infrastructure tenant; no customer account debit or real user content.'};await write(record);
 let response=await fetch(origin+'/v1/chat/completions',{method:'POST',headers:{...headers,'Idempotency-Key':key},body,signal:AbortSignal.timeout(90000)});
 record.initialStatus=response.status;await write(record);
 if(response.status===202){
  const accepted=await response.json();assert.match(accepted.streamUrl,/^\/v1\/jobs\/[\w-]{1,96}\/stream$/);
  response=await fetch(origin+accepted.streamUrl,{headers,signal:AbortSignal.timeout(90000)});
 }
 assert.equal(response.status,200,'The canary must return a completion stream.');
 const text=await response.text();assert(text.includes('[DONE]'),'The stream must have explicit terminal completion.');
 assert(!text.includes(config.inferenceKey)&&!text.includes(config.databaseUrl)&&!/host\.docker\.internal|pooler\.supabase\.com|galx-postgres-/.test(text),'The completion must not expose operational credentials or destinations.');
 record.streamCompleted=true;record.responseSha256=hash(text);await write(record);
 const db=new pg.Client({host:path.resolve('.data/local-postgres/premium/socket'),port:55433,user:os.userInfo().username,database:'galx_relay_premium'});
 await db.connect();
 try{
  let row;
  for(let i=0;i<20;i++){
   row=(await db.query('SELECT state,settled,actual_tokens,execution_id FROM private.relay_executions WHERE request_key=$1',[requestKey])).rows[0];
   if(row?.state==='completed'&&row.settled)break;await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.equal(row?.state,'completed');assert.equal(row?.settled,true);assert(Number(row.actual_tokens)>0);
  const duplicate=await fetch(origin+'/v1/chat/completions',{method:'POST',headers:{...headers,'Idempotency-Key':key},body,signal:AbortSignal.timeout(15000)});
  assert.equal(duplicate.status,202,'A duplicate must refer to the already recorded result.');
  const prior=await duplicate.json();assert.equal(prior.id,row.execution_id);
  assert.equal(Number((await db.query('SELECT count(*) FROM private.relay_executions WHERE request_key=$1',[requestKey])).rows[0].count),1);
  record={...record,state:'passed',observedAt:new Date().toISOString(),localExecutionCompleted:true,centralSettlementAcknowledged:true,duplicateReusedSameExecution:true,actualTokens:Number(row.actual_tokens)};
  await write(record);
  console.log(JSON.stringify({localExecutionCompleted:true,centralSettlementAcknowledged:true,duplicateReusedSameExecution:true,actualTokens:Number(row.actual_tokens),realProviderRequest:true,realCustomerAccount:false}));
 }finally{await db.end();}
}catch(error){
 if(record)await write({...record,state:'unconfirmed',observedAt:new Date().toISOString(),failure:String(error.message).slice(0,500)});
 else if(ownsEvidence){try{await fs.access(file);}catch{await write({observedAt:new Date().toISOString(),state:'preflight-blocked',providerRequestSent:false,failure:String(error.message).slice(0,500)});}}
 console.error('Premium canary was not confirmed; preserve its original request and inspect private evidence. No automatic retry occurred.');process.exitCode=1;
}
