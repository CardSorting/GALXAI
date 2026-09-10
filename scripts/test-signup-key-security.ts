import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '../src/app/api/keys/route';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { ApiKeyRepository } from '../src/lib/supabase/repositories/ApiKeyRepository';
import { GalxPersistence } from '../src/lib/storage/GalxPersistence';
import { randomUUID } from 'node:crypto';

test('keys cannot impersonate another account, invent paid status, mint credits, or leak private failures',async()=>{
  const original = [GalxAuthEngine.getInstance,ApiKeyRepository.getInstance,GalxPersistence.getInstance];
  const previousUrl = process.env.DATABASE_URL, previousPool = globalThis.__galx_pg_pool;
  const sentinel = 'private-diagnostic-sentinel';
  let authenticated = false, failure = false, paid = false, owner = 'other', saves = 0, cacheWrites = 0;
  const key: any = {id:'key-fixture',userId:'owner',name:'API key',prefix:'galx_test_',scopes:['images:generate'],computePool:sentinel,keyHash:sentinel};
  const req = (method: string, body?: unknown, query='')=>new NextRequest(`https://galx.ai/api/keys${query}`,{
    method,headers:{authorization:'Bearer galx_sess_fixture','content-type':'application/json'},...(body ? {body:JSON.stringify(body)} : {}),
  });
  process.env.DATABASE_URL='postgresql://unused-local-fixture';
  globalThis.__galx_pg_pool={query:async()=>({rows:[{id:'00000000-0000-4000-8000-000000000001',user_id:'owner',balance_usd:5,proof_of_deposit_verified:paid,deposited_total_usd:paid?25:0}]})} as any;
  GalxAuthEngine.getInstance=()=>({verifySession:async()=>({valid:authenticated,claims:{sub:'owner',email:'owner@example.test',scopes:['admin:*']}})}) as any;
  ApiKeyRepository.getInstance=()=>({getUserKeysETag:async()=> 'etag',getGatewayKeys:async()=>[key],getGatewayKeyById:async()=>({...key,userId:owner}),
    saveGatewayKey:async(value: any,options: any)=>{assert.equal(options.requireRemote,true); if(failure) throw new Error(sentinel); assert.equal(value.userId,'owner'); if(!paid) assert.equal(value.rateLimitPerMinute,60); saves++;},
    revokeKey:async()=>{saves++;},
  }) as any;
  GalxPersistence.getInstance=()=>({getGatewayKeys:()=>[],apiKeyTable:{put:()=>{cacheWrites++;}},saveGatewayKey:()=>{cacheWrites++;},logAudit:()=>{}}) as any;
  try {
    for (const [handler,request] of [
      [GET,req('GET',undefined,'?userId=other')], [POST,req('POST',{name:'Abuse',userId:'other',hasVerifiedDeposit:true})],
      [PATCH,req('PATCH',{id:'key-fixture',name:'Abuse'})], [DELETE,req('DELETE',undefined,'?id=key-fixture&userId=other')],
    ] as const) assert.equal((await handler(request)).status,401);
    assert.equal(saves,0);
    authenticated=true;
    assert.equal((await GET(req('GET',undefined,'?userId=other'))).status,403);
    assert.equal((await POST(req('POST',{userId:'other'}))).status,403);
    assert.equal((await PATCH(req('PATCH',{id:'key-fixture'}))).status,403);
    assert.equal((await DELETE(req('DELETE',undefined,'?id=key-fixture&userId=other'))).status,403);
    assert.equal(saves,0);
    const listed = await GET(req('GET'));
    assert.equal(listed.status,200); assert(!(await listed.text()).includes(sentinel));
    const issued = await POST(req('POST',{name:'Welcome',hasVerifiedDeposit:true,depositedAmount:999999,rateLimitPerMinute:10000,signupCredit:999999}));
    assert.equal(issued.status,200); assert.equal(issued.headers.get('cache-control'),'private, no-store');
    const body = await issued.json();
    assert.equal(body.key.rateLimitPerMinute,60);
    for(const name of ['freeGrantUsd','freeMonthlyGrantUsd','computePool','keyHash']) {assert(!(name in body));assert(!(name in body.key));}
    owner='owner';
    assert.equal((await PATCH(req('PATCH',{id:'key-fixture',rateLimitPerMinute:10000,hasVerifiedDeposit:true}))).status,200);
    failure=true;
    const before=cacheWrites;
    const failed=await POST(req('POST',{name:'Failure'}));
    assert.equal(failed.status,503); assert(!(await failed.text()).includes(sentinel)); assert.equal(cacheWrites,before);
    failure=false; paid=true;
    assert.equal((await POST(req('POST',{name:'Paid',rateLimitPerMinute:120}))).status,200);
    assert.equal((await DELETE(req('DELETE',undefined,'?id=key-fixture'))).status,200);
  } finally {
    [GalxAuthEngine.getInstance,ApiKeyRepository.getInstance,GalxPersistence.getInstance]=original as any;
    globalThis.__galx_pg_pool=previousPool;
    if(previousUrl===undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL=previousUrl;
  }
});

test('strict key writes cannot activate or change a cached key before storage succeeds',async()=>{
  const previousEnv={...process.env}, previousPool=globalThis.__galx_pg_pool;
  const repo=ApiKeyRepository.getInstance();
  const key:any={id:randomUUID(),userId:'owner',name:'Original',prefix:'galx_test_',keyHash:randomUUID(),rateLimitPerMinute:60,revoked:false,createdAtMs:Date.now()};
  try {
    for(const name of Object.keys(process.env)) if(name==='DATABASE_URL' || /^(NEXT_PUBLIC_)?SUPABASE_/.test(name)) delete process.env[name];
    await assert.rejects(repo.saveGatewayKey(key,{requireRemote:true}),/storage was unreachable/);
    assert.equal((repo as any).activeKeyById.get(key.id),undefined);
    process.env.DATABASE_URL='postgresql://unused-local-fixture';
    globalThis.__galx_pg_pool={query:async()=>({rows:[],rowCount:1})} as any;
    await repo.saveGatewayKey(key,{requireRemote:true});
    assert.equal((repo as any).activeKeyById.get(key.id).name,'Original');
    delete process.env.DATABASE_URL;
    await assert.rejects(repo.saveGatewayKey({...key,name:'Unpersisted'},{requireRemote:true}),/storage was unreachable/);
    assert.equal((repo as any).activeKeyById.get(key.id).name,'Original');
  } finally {
    for(const name of Object.keys(process.env)) if(!Object.hasOwn(previousEnv,name)) delete process.env[name];
    Object.assign(process.env,previousEnv);globalThis.__galx_pg_pool=previousPool;
  }
});
