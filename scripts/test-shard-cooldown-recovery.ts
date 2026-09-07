import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { APPLY_LEASE_HEALTH_TRANSITIONS_SQL } from '../src/core/pool/LeaseHealthTransition';

// All fixtures and optional function replacements are rolled back together.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL statement_timeout = '10s'");
  const definitions = () => client.query(`SELECT pg_get_functiondef(oid) AS definition FROM pg_proc
    WHERE oid IN ('public.fn_acquire_shard_lease(varchar,varchar,bigint,bigint,varchar,bigint)'::regprocedure,
      'public.fn_release_shard_lease(varchar,bigint,numeric,boolean,bigint)'::regprocedure) ORDER BY proname`);
  const baselineDefinitions = (await definitions()).rows;
  const migration = process.argv[2];
  if (migration) await client.query(fs.readFileSync(migration, 'utf8'));
  const routines = await client.query(`SELECT p.proname,p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
    has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_exec,
    has_function_privilege('service_role',p.oid,'EXECUTE') AS service_exec
    FROM pg_proc p WHERE p.oid IN (
      'public.fn_acquire_shard_lease(varchar,varchar,bigint,bigint,varchar,bigint)'::regprocedure,
      'public.fn_release_shard_lease(varchar,bigint,numeric,boolean,bigint)'::regprocedure)`);
  for (const routine of routines.rows) {
    assert.equal(routine.prosecdef, false);
    assert.equal(routine.anon_exec, false);
    assert.equal(routine.auth_exec, false);
    assert.equal(routine.service_exec, true);
    assert(routine.proconfig.includes('search_path=public, pg_temp'));
  }
  const id = `recovery_test_${crypto.randomUUID()}`;
  const now = Date.now();
  await client.query(`INSERT INTO public.galx_shard_accounts
    (id,user_id,provider,account_label,api_key_masked,encrypted_ciphertext,encrypted_iv,encrypted_tag,
     status,cooldown_until_ms,last_refill_timestamp_ms,max_concurrency_ceiling,created_at_ms,updated_at_ms)
    VALUES ($1,'recovery_test','openai','Rollback-only recovery fixture','test','test','test','test',
      'cooldown',$2,$3,10,$3,$3)`, [id, now - 1, now]);
  let sequence = 0;
  const acquire = async (job = `job_${sequence++}`, time = now) => (await client.query(
    'SELECT public.fn_acquire_shard_lease($1,$2,$3,$4,$5,$6) AS result',
    [id, 'recovery_test', 1, 60000, job, time])).rows[0].result;

  const first = await acquire('probe');
  assert.equal(first.success, true, 'elapsed cooldown must admit a recovery probe');
  const replay = await acquire('probe');
  assert.equal(replay.lease_id, first.lease_id, 'same job must retain its lease');
  assert.equal(replay.idempotent_replay, true);
  assert.equal((await acquire()).reason, 'SHARD_CONCURRENCY_EXHAUSTED', 'another job cannot overlap the probe');
  const recovered = await acquire('after-expiry', now + 60001);
  assert.equal(recovered.success, true, 'an abandoned probe must be reclaimable');
  await client.query('SELECT public.fn_release_shard_lease($1,$2,$3,$4,$5)',
    [recovered.lease_id, 1, 10, true, now + 60002]);
  assert.equal((await client.query('SELECT status FROM public.galx_shard_accounts WHERE id=$1', [id])).rows[0].status,
    'healthy', 'successful probe must durably close the expired cooldown');

  for (const change of ['new_cooldown', 'revoked', 'failed_probe']) {
    await client.query('SAVEPOINT settlement_case');
    await client.query("UPDATE public.galx_shard_accounts SET status='cooldown',cooldown_until_ms=$2 WHERE id=$1", [id, now - 1]);
    const probe = await acquire();
    assert.equal(probe.success, true);
    if (change === 'new_cooldown') await client.query('UPDATE public.galx_shard_accounts SET cooldown_until_ms=$2 WHERE id=$1', [id, now + 30000]);
    if (change === 'revoked') await client.query("UPDATE public.galx_shard_accounts SET status='revoked',permission_retracted=true WHERE id=$1", [id]);
    await client.query('SELECT public.fn_release_shard_lease($1,$2,$3,$4,$5)', [probe.lease_id, 0, 10, change !== 'failed_probe', now + 1]);
    const state = (await client.query('SELECT status,cooldown_until_ms FROM public.galx_shard_accounts WHERE id=$1', [id])).rows[0];
    assert.equal(state.status, change === 'revoked' ? 'revoked' : 'cooldown');
    if (change === 'new_cooldown') assert.equal(Number(state.cooldown_until_ms), now + 30000);
    await client.query('ROLLBACK TO SAVEPOINT settlement_case');
  }

  for (const status of ['cooldown', 'exhausted', 'healthy']) {
    await client.query('UPDATE public.galx_shard_accounts SET status=$2,cooldown_until_ms=$3 WHERE id=$1', [id, status, now - 1]);
    await client.query('SAVEPOINT probe_case');
    assert.equal((await acquire()).success, true, `${status} must allow recovery/admission`);
    await client.query('ROLLBACK TO SAVEPOINT probe_case');
  }
  for (const status of ['cooldown', 'exhausted']) {
    for (const deadline of [null, 0, now + 10000]) {
      await client.query('UPDATE public.galx_shard_accounts SET status=$2,cooldown_until_ms=$3 WHERE id=$1', [id, status, deadline]);
      assert.equal((await acquire()).success, false, `${status} cannot bypass an unset/future deadline`);
    }
  }
  for (const status of ['revoked', 'dead', 'paused']) {
    await client.query('UPDATE public.galx_shard_accounts SET status=$2,cooldown_until_ms=$3 WHERE id=$1', [id, status, now - 1]);
    assert.equal((await acquire()).reason, 'SHARD_NOT_HEALTHY');
  }
  await client.query("UPDATE public.galx_shard_accounts SET status='cooldown',permission_retracted=true WHERE id=$1", [id]);
  assert.equal((await acquire()).reason, 'PERMISSION_RETRACTED');
  await client.query('UPDATE public.galx_shard_accounts SET permission_retracted=false,credential_expires_at_ms=$2 WHERE id=$1', [id, now - 1]);
  assert.equal((await acquire()).reason, 'CREDENTIAL_EXPIRED');
  await client.query('UPDATE public.galx_shard_accounts SET credential_expires_at_ms=NULL,remaining_tokens=0,refill_rate_per_minute=0 WHERE id=$1', [id]);
  assert.equal((await acquire()).reason, 'SHARD_TOKEN_QUOTA_EXHAUSTED');
  // Exercise the exact compare-and-set statement used by the write-behind path.
  await client.query("UPDATE public.galx_shard_accounts SET status='healthy',remaining_tokens=1000,cooldown_until_ms=NULL WHERE id=$1", [id]);
  const observed = (await client.query('SELECT fencing_token,registry_revision FROM public.galx_shard_accounts WHERE id=$1', [id])).rows[0];
  const transition = [[id], ['cooldown'], [now + 30000], [observed.fencing_token], [observed.registry_revision]];
  assert.equal((await client.query(APPLY_LEASE_HEALTH_TRANSITIONS_SQL, transition)).rowCount, 1);
  assert.equal((await client.query(APPLY_LEASE_HEALTH_TRANSITIONS_SQL, transition)).rowCount, 0, 'replayed observations must be harmless');
  await client.query("UPDATE public.galx_shard_accounts SET status='healthy',cooldown_until_ms=NULL WHERE id=$1", [id]);
  assert.equal((await client.query(APPLY_LEASE_HEALTH_TRANSITIONS_SQL, transition)).rowCount, 0, 'old failure cannot reopen a recovered account');
  const fresh = (await client.query('SELECT fencing_token,registry_revision FROM public.galx_shard_accounts WHERE id=$1', [id])).rows[0];
  assert.equal((await client.query(APPLY_LEASE_HEALTH_TRANSITIONS_SQL,
    [[id], ['cooldown'], [now + 30000], [Number(fresh.fencing_token) - 1], [fresh.registry_revision]])).rowCount, 0, 'stale lease cannot change health');
  await client.query("UPDATE public.galx_shard_accounts SET status='paused' WHERE id=$1", [id]);
  const paused = (await client.query('SELECT registry_revision FROM public.galx_shard_accounts WHERE id=$1', [id])).rows[0];
  assert.equal((await client.query(APPLY_LEASE_HEALTH_TRANSITIONS_SQL,
    [[id], ['healthy'], [0], [fresh.fencing_token], [paused.registry_revision]])).rowCount, 0, 'automatic reports cannot undo an operator pause');
  if (process.argv[3]) {
    await client.query(fs.readFileSync(process.argv[3], 'utf8'));
    assert.deepEqual((await definitions()).rows, baselineDefinitions, 'rollback must restore the exact installed function definitions');
  }
  console.log('PASS: cooldown recovery, single probe, idempotency, lease expiry, terminal states, permissions, credentials and quota.');
} finally {
  await client.query('ROLLBACK');
  await client.end();
}
