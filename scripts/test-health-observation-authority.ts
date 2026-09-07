import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL statement_timeout = '10s'");
  const definition = async () => (await client.query("SELECT pg_get_functiondef('public.fn_report_shard_health_cf(jsonb)'::regprocedure) AS definition")).rows[0].definition;
  const baseline = await definition();
  if (process.argv[2]) await client.query(fs.readFileSync(process.argv[2], 'utf8'));
  const id = `observation_test_${randomUUID()}`;
  const now = Date.now();
  await client.query(`INSERT INTO public.galx_shard_accounts
    (id,user_id,provider,account_label,api_key_masked,encrypted_ciphertext,encrypted_iv,encrypted_tag,
     status,cooldown_until_ms,last_refill_timestamp_ms,created_at_ms,updated_at_ms)
    VALUES ($1,'observation_test','openai','Rollback-only observation fixture','test','test','test','test',
      'healthy',NULL,$2,$2,$2)`, [id, now]);
  const account = async () => (await client.query('SELECT to_jsonb(s) AS row FROM public.galx_shard_accounts s WHERE id=$1', [id])).rows[0].row;
  const probe = (success: boolean) => ({ id: randomUUID(), shardId: id, workerId: 'test', latencyMs: 10,
    statusCode: success ? 200 : 400, isSuccess: success, timestampMs: now - 1000 });
  const ingest = async (probes: any[]) => (await client.query('SELECT public.fn_report_shard_health_cf($1::jsonb) AS result', [JSON.stringify(probes)])).rows[0].result;
  for (const status of ['healthy', 'cooldown', 'paused', 'revoked']) {
    await client.query('UPDATE public.galx_shard_accounts SET status=$2, cooldown_until_ms=$3 WHERE id=$1', [id, status, status === 'cooldown' ? now + 120000 : null]);
    const before = await account();
    const batch = Array.from({ length: 100 }, (_, i) => probe(i > 49));
    const first = await ingest(batch);
    assert.equal(first.probesIngested, 100);
    assert.deepEqual(first.statusTransitions, []);
    assert.deepEqual(await account(), before, `${status}: samples cannot alter ANY account state, counters or revisions`);
    assert.equal((await ingest(batch)).probesIngested, 0, 'same UUID batch is idempotent');
    assert.deepEqual(await account(), before);
  }
  const count = (await client.query('SELECT count(*)::int AS count FROM public.galx_shard_health_probes WHERE shard_id=$1', [id])).rows[0].count;
  assert.equal(count, 400);
  // Legacy clients without IDs remain accepted during rollout.
  assert.equal((await ingest([{ ...probe(true), id: undefined }])).probesIngested, 1);
  for (const invalid of [Array.from({ length: 101 }, () => probe(true)), [{ ...probe(true), latencyMs: -1 }]]) {
    await client.query('SAVEPOINT invalid_batch');
    await assert.rejects(ingest(invalid));
    await client.query('ROLLBACK TO SAVEPOINT invalid_batch');
  }
  const security = (await client.query(`SELECT p.prosecdef, p.proconfig,
    has_function_privilege('anon',p.oid,'EXECUTE') AS anon,
    has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated,
    has_function_privilege('service_role',p.oid,'EXECUTE') AS service
    FROM pg_proc p WHERE p.oid='public.fn_report_shard_health_cf(jsonb)'::regprocedure`)).rows[0];
  assert.equal(security.prosecdef, false);
  assert(security.proconfig.includes('search_path=public, pg_temp'));
  assert.equal(security.anon, false);
  assert.equal(security.authenticated, false);
  assert.equal(security.service, true);
  if (process.argv[3]) {
    await client.query(fs.readFileSync(process.argv[3], 'utf8'));
    assert.equal(await definition(), baseline, 'rollback restores exact previous function');
  }
  console.log('PASS: 100-event batches, stale success/failure neutrality, UUID replay, legacy input, validation, privileges and exact rollback.');
} finally {
  await client.query('ROLLBACK');
  await client.end();
}
