/** Full rolled-back source guard probe; no permanent source DDL or data mutation. */
import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
const state='.data/postgres-cutover';let client;
try{
 const env=parseEnv(await fs.readFile('.env.local','utf8')),url=new URL(env.DATABASE_URL),config=JSON.parse(await fs.readFile('.relay/service-deployment/components/central.json','utf8'));
 assert(decodeURIComponent(url.username).endsWith('.mazhcjisettrzbqhorvp')&&url.hostname.endsWith('.pooler.supabase.com'));
 client=new pg.Client({host:url.hostname,port:5432,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl:{rejectUnauthorized:true,ca:config.databaseCa},connectionTimeoutMillis:10000});await client.connect();
 const up=await fs.readFile('deploy/postgres-cutover/central-source-freeze.sql','utf8'),down=await fs.readFile('deploy/postgres-cutover/central-source-freeze.down.sql','utf8');
 const checks=[];await client.query('BEGIN');
 try{
  await client.query(up);
  const inventory=(await client.query("SELECT count(*)::int count FROM pg_trigger WHERE tgname='galx_source_retired_20261017'")).rows[0].count;assert.equal(inventory,195);
  for(const table of ['auth.users','auth.sessions','auth.refresh_tokens','auth.identities','public.galx_shard_accounts','private.galx_relay_installation_runtime']){
   await client.query('SAVEPOINT canary');let code;
   try{await client.query('DELETE FROM '+table+' WHERE false');}catch(error){code=error.code;}
   finally{await client.query('ROLLBACK TO SAVEPOINT canary');}
   assert.equal(code,'25006','The statement guard must deny a zero-row write on '+table);checks.push({table,emptyDeleteDenied:true});
  }
  await client.query('SAVEPOINT denied_thaw');let thawCode;
  try{await client.query(down);}catch(error){thawCode=error.code;}
  finally{await client.query('ROLLBACK TO SAVEPOINT denied_thaw');}
  assert.equal(thawCode,'P0001','Unapproved source thaw must be denied.');
  await client.query("SELECT set_config('galx.cutover.allow_source_thaw','owner-approved-before-local-writes',true)");await client.query(down);
  // Source Auth ownership prevents DROP TRIGGER. The owned guard function is
  // disarmed instead; only the native administrator removes imported triggers.
  assert.equal((await client.query("SELECT count(*)::int count FROM pg_trigger WHERE tgname='galx_source_retired_20261017'")).rows[0].count,195);
  for(const table of ['auth.users','auth.sessions'])assert.equal((await client.query('DELETE FROM '+table+' WHERE false')).rowCount,0);
 }finally{await client.query('ROLLBACK');}
 assert.equal((await client.query("SELECT count(*)::int count FROM pg_trigger WHERE tgname='galx_source_retired_20261017'")).rows[0].count,0);
 const receipt={observedAt:new Date().toISOString(),project:'mazhcjisettrzbqhorvp',sourceGuardTables:195,metadataException:'auth.schema_migrations platform version marker only',checks,unapprovedSourceThawDenied:true,sourceThawPair:'Owned function disarmed and zero-row Auth writes accepted inside the rolled-back probe; no protected trigger ownership changed',sourceDataChanged:false,allGuardDdlRolledBack:true,upSha256:createHash('sha256').update(up).digest('hex'),downSha256:createHash('sha256').update(down).digest('hex')};
 await fs.writeFile(state+'/central-source-freeze-probe.json',JSON.stringify(receipt,null,2),{mode:0o600});console.log(JSON.stringify(receipt));
}catch(error){await fs.writeFile(state+'/central-freeze-probe-error.secret.log',String(error.message),{mode:0o600});console.error('The source guard probe failed and was rolled back; inspect its private error before continuing.');process.exitCode=1;}
finally{await client?.end().catch(()=>{});}
