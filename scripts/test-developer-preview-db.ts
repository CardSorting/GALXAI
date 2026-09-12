import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { DeveloperAccessRepository } from '../src/lib/supabase/repositories/DeveloperAccessRepository';
import { isolatedIntegrationEnvironment } from './lib/integration-test-environment';
isolatedIntegrationEnvironment({ GALX_INTEGRATION_DATABASE_URL: process.env.GALX_INTEGRATION_DATABASE_URL });
const pool = new Pool({ connectionString: process.env.GALX_INTEGRATION_DATABASE_URL, ssl: false });
const account = randomUUID(), other = randomUUID();
try {
  const repo = new DeveloperAccessRepository(pool);
  assert.equal(await repo.get(account), null);
  await repo.request(account, 'preview@example.test', 'Testing an internal writing application', 'under_100_daily');
  await repo.request(other, 'other@example.test', 'Testing an unrelated writing application', 'exploring');
  assert.equal((await repo.get(account))?.status, 'pending');
  assert.equal(await repo.feedback(account, 'Pending account must not send feedback'), false);
  assert.equal(await repo.review(account, 'approved', 'fixture-operator'), true);
  const approvals = await Promise.all(Array.from({ length: 8 }, () => repo.request(account, 'spoof@example.test', 'Repeated request cannot overwrite approval', 'exploring')));
  assert(approvals.every(row => row?.status === 'approved' && row.email === 'preview@example.test'));
  assert.equal((await repo.get(other))?.status, 'pending');
  const writes = await Promise.all(Array.from({ length: 8 }, () => repo.feedback(account, 'Private feedback preserved in the database')));
  assert.equal(writes.filter(Boolean).length, 1, 'durable per-account throttle serializes concurrent feedback');
  assert.equal(await repo.review(account, 'revoked', 'fixture-operator'), true);
  await repo.request(account, 'preview@example.test', 'Resubmission cannot restore revoked access', 'exploring');
  assert.equal((await repo.get(account))?.status, 'revoked');
  assert.equal(await repo.feedback(account, 'Revoked account cannot post feedback'), false);
  const flags = await pool.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='private' AND c.relname IN ('developer_access_requests','developer_preview_feedback')`);
  assert.equal(flags.rowCount, 2); assert(flags.rows.every(row => row.relrowsecurity && row.relforcerowsecurity));
  for (const role of ['anon','authenticated']) for (const table of ['developer_access_requests','developer_preview_feedback']) {
    const result = await pool.query(`SELECT has_table_privilege($1, $2, 'SELECT,INSERT,UPDATE,DELETE') AS allowed`, [role, 'private.'+table]);
    assert.equal(result.rows[0].allowed, false, `${role} must not access ${table}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); await client.query(`SET LOCAL ROLE ${role}`);
      await assert.rejects(client.query(`SELECT * FROM private.${table}`), /permission denied/);
    } finally { await client.query('ROLLBACK'); client.release(); }
  }
  const response = await pool.query('SELECT message FROM private.developer_preview_feedback WHERE user_id=$1', [account]);
  assert.equal(response.rowCount, 1);
  console.log('PASS: preview persistence, idempotency, approval, revocation, concurrent feedback, RLS and browser-role denial.');
} finally {
  await pool.query('DELETE FROM private.developer_access_requests WHERE user_id = ANY($1::text[])', [[account,other]]);
  await pool.end();
}
