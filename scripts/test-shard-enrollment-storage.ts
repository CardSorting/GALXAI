import assert from 'node:assert/strict';
import { before, after, test, type TestContext } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { ShardRepository } from '../src/lib/supabase/repositories/ShardRepository.js';
import { resetSupabaseClients } from '../src/lib/supabase/client.js';
import { closePostgresPool } from '../src/lib/db/postgres.js';
import { isLegacyIntegrationFixture, revokeIntegrationFixture } from '../src/relay/fixture-credential-cleanup.js';
import type { GalxShardAccount } from '../src/core/contracts/GalxContracts.js';

const run=promisify(execFile);
let directory:string, pool:pg.Pool, started=false;
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'galx-enrollment-'));
  await run('initdb',['-D',path.join(directory,'data'),'-A','trust','-U','enrollment_test','--no-locale']);
  await run('pg_ctl',['-D',path.join(directory,'data'),'-l',path.join(directory,'postgres.log'),'-o',`-k ${directory} -c listen_addresses=''`,'-w','start']); started=true;
  pool=new pg.Pool({host:directory,database:'postgres',user:'enrollment_test'});
  await pool.query('CREATE TABLE galx_workspaces(id uuid PRIMARY KEY)');
  for(const name of ['galx_provider_type','galx_auth_type','galx_shard_mode','galx_credential_status']) await pool.query(`CREATE DOMAIN ${name} AS text`);
  const schema=await fs.readFile('supabase/migrations/20260822000001_galxai_schema_core.sql','utf8');
  const start=schema.indexOf('CREATE TABLE IF NOT EXISTS galx_shard_accounts (');
  await pool.query(schema.slice(start,schema.indexOf('\n);',start)+3));
  await pool.query(`ALTER TABLE galx_shard_accounts ADD COLUMN credential_expires_at_ms bigint,
    ADD COLUMN privacy_capabilities jsonb, ADD COLUMN sliding_window_quota jsonb, ADD COLUMN supported_models text[],
    ADD COLUMN unsupported_models text[], ADD COLUMN registry_source text, ADD COLUMN active_in_flight_count integer DEFAULT 0`);
});
after(async()=>{
  await closePostgresPool(); await pool?.end();
  if(started)await run('pg_ctl',['-D',path.join(directory,'data'),'-m','fast','-w','stop']);
  if(directory)await fs.rm(directory,{recursive:true,force:true});
});
const shard=(id:string):GalxShardAccount=>({id,userId:'usr_tenant_888',provider:'openai',authType:'api_key',accountLabel:'Fixture',apiKeyMasked:'fixture',
  encryptedPayload:{ciphertext:'encrypted-fixture',iv:'iv',tag:'tag',keyVersion:'v1'},shardMode:'pooled',status:'healthy',priority:1,weight:1,fencingToken:7,
  tokenBucket:{maxTokens:100,remainingTokens:42,refillRatePerMinute:1,maxRequests:10,remainingRequests:5,lastRefillTimestampMs:1},
  stats:{totalRequestsServed:3,totalTokensConsumed:7,consecutiveFailures:1},permissionRetracted:false,createdAtMs:1,updatedAtMs:1});
const secret={apiKey:'sk-openai-live-secret-test-key-12345'};
function isolatedRepository(t: TestContext) {
  const keys=['DATABASE_URL','SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL'] as const;
  const previous=new Map(keys.map(key=>[key,process.env[key]]));
  process.env.DATABASE_URL='postgres://isolated.invalid/unused';
  delete process.env.SUPABASE_URL;delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  t.after(()=>{for(const [key,value] of previous) {if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  const query=pool.query.bind(pool);t.mock.method(pg.Pool.prototype,'query',query);
  return new ShardRepository();
}
test('concurrent create-only enrollment cannot reset ownership, credentials, quotas or revocation',async t=>{
  // Execute the repository's actual SQL on a disposable cluster, never ambient credentials.
  const repo=isolatedRepository(t), input=shard('concurrent');
  const results=await Promise.allSettled([repo.saveShard(input,{requireRemote:true,createOnly:true}),repo.saveShard(input,{requireRemote:true,createOnly:true})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await pool.query("UPDATE galx_shard_accounts SET permission_retracted=true,status='revoked',remaining_tokens=9 WHERE id=$1",[input.id]);
  await assert.rejects(repo.saveShard({...input,userId:'different-owner'},{requireRemote:true,createOnly:true}),/already enrolled/);
  const row=(await pool.query('SELECT * FROM galx_shard_accounts WHERE id=$1',[input.id])).rows[0];
  assert.equal(row.user_id,input.userId);assert.equal(row.encrypted_ciphertext,'encrypted-fixture');assert.equal(row.status,'revoked');
  assert.equal(Number(row.remaining_tokens),9);assert.equal(Number(row.fencing_token),7);assert.equal(Number(row.total_requests_served),3);
});
test('fixture cleanup requires exact identity and credentials and preserves evidence',async t=>{
  const repo=isolatedRepository(t);await repo.saveShard(shard('shard_1788618090167_oai'),{requireRemote:true,createOnly:true});
  const row=(await pool.query("SELECT * FROM galx_shard_accounts WHERE id='shard_1788618090167_oai'")).rows[0];
  assert(isLegacyIntegrationFixture(row,secret));
  for(const [r,s] of [[{...row,user_id:'real-owner'},secret],[{...row,id:'real-shard'},secret],[row,{apiKey:'sk-real'}]]) {
    assert(!isLegacyIntegrationFixture(r,s));await assert.rejects(revokeIntegrationFixture(r,s),/unconfirmed/);
  }
  await pool.query('UPDATE galx_shard_accounts SET active_in_flight_count=1 WHERE id=$1',[row.id]);
  assert.equal(await revokeIntegrationFixture(row,secret),false);
  await pool.query("UPDATE galx_shard_accounts SET active_in_flight_count=0,encrypted_tag='rotated' WHERE id=$1",[row.id]);
  assert.equal(await revokeIntegrationFixture(row,secret),false);
  await pool.query("UPDATE galx_shard_accounts SET encrypted_tag='tag' WHERE id=$1",[row.id]);
  assert.equal(await revokeIntegrationFixture(row,secret),true);assert.equal(await revokeIntegrationFixture(row,secret),false);
  const final=(await pool.query('SELECT * FROM galx_shard_accounts WHERE id=$1',[row.id])).rows[0];
  assert.equal(final.status,'revoked');assert.equal(final.permission_retracted,true);assert.equal(final.encrypted_ciphertext,row.encrypted_ciphertext);
  assert.equal(final.remaining_tokens,row.remaining_tokens);assert.equal(final.total_requests_served,row.total_requests_served);
});

test('Data API enrollment uses insert-only semantics and cannot fall back to an upsert on conflict',async t=>{
  const keys=['DATABASE_URL','SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY'] as const;
  const previous=new Map(keys.map(key=>[key,process.env[key]]));
  delete process.env.DATABASE_URL;delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_URL='https://enrollment-test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_synthetic';
  resetSupabaseClients();
  t.after(()=>{resetSupabaseClients();for(const [key,value]of previous){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  const existing=(await pool.query("SELECT * FROM galx_shard_accounts WHERE id='concurrent'")).rows[0];
  let conflict=false,calls=0;
  t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=new URL(String(input));assert.equal(url.origin,'https://enrollment-test.invalid');assert.equal(url.pathname,'/rest/v1/galx_shard_accounts');
    assert.equal(init?.method,'POST');assert(!new Headers(init?.headers).get('prefer')?.includes('resolution=merge-duplicates'));calls++;
    return Response.json(conflict?{code:'23505',message:'duplicate fixture'}:existing,{status:conflict?409:201});
  });
  const repo=new ShardRepository();
  await repo.saveShard(shard('concurrent'),{requireRemote:true,createOnly:true});
  conflict=true;await assert.rejects(repo.saveShard(shard('concurrent'),{requireRemote:true,createOnly:true}),/persist registry mutation/);
  assert.equal(calls,2);
});
