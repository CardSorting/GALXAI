import './lib/require-isolated-integration-env.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const root = new URL('../', import.meta.url), migration = '20260915073601_central_relay_account_foundation';
const up = await readFile(new URL(`supabase/migrations/${migration}.sql`,root),'utf8');
const down = await readFile(new URL(`supabase/rollbacks/${migration}.down.sql`,root),'utf8');
let checks = 0;
const check = (actual: unknown, expected: unknown) => { assert.deepEqual(actual,expected); checks++; };
async function denied(sql: string, values: unknown[] = [], role = 'postgres') {
  const c = await pool.connect();
  try { await c.query('BEGIN'); await c.query(`SET LOCAL SESSION AUTHORIZATION ${role}`); await assert.rejects(c.query(sql,values)); checks++; }
  finally { await c.query('ROLLBACK'); c.release(); }
}
const tables = ['galx_relay_pools','galx_relay_installations','galx_relay_account_assignments','galx_relay_registration_operations'];
const installs = { premium: randomUUID(), standard: randomUUID() }, desktops = [randomUUID(),randomUUID()], operation = randomUUID();
const accounts = ['codex_sh_'+'c'.repeat(24),'codex_sh_'+'d'.repeat(24)];
const assignmentSQL = 'INSERT INTO private.galx_relay_account_assignments(account_id,pool_id,installation_id,managed_desktop_id,registration_operation_id) VALUES($1,$2,$3,$4,$5)';
const receiptSQL = 'INSERT INTO private.galx_relay_registration_operations(id,account_id,pool_id,installation_id,actor_id,request_sha256) VALUES($1,$2,$3,$4,$5,$6)';
try {
  check((await pool.query('SELECT id,account_class,workloads,registration_enabled FROM private.galx_relay_pools ORDER BY id')).rows,
    [{id:'premium',account_class:'paid',workloads:['text','sites','images'],registration_enabled:false},{id:'standard',account_class:'free',workloads:['text'],registration_enabled:false}]);
  check((await pool.query("SELECT count(*)::integer AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relname=ANY($1) AND c.relrowsecurity AND c.relforcerowsecurity",[tables])).rows[0].n,4);
  for (const role of ['anon','authenticated','service_role','galx_desktop_writer']) for (const table of tables) {
    await denied(`SELECT * FROM private.${table}`,[],role);
    check((await pool.query('SELECT has_table_privilege($1,$2,\'INSERT\') AS allowed',[role,`private.${table}`])).rows[0].allowed,false);
  }
  await denied("UPDATE private.galx_relay_pools SET registration_enabled=true WHERE id='premium'");
  await denied("INSERT INTO private.galx_relay_pools(id,account_class,workloads) VALUES('standard','paid',ARRAY['text','images'])");
  for (const p of ['premium','standard'] as const) await pool.query('INSERT INTO private.galx_relay_installations(id,pool_id,host_id) VALUES($1,$2,$3)',[installs[p],p,randomUUID()]);
  await denied('INSERT INTO private.galx_relay_installations(id,pool_id,host_id) VALUES($1,$2,$3)',[randomUUID(),'premium',randomUUID()]);
  await denied("UPDATE private.galx_relay_installations SET pool_id='standard' WHERE id=$1",[installs.premium]);
  for (let i=0;i<accounts.length;i++) await pool.query('SELECT private.enroll_desktop_shard($1,$2,NULL)',[desktops[i],JSON.stringify({id:accounts[i],user_id:'foundation-test-owner',encrypted_ciphertext:`fixture-${i}`,encrypted_iv:'fixture-iv',encrypted_tag:'fixture-tag',key_version:'v1',credential_expires_at_ms:Date.now()+3600000})]);
  await denied(assignmentSQL,[accounts[0],'premium',installs.premium,desktops[0],operation]);
  await denied(receiptSQL,[operation,accounts[0],'premium',installs.premium,randomUUID(),'a'.repeat(64)]);
  // Fixture-only DDL opens the dormant gate to exercise the future relational
  // contract. No application role can do this; no production activation implied.
  const c=await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('ALTER TABLE private.galx_relay_pools DISABLE TRIGGER guard_relay_foundation_row');
    await c.query('ALTER TABLE private.galx_relay_pools DROP CONSTRAINT galx_relay_registration_not_activated');
    await c.query('UPDATE private.galx_relay_pools SET registration_enabled=true');
    await c.query('ALTER TABLE private.galx_relay_pools ENABLE TRIGGER guard_relay_foundation_row');
    await c.query('COMMIT');
  } finally { c.release(); }
  await denied(assignmentSQL,[accounts[0],'standard',installs.premium,desktops[0],operation]);
  await denied(assignmentSQL,[accounts[0],'premium',installs.premium,desktops[1],operation]);
  // An assignment without its exact receipt cannot commit.
  const orphan=await pool.connect();try {await orphan.query('BEGIN');await orphan.query(assignmentSQL,[accounts[0],'premium',installs.premium,desktops[0],operation]);await assert.rejects(orphan.query('COMMIT'));checks++;}finally{await orphan.query('ROLLBACK');orphan.release();}
  check((await pool.query('SELECT count(*)::integer AS n FROM private.galx_relay_account_assignments')).rows[0].n,0);
  async function claim(p:'premium'|'standard') {
    const client=await pool.connect(), op=randomUUID();
    try {await client.query('BEGIN');await client.query(assignmentSQL,[accounts[0],p,installs[p],desktops[0],op]);await client.query(receiptSQL,[op,accounts[0],p,installs[p],randomUUID(),'b'.repeat(64)]);await client.query('COMMIT');return p;}
    catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  const results=await Promise.allSettled([claim('premium'),claim('standard')]);check(results.filter(r=>r.status==='fulfilled').length,1);
  const assignment=(await pool.query('SELECT * FROM private.galx_relay_account_assignments')).rows[0];
  check((await pool.query('SELECT count(*)::integer AS n FROM private.galx_relay_registration_operations')).rows[0].n,1);
  for (const table of tables) await denied(`TRUNCATE private.${table} CASCADE`);
  await denied("UPDATE private.galx_relay_account_assignments SET pool_id='standard' WHERE account_id=$1",[accounts[0]]);
  await denied('DELETE FROM private.galx_relay_account_assignments WHERE account_id=$1',[accounts[0]]);
  await denied("UPDATE private.galx_relay_registration_operations SET request_sha256=$1",['c'.repeat(64)]);
  await denied('DELETE FROM public.galx_shard_accounts WHERE id=$1',[accounts[0]]);
  await denied(down); // Foundation rollback cannot reverse a later activation.
  const reset=await pool.connect();try {await reset.query('BEGIN');await reset.query('ALTER TABLE private.galx_relay_pools DISABLE TRIGGER guard_relay_foundation_row');await reset.query('UPDATE private.galx_relay_pools SET registration_enabled=false');await reset.query('ALTER TABLE private.galx_relay_pools ADD CONSTRAINT galx_relay_registration_not_activated CHECK(registration_enabled=false)');await reset.query('ALTER TABLE private.galx_relay_pools ENABLE TRIGGER guard_relay_foundation_row');await reset.query(down);await reset.query(up);await reset.query('COMMIT');}catch(e){await reset.query('ROLLBACK');throw e;}finally{reset.release();}
  check((await pool.query('SELECT * FROM private.galx_relay_account_assignments')).rows[0],assignment);
  check((await pool.query('SELECT count(*)::integer AS n FROM private.galx_relay_registration_operations')).rows[0].n,1);
  await denied(assignmentSQL,[accounts[1],'standard',installs.standard,desktops[1],randomUUID()]);
  console.log(`Relay foundation: ${checks} checks passed; activation, role denial, relational scope, concurrent claims, immutable outcomes and retained rollback/reapply. Fixture-only gate override; no production runtime acceptance.`);
} finally { await pool.end(); }
