import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { centralServer } from '../src/relay/pool-central.js';
import { CentralClient, hash, registrationErrors } from '../src/relay/pool-protocol.js';
import { CapabilityDiscoveryError } from '../src/relay/capability-discovery.js';
import { DesktopCredentialError } from '../src/relay/desktop-credentials.js';

const now = Math.floor(Date.now()/1000);
const accessToken = 'header.'+Buffer.from(JSON.stringify({iat:now-60,exp:now+3600,'https://api.openai.com/auth':{chatgpt_account_id:'synthetic-account',chatgpt_plan_type:'pro'}})).toString('base64url')+'.SECRET_TOKEN';
const files = [{source:'codex',modifiedAt:Date.now(),data:{tokens:{account_id:'synthetic-account',access_token:accessToken}}}];
const identity = {pool:'premium' as const,installationId:'00000000-0000-4000-8000-000000000001'};
const base = {id:'synthetic-record',user_id:'synthetic-owner',provider:'openai',status:'healthy',permission_retracted:false};
const scenarios = [
  {name:'historical duplicates',rows:[base,{...base,id:'disabled-record',permission_retracted:true}],code:'credential_account_ambiguous',status:409},
  {name:'revoked account',rows:[{...base,permission_retracted:true}],code:'credential_not_allowed',status:409},
  {name:'different desktop',rows:[{...base,managed_desktop_id:'another-desktop'}],code:'credential_not_allowed',status:409},
  {name:'missing sign-in',rows:[],files:[],code:'credential_missing',status:422},
  {name:'expired sign-in',rows:[],validateError:new DesktopCredentialError('credential_expired'),code:'credential_expired',status:422},
  {name:'provider rejects credential',rows:[],validateError:new CapabilityDiscoveryError('invalid_credential',401),code:'credential_rejected',status:422},
  {name:'inventory unavailable',rows:[],validateError:new CapabilityDiscoveryError('inventory_unavailable',403),code:'credential_check_unavailable',status:503},
  {name:'unknown upstream error',rows:[],validateError:new Error('PRIVATE_UPSTREAM_PAYLOAD'),code:'service_unavailable',status:503},
];
for(const scenario of scenarios) test(`registration errors preserve ${scenario.name} without exposing credentials`,async()=>{
  let writes=0;
  const server=centralServer({identitySecret:hash('fixture-identity'),decrypt:()=>({accountId:'synthetic-account'}),
    validate:async()=>{if(scenario.validateError)throw scenario.validateError;return ['fixture-model'];},
    query:async(token,action)=>{
      if(action==='authenticate')return{...identity,kind:token===hash(hash('registrar'))?'registrar':'viewer'};
      if(action==='registration_context')return{desktopId:identity.installationId,accountId:null,accounts:scenario.rows};
      writes++;throw Error('Unexpected mutation');
    }});
  server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const body={id:identity.installationId,ticket:'a'.repeat(43),files:scenario.files??files};
  try {
    const response=await fetch(origin+'/registrar/review',{method:'POST',headers:{Authorization:'Bearer '+hash('registrar'),'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal(response.status,scenario.status);assert.equal(response.headers.get('cache-control'),'no-store');
    const raw=await response.text(),data=JSON.parse(raw);
    assert.equal(data.error.code,scenario.code);assert.deepEqual(Object.keys(data),['error']);assert.deepEqual(Object.keys(data.error),['code','message']);
    assert(!/SECRET_TOKEN|PRIVATE_UPSTREAM|synthetic-account|synthetic-owner|disabled-record/.test(raw));
    const client=new CentralClient(origin,hash('registrar'),identity);
    await assert.rejects(client.call('/registrar/review',body),(error:any)=>{
      assert.equal(error.status,scenario.status);
      if(scenario.code!=='service_unavailable'){assert.equal(error.code,scenario.code);assert.equal(error.message,registrationErrors[scenario.code].message);}
      assert(!/SECRET_TOKEN|PRIVATE_UPSTREAM/.test(error.message));return true;
    });
    const denied=await fetch(origin+'/registrar/review',{method:'POST',headers:{Authorization:'Bearer '+hash('viewer'),'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal(denied.status,403);assert(!JSON.stringify(await denied.json()).includes(scenario.code));assert.equal(writes,0);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('central client uses its own allowlist, including hostile prototype and unknown error codes',async()=>{
  for(const code of [...Object.keys(registrationErrors),'__proto__','constructor','unknown_private_diagnostic']){
    const client=new CentralClient('http://127.0.0.1:1',hash('registrar'),identity,(async()=>Response.json({error:{code,message:'PRIVATE_RESPONSE'}},{status:503})) as typeof fetch);
    await assert.rejects(client.call('/registrar/review'),(error:any)=>!error.message.includes('PRIVATE_RESPONSE')&&(Object.hasOwn(registrationErrors,code)?error.message===registrationErrors[code].message:error.code==='control_unavailable'));
  }
});

test('connect verifies before one scoped write; unchanged refresh still checks rejected connection state',async()=>{
  let mutations=0, refreshes=0, verified=false;
  const desktopId=identity.installationId,accountId='codex_sh_'+hash('connected account').slice(0,24);
  let context:any={desktopId,accountId:null,accounts:[]};
  const server=centralServer({identitySecret:hash('fixture-identity'),decrypt:()=>({accountId:'synthetic-account',accessToken}),
    encrypt:()=>({encrypted_ciphertext:'cipher',encrypted_iv:'iv',encrypted_tag:'tag',key_version:'v1'}),
    validate:async()=>{verified=true;return ['fixture-model'];},query:async(_token,action,body)=>{
      if(action==='authenticate')return{...identity,kind:'registrar'};
      if(action==='registration_context')return context;
      if(action==='connect'){assert(verified);mutations++;assert.equal(body.expected,undefined);return{id:desktopId,accountId,state:'registered',privateField:'SECRET'};}
      if(action==='refresh'){refreshes++;throw new DesktopCredentialError('credential_rejected');}
      throw Error('Unexpected action');
    }});
  server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const client=new CentralClient(origin,hash('registrar'),identity),body={id:desktopId,ticket:'a'.repeat(43),files};
  try{
    assert.deepEqual(await client.call('/registrar/connect',body),{id:desktopId,state:'registered',accountId});assert.equal(mutations,1);
    context={desktopId,accountId,accounts:[{...base,id:accountId,managed_desktop_id:desktopId}]};
    await assert.rejects(client.call('/registrar/refresh',body),(e:any)=>e.code==='credential_rejected');assert.equal(refreshes,1);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
