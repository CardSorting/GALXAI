/** Operator-only, two bounded reads in one read-only snapshot. Never prints rows or credentials. */
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { getPostgresSslConfig, type executePostgresQuery } from '../src/lib/db/postgres';
import { ShardProjectionReader, SHARD_PROJECTION_DELTA_SQL } from '../src/lib/supabase/repositories/ShardProjectionReader';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: getPostgresSslConfig(),
  connectionTimeoutMillis: 5000, application_name: 'galxai-projection-verification' });
const measured: { bytes: number; changed: number; removed: number }[] = [];
try {
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout = '5s'");
  const reader = new ShardProjectionReader({ query: (async (sql, params) => {
    assert.equal(sql, SHARD_PROJECTION_DELTA_SQL);
    const result = await client.query(sql, params);
    const delta = result.rows[0];
    assert.equal(delta.limit_exceeded, false);
    measured.push({ bytes: Buffer.byteLength(JSON.stringify(result.rows)), changed: delta.changed.length, removed: delta.removed.length });
    return result;
  }) as typeof executePostgresQuery });
  const first = await reader.read();
  const second = await reader.read();
  assert.equal(first.length, second.length);
  assert.equal(measured.length, 2);
  assert.equal(measured[1].changed, 0); assert.equal(measured[1].removed, 0);
  assert(measured[1].bytes < 100);
  console.log(JSON.stringify({ capturedAt: new Date().toISOString(), rows: first.length,
    cold: measured[0], unchanged: measured[1], readOnly: true, credentialsPrinted: false }));
} catch {
  console.error('Bounded projection verification failed; no credentials or rows emitted.');
  process.exitCode = 1;
} finally {
  await client.query('ROLLBACK').catch(() => {});
  await client.end();
}
