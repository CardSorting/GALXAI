import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

// Copy structure/functions into an isolated, owner-only schema. Independent
// connections can race without modifying production accounts or leases.
const schema = `cooldown_test_${crypto.randomBytes(8).toString('hex')}`;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8, connectionTimeoutMillis: 5000,
  statement_timeout: 10000, query_timeout: 15000 });
const migration = process.argv[2];
assert(migration, 'Supply the candidate migration file');
let created = false;
try {
  await pool.query(`CREATE SCHEMA ${schema}`);
  created = true;
  await pool.query(`REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC;
    CREATE TABLE ${schema}.galx_shard_accounts (LIKE public.galx_shard_accounts INCLUDING ALL);
    CREATE TABLE ${schema}.galx_shard_leases (LIKE public.galx_shard_leases INCLUDING ALL);
    ALTER TABLE ${schema}.galx_shard_accounts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ${schema}.galx_shard_accounts FORCE ROW LEVEL SECURITY;
    ALTER TABLE ${schema}.galx_shard_leases ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ${schema}.galx_shard_leases FORCE ROW LEVEL SECURITY;`);
  const sql = fs.readFileSync(migration, 'utf8')
    .replace(/public\.(galx_shard_accounts|galx_shard_leases|fn_acquire_shard_lease|fn_release_shard_lease)\b/g, `${schema}.$1`)
    .replace(/SET search_path = public, pg_temp/g, `SET search_path = ${schema}, pg_temp`);
  await pool.query(sql);
  const now = Date.now();
  await pool.query(`INSERT INTO ${schema}.galx_shard_accounts
    (id,user_id,provider,account_label,api_key_masked,encrypted_ciphertext,encrypted_iv,encrypted_tag,
     status,cooldown_until_ms,last_refill_timestamp_ms,max_concurrency_ceiling,created_at_ms,updated_at_ms)
    VALUES ('probe','test','openai','Isolated test','test','test','test','test','cooldown',$1,$2,10,$2,$2)`, [now - 1, now]);
  const acquire = async (job: string, time?: number) => (await pool.query(
    `SELECT ${schema}.fn_acquire_shard_lease('probe','test',1,60000,$1,$2) AS result`, [job, time ?? null])).rows[0].result;
  const release = async (lease: string, success: boolean | null, time?: number) => (await pool.query(
    `SELECT ${schema}.fn_release_shard_lease($1,0,10,$2,$3) AS result`, [lease, success, time ?? null])).rows[0].result;
  const state = async () => (await pool.query(`SELECT * FROM ${schema}.galx_shard_accounts WHERE id='probe'`)).rows[0];
  const results = await Promise.all(Array.from({ length: 24 }, (_, i) => acquire(`contender_${i}`)));
  assert.equal(results.filter(r => r.success).length, 1, 'only one independent connection may acquire a recovery probe');
  const winner = results.find(r => r.success);
  assert(results.filter(r => !r.success).every(r => r.reason === 'SHARD_CONCURRENCY_EXHAUSTED' && Number(r.retry_at_ms) > now));
  const beforeNeutral = await state();
  await release(winner.lease_id, null);
  const afterNeutral = await state();
  assert.equal(afterNeutral.status, 'cooldown');
  assert.equal(afterNeutral.cooldown_until_ms, beforeNeutral.cooldown_until_ms);
  assert.equal(afterNeutral.consecutive_failures, beforeNeutral.consecutive_failures);
  assert.equal(afterNeutral.active_in_flight_count, 0);

  const failing = await acquire('failed_probe');
  await release(failing.lease_id, false);
  const failed = await state();
  assert.equal(failed.status, 'cooldown');
  assert(Number(failed.cooldown_until_ms) >= Date.now() + 14000, 'failed probe must durably restart backoff');
  assert.equal((await acquire('too_soon')).reason, 'SHARD_COOLDOWN');
  await release(failing.lease_id, false);
  assert.equal((await state()).cooldown_until_ms, failed.cooldown_until_ms, 'settlement replay must not extend cooldown');

  const recoveryTime = Number(failed.cooldown_until_ms) + 1;
  const recovering = await acquire('recover', recoveryTime);
  assert.equal(recovering.success, true);
  await release(recovering.lease_id, true, recoveryTime + 1);
  assert.equal((await state()).status, 'healthy');

  await pool.query(`UPDATE ${schema}.galx_shard_accounts SET status='cooldown',cooldown_until_ms=$1 WHERE id='probe'`, [now - 1]);
  const late = await acquire('late');
  await release(late.lease_id, true, Number(late.expires_at_ms) + 1);
  assert.equal((await state()).status, 'cooldown', 'late success cannot close a circuit after its lease expires');

  const rotated = await acquire('before_rotation');
  assert.equal(rotated.success, true);
  await pool.query(`UPDATE ${schema}.galx_shard_accounts SET registry_revision=registry_revision+1 WHERE id='probe'`);
  const beforeRotationFailure = await state();
  await release(rotated.lease_id, false);
  const afterRotationFailure = await state();
  assert.equal(afterRotationFailure.cooldown_until_ms, beforeRotationFailure.cooldown_until_ms,
    'an old credential failure must not restart cooldown after rotation');
  assert.equal(afterRotationFailure.consecutive_failures, beforeRotationFailure.consecutive_failures);

  console.log('PASS: 24 concurrent requests / 8 connections admitted one probe; neutral outcomes, failed-probe backoff, replay and late success are safe.');
} finally {
  if (created) await pool.query(`DROP SCHEMA ${schema} CASCADE`);
  await pool.end();
}
