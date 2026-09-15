import './lib/require-isolated-integration-env.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const id = 'codex_sh_' + 'a'.repeat(24), desktop = randomUUID();
const row = { id, user_id: 'test-owner', encrypted_ciphertext: 'aa', encrypted_iv: 'bb', encrypted_tag: 'cc', key_version: 'v1', credential_expires_at_ms: Date.now()+3600000 };
const enroll = (d=desktop, r=row, expected: unknown=null) => pool.query('SELECT private.enroll_desktop_shard($1,$2,$3) id',[d,JSON.stringify(r),expected && JSON.stringify(expected)]);
const stored = async () => (await pool.query('SELECT * FROM public.galx_shard_accounts WHERE id=$1',[id])).rows[0];
let checks = 0;
async function denied(role: string, sql: string, params: unknown[] = []) {
  const c = await pool.connect();
  try { await c.query('BEGIN'); await c.query(`SET LOCAL SESSION AUTHORIZATION ${role}`); await assert.rejects(c.query(sql,params)); checks++; }
  finally { await c.query('ROLLBACK'); c.release(); }
}
try {
  for (const role of ['anon','authenticated','service_role']) {
    await denied(role,'SELECT private.enroll_desktop_shard($1,$2,NULL)',[desktop,JSON.stringify(row)]);
    await denied(role,'SELECT private.refresh_desktop_shard($1,$2,$3,$3)',[desktop,id,JSON.stringify(row)]);
    await denied(role,'SELECT public.fn_upsert_shard_registry($1)',[JSON.stringify(row)]);
    await denied(role,'SET LOCAL ROLE galx_desktop_writer');
  }
  await denied('postgres',"INSERT INTO public.galx_shard_accounts(id,user_id,provider,encrypted_ciphertext,encrypted_iv,encrypted_tag,created_at_ms,updated_at_ms) VALUES('raw','owner','openai','aa','bb','cc',1,1)");
  const outcomes = await Promise.allSettled([enroll(),enroll(desktop,{...row,encrypted_ciphertext:'competing'})]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1); checks++;
  let before = await stored(); assert.equal(before.managed_desktop_id,desktop); checks++;
  for (const role of ['service_role','postgres']) {
    await denied(role,'UPDATE public.galx_shard_accounts SET managed_desktop_id=$1 WHERE id=$2',[randomUUID(),id]);
    await denied(role,"UPDATE public.galx_shard_accounts SET encrypted_ciphertext='forged' WHERE id=$1",[id]);
  }
  await assert.rejects(enroll(randomUUID(),row,before)); checks++;
  await assert.rejects(enroll(desktop,{...row,id:'codex_sh_'+'b'.repeat(24)})); checks++;
  // Metadata/counters remain writable and a credential refresh preserves them.
  await pool.query("UPDATE public.galx_shard_accounts SET remaining_tokens=12345, active_in_flight_count=2, status='cooldown',cooldown_until_ms=9999999999999 WHERE id=$1",[id]);
  before = await stored();
  const next={...row,encrypted_ciphertext:'dd',encrypted_iv:'ee',encrypted_tag:'ff'};
  const refresh=()=>pool.query('SELECT private.refresh_desktop_shard($1,$2,$3,$4) updated',[desktop,id,JSON.stringify(before),JSON.stringify(next)]);
  const results=await Promise.all([refresh(),refresh()]);
  assert.deepEqual(results.map(r=>r.rows[0].updated).sort(),[false,true]); checks++;
  const after=await stored(); assert.equal(after.remaining_tokens,'12345');assert.equal(after.active_in_flight_count,2);assert.equal(after.status,'cooldown'); checks++;
  await pool.query('UPDATE public.galx_shard_accounts SET permission_retracted=true WHERE id=$1',[id]);
  await assert.rejects(enroll(desktop,row,await stored())); checks++;
  assert.equal((await pool.query('SELECT private.refresh_desktop_shard($1,$2,$3,$4) updated',[desktop,id,JSON.stringify(await stored()),JSON.stringify(row)])).rows[0].updated,false); checks++;
  // Simulate a pre-migration record through the explicit test owner role.
  const c=await pool.connect();try{await c.query('BEGIN');await c.query('SET LOCAL ROLE galx_desktop_writer');await c.query('UPDATE public.galx_shard_accounts SET managed_desktop_id=NULL,desktop_enrolled_at=NULL,permission_retracted=false WHERE id=$1',[id]);await c.query('COMMIT');}finally{c.release();}
  const lease=await pool.query('SELECT public.fn_acquire_shard_lease($1,$2,100,10000,$3) result',[id,'test-owner',randomUUID()]);
  assert.equal(lease.rows[0].result.success,false);assert.equal(lease.rows[0].result.reason,'SHARD_NOT_AVAILABLE');checks++;
  await enroll(desktop,row,await stored());checks++;
  // Exercise the paired rollback and reapply without deleting retained rows.
  const root=new URL('../',import.meta.url);
  const rollback=await readFile(new URL('supabase/rollbacks/20260914231914_manual_desktop_shard_enrollment.down.sql',root),'utf8');
  const up=await readFile(new URL('supabase/migrations/20260914231914_manual_desktop_shard_enrollment.sql',root),'utf8');
  const conn=await pool.connect();try {await conn.query('BEGIN');await conn.query(rollback);await conn.query(up);await conn.query('COMMIT');}catch(e){await conn.query('ROLLBACK');throw e;}finally{conn.release();}
  assert.equal((await stored()).managed_desktop_id,desktop);checks++;
  console.log(`Manual desktop database: ${checks} checks passed (roles, raw writes, race fencing, legacy admission, retained history, rollback/reapply).`);
} finally { await pool.end(); }
