import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { ApiKeyRepository } from '../src/lib/supabase/repositories/ApiKeyRepository';
import { randomUUID } from 'node:crypto';

test('public callers cannot reach private credential management', async () => {
  const { GET, POST, PATCH, DELETE } = await import('../src/app/api/keys/route');
  const request = (method: string, body?: unknown, query = '') => new NextRequest(`https://galx.ai/api/keys${query}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const response of [
    await GET(request('GET', undefined, '?userId=other')),
    await POST(request('POST', { name: 'Public key' })),
    await PATCH(request('PATCH', { id: 'key-fixture', name: 'Public key' })),
    await DELETE(request('DELETE', undefined, '?id=key-fixture')),
  ]) {
    assert.equal(response.status, 401);
    assert.doesNotMatch(await response.text(), /private-diagnostic|postgres|computePool|keyHash/i);
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
