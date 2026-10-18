import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { publicAccountApi, publicAccountResult } from '../src/lib/auth/public-account-api';
import { accountClientOptions } from '../src/lib/auth/account-client-options';

const env={NEXT_PUBLIC_ACCOUNT_API_URL:'https://galx.ai',NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY:'sb_publishable_fixture',ACCOUNT_API_INTERNAL_URL:'http://127.0.0.1:55110'};
async function environment(fn:()=>Promise<void>|void){
  const keys=[...Object.keys(env),'GALX_REQUEST_ORIGIN_MODE','GALX_SELF_HOST_AUTHORITY'];
  const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,env);delete process.env.GALX_REQUEST_ORIGIN_MODE;delete process.env.GALX_SELF_HOST_AUTHORITY;
  try{await fn();}finally{for(const key of keys){delete process.env[key];if(old[key]!==undefined)process.env[key]=old[key];}}
}
const request=(path='token',extra:RequestInit={})=>new NextRequest('https://galx.ai/auth/v1/'+path,{method:'POST',...extra,headers:{apikey:env.NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY,'Content-Type':'application/json',...(extra.headers||{})},body:extra.body??(extra.method==='GET'?undefined:'{}')});
test('account DTO explicitly removes provider diagnostics, secrets and editable role claims',()=>{
  const value=publicAccountResult({access_token:'opaque-access',refresh_token:'opaque-refresh',expires_in:3600,internal_config:'PRIVATE_MARKER',user:{id:'user-1',email:'person@example.invalid',private_key:'PRIVATE_MARKER',user_metadata:{name:'Person',role:'admin',vault:'PRIVATE_MARKER'},app_metadata:{provider:'email',providers:['email'],internalTopology:'PRIVATE_MARKER'},identities:[{id:'identity-1',provider:'email',provider_token:'PRIVATE_MARKER',identity_data:{email:'person@example.invalid',name:'Person',secret:'PRIVATE_MARKER'}}]}},'token');
  const body=JSON.stringify(value);assert(!body.includes('PRIVATE_MARKER'));assert(!body.includes('admin'));assert(body.includes('opaque-access'));assert(body.includes('Person'));
});
test('public transport uses explicit headers and DTOs, discarding upstream operational headers',()=>environment(async()=>{
  let calls=0;
  const transport:typeof fetch=async(input,init)=>{calls++;assert.equal(String(input),'http://127.0.0.1:55110/auth/v1/token');const headers=new Headers(init?.headers);assert.equal(headers.get('cookie'),null);assert.equal(headers.get('x-forwarded-host'),null);return Response.json({access_token:'opaque-access',user:{id:'user-1',internal:'PRIVATE_MARKER'}},{headers:{server:'PRIVATE_MARKER','x-upstream-host':'PRIVATE_MARKER','set-cookie':'private=PRIVATE_MARKER'}});};
  const response=await publicAccountApi(request('token',{headers:{cookie:'private=PRIVATE_MARKER','x-forwarded-host':'hostile.invalid'}}),'token',transport);
  assert.equal(response.status,200);assert.equal(calls,1);assert.equal(response.headers.get('server'),null);assert.equal(response.headers.get('set-cookie'),null);assert.match(response.headers.get('cache-control')||'',/no-store/);assert(!JSON.stringify([...response.headers]).includes('PRIVATE_MARKER'));assert(!(await response.text()).includes('PRIVATE_MARKER'));
}));
test('admin paths, arbitrary RPCs, foreign origins and unknown API keys never reach upstream',()=>environment(async()=>{
  const transport:typeof fetch=async()=>{throw Error('Transport must not be called.');};
  for(const operation of ['admin/users','health','rpc/unsafe','../admin'])assert.equal((await publicAccountApi(request(operation),'admin/users',transport)).status,404);
  assert.equal((await publicAccountApi(request('token',{headers:{origin:'https://hostile.invalid'}}),'token',transport)).status,403);
  assert.equal((await publicAccountApi(request('token',{headers:{apikey:'service-role-shaped-but-not-public'}}),'token',transport)).status,401);
}));
test('raw errors and unavailable transport yield only bounded authored errors without retries',()=>environment(async()=>{
  let calls=0;
  const rejected:typeof fetch=async()=>{calls++;return Response.json({error_code:'internal_database_error',msg:'PRIVATE_MARKER SELECT secret FROM private.table',details:{host:'PRIVATE_MARKER'}},{status:500,headers:{'x-debug':'PRIVATE_MARKER'}});};
  const response=await publicAccountApi(request(),'token',rejected);assert.equal(response.status,503);assert.equal(calls,1);assert(!(await response.text()).includes('PRIVATE_MARKER'));assert.equal(response.headers.get('x-debug'),null);
  const offline:typeof fetch=async()=>{calls++;throw Error('PRIVATE_MARKER');};const failed=await publicAccountApi(request(),'token',offline);assert.equal(failed.status,503);assert.equal(calls,2);assert(!(await failed.text()).includes('PRIVATE_MARKER'));
}));
test('OAuth redirects reject hostile destinations and strip internal error details',()=>environment(async()=>{
  const get=request('authorize',{method:'GET'});
  for(const location of ['https://hostile.invalid/callback','http://galx.ai/auth/callback','https://user:password@galx.ai/auth/callback']){
    const response=await publicAccountApi(get,'authorize',async()=>new Response(null,{status:302,headers:{location}}));assert.equal(response.status,503);
  }
  const response=await publicAccountApi(get,'authorize',async()=>new Response(null,{status:302,headers:{location:'https://galx.ai/auth/callback?error=upstream_failure&error_description=PRIVATE_MARKER&error_code=PRIVATE_MARKER'}}));
  assert.equal(response.status,302);assert.equal(new URL(response.headers.get('location')!).searchParams.get('error'),'auth_failed');assert(!response.headers.get('location')!.includes('PRIVATE_MARKER'));
}));
test('browser OAuth and email links enter without headers while authenticated operations retain their key boundary',()=>environment(async()=>{
  let calls=0;
  for(const operation of ['authorize','callback','verify']){
    const navigation=new NextRequest('https://galx.ai/auth/v1/'+operation,{method:'GET'});
    const response=await publicAccountApi(navigation,operation,async(_input,init)=>{calls++;assert.equal(new Headers(init?.headers).get('apikey'),env.NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY);return new Response(null,{status:302,headers:{location:'https://galx.ai/auth/callback?code=opaque-code&debug=PRIVATE_MARKER'}});});
    assert.equal(response.status,302);assert(!response.headers.get('location')?.includes('PRIVATE_MARKER'));assert(new URL(response.headers.get('location')!).searchParams.has('code'));
  }
  assert.equal(calls,3);
  const denied=await publicAccountApi(new NextRequest('https://galx.ai/auth/v1/user'),'user',async()=>{throw Error('Must not reach transport.');});assert.equal(denied.status,401);
  const fragment=await publicAccountApi(request('callback',{method:'GET'}),'callback',async()=>new Response(null,{status:302,headers:{location:'https://galx.ai/auth/callback#error=server_error&error_description=PRIVATE_MARKER'}}));assert.equal(fragment.headers.get('location'),'https://galx.ai/auth/callback?error=auth_failed');
  const linked=publicAccountResult({url:'https://github.com/login/oauth/authorize?state=opaque'},'user/identities/authorize');assert.deepEqual(linked,{url:'https://github.com/login/oauth/authorize?state=opaque'});
  assert.throws(()=>publicAccountResult({url:'https://hostile.invalid/login'},'user/identities/authorize'));
}));
test('session liveness accepts only the parameterless boolean contract and denies changed owners',()=>environment(async()=>{
  let calls=0;const transport:typeof fetch=async(input)=>{calls++;assert.equal(String(input),'http://127.0.0.1:55110/rest/v1/rpc/fn_account_session_active');return Response.json(true);};
  const valid=await publicAccountApi(request(),'rpc/fn_account_session_active',transport);assert.equal(await valid.json(),true);
  const hostile=await publicAccountApi(request('token',{body:'{"user_id":"other"}'}),'rpc/fn_account_session_active',transport);assert.equal(hostile.status,400);assert.equal(calls,1);
  const malformed=await publicAccountApi(request(),'rpc/fn_account_session_active',async()=>Response.json({active:true,private:'PRIVATE_MARKER'}));assert.equal(malformed.status,503);assert(!(await malformed.text()).includes('PRIVATE_MARKER'));
}));
test('transport configuration and body bounds fail closed; browser/server cookie names stay identical',()=>environment(async()=>{
  assert.deepEqual(accountClientOptions(),{cookieOptions:{name:'sb-galx-auth-token'}});
  const transport:typeof fetch=async()=>{throw Error('Must not call transport.');};
  process.env.ACCOUNT_API_INTERNAL_URL='http://remote.invalid:55110';assert.equal((await publicAccountApi(request(),'token',transport)).status,503);
  process.env.ACCOUNT_API_INTERNAL_URL=env.ACCOUNT_API_INTERNAL_URL;
  const large=await publicAccountApi(request('token',{body:JSON.stringify({password:'x'.repeat(262144)})}),'token',transport);assert.equal(large.status,503);
}));
