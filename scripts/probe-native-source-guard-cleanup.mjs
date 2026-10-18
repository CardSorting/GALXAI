/** Rolled-back guard/cleanup rehearsal on the uncoupled local central copy only. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { localPostgresTableManifest } from './local-postgres.mjs';
const state='.data/postgres-cutover';let client;
try{
 assert.equal(JSON.parse(await fs.readFile(state+'/phase.json','utf8')).state,'preparation');
 const up=await fs.readFile('deploy/postgres-cutover/central-source-freeze.sql','utf8'),down=await fs.readFile('deploy/postgres-cutover/central-source-freeze.down.sql','utf8');
 const targetClause="current_database() <> 'postgres'";assert.equal(up.split(targetClause).length,2);
 const localUp=up.replace(targetClause,"current_database() <> 'galxai'");
 client=new pg.Client({host:path.resolve('.data/local-postgres/central/socket'),port:55432,user:os.userInfo().username,database:'galxai'});await client.connect();
 const included=['public','private','auth','galx_account_auth','supabase_migrations','extensions'];
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
 try{
  const before=await localPostgresTableManifest(client,included);
  await client.query('SET LOCAL ROLE postgres');await client.query(localUp);await client.query('RESET ROLE');
  assert.equal((await client.query("SELECT count(*)::int count FROM pg_trigger WHERE tgname='galx_source_retired_20261017'")).rows[0].count,195);
  await client.query(down);
  assert.equal((await client.query("SELECT count(*)::int count FROM pg_trigger WHERE tgname='galx_source_retired_20261017'")).rows[0].count,0);
  assert.deepEqual(await localPostgresTableManifest(client,included),before);
 }finally{await client.query('ROLLBACK');}
 assert.equal((await client.query("SELECT count(*)::int count FROM pg_trigger WHERE tgname='galx_source_retired_20261017'")).rows[0].count,0);
 const receipt={observedAt:new Date().toISOString(),target:'Uncoupled local central preparation copy',sourceTargetClauseOnlyAdapted:true,sourceSqlSha256:createHash('sha256').update(up).digest('hex'),cleanupSqlSha256:createHash('sha256').update(down).digest('hex'),guardTables:195,cleanup:'pass',tableDataOwnersAclsRls:'unchanged',allDdlRolledBack:true};
 await fs.writeFile(state+'/native-guard-cleanup-probe.json',JSON.stringify(receipt,null,2),{mode:0o600});console.log(JSON.stringify(receipt));
}catch(error){await fs.writeFile(state+'/native-cleanup-probe-error.secret.log',String(error.message),{mode:0o600});console.error('Native guard cleanup probe failed and was rolled back; inspect its private evidence.');process.exitCode=1;}
finally{await client?.end().catch(()=>{});}
