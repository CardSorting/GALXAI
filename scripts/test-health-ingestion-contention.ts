import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

// Separate owner-only schema: no production account rows or function replacements.
const schema = `observation_test_${randomUUID().replaceAll('-', '')}`;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 6, connectionTimeoutMillis: 5000 });
const setup = await pool.connect();
let created = false;
let holder: pg.PoolClient | undefined;
try {
  await setup.query(`CREATE SCHEMA ${schema}`);
  created = true;
  await setup.query(`CREATE TABLE ${schema}.galx_shard_accounts (LIKE public.galx_shard_accounts INCLUDING ALL);
    CREATE TABLE ${schema}.galx_shard_health_probes (LIKE public.galx_shard_health_probes INCLUDING ALL);
    ALTER TABLE ${schema}.galx_shard_accounts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ${schema}.galx_shard_accounts FORCE ROW LEVEL SECURITY;
    ALTER TABLE ${schema}.galx_shard_health_probes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ${schema}.galx_shard_health_probes FORCE ROW LEVEL SECURITY;
    ALTER TABLE ${schema}.galx_shard_health_probes ADD FOREIGN KEY (shard_id) REFERENCES ${schema}.galx_shard_accounts(id)`);
  await setup.query(fs.readFileSync(process.argv[2], 'utf8').replaceAll('public.', `${schema}.`));
  const now = Date.now();
  await setup.query(`INSERT INTO ${schema}.galx_shard_accounts
    (id,user_id,provider,account_label,api_key_masked,encrypted_ciphertext,encrypted_iv,encrypted_tag,
     status,created_at_ms,updated_at_ms)
    VALUES ('fixture','test','openai','fixture','test','test','test','test','healthy',$1,$1)`, [now]);
  holder = await pool.connect();
  await holder.query('BEGIN');
  await holder.query(`SELECT id FROM ${schema}.galx_shard_accounts WHERE id='fixture' FOR NO KEY UPDATE`);
  // A normal account update lock used to block every telemetry batch.
  const started = performance.now();
  const results = await Promise.all(Array.from({ length: 16 }, async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '500ms'; SET LOCAL statement_timeout = '3s'");
      const batch = Array.from({ length: 100 }, () => ({ id: randomUUID(), shardId: 'fixture', workerId: 'test',
        latencyMs: 5, statusCode: 400, isSuccess: false, timestampMs: now }));
      const result = await client.query(`SELECT ${schema}.fn_report_shard_health_cf($1::jsonb) AS result`, [JSON.stringify(batch)]);
      await client.query('COMMIT');
      return result.rows[0].result.probesIngested;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }));
  assert(results.every(n => n === 100));
  console.log(JSON.stringify({ status: 'PASS', observations: 1600, batches: 16,
    elapsedMs: Math.round(performance.now() - started), accountUpdateLockHeld: true }));
} finally {
  if (holder) { await holder.query('ROLLBACK'); holder.release(); }
  if (created) await setup.query(`DROP SCHEMA ${schema} CASCADE`);
  setup.release();
  await pool.end();
}
