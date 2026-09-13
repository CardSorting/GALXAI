import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PreviewAdminRepository } from '../src/lib/supabase/repositories/PreviewAdminRepository';
import type { ApplicationInput } from '../src/lib/developers/application';
import { DeveloperAccessRepository } from '../src/lib/supabase/repositories/DeveloperAccessRepository';
import { isolatedIntegrationEnvironment } from './lib/integration-test-environment';
import { verifyPreviewSync } from './lib/preview-sync-db-checks';
isolatedIntegrationEnvironment({ GALX_INTEGRATION_DATABASE_URL: process.env.GALX_INTEGRATION_DATABASE_URL });
const pool = new Pool({ connectionString: process.env.GALX_INTEGRATION_DATABASE_URL, ssl: false });
const account = randomUUID(), other = randomUUID();
try {
  const repo = new DeveloperAccessRepository(pool);
  assert.equal(await repo.get(account), null);
  await repo.request(account, 'preview@example.test', 'Testing an internal writing application', 'under_100_daily');
  await repo.request(other, 'other@example.test', 'Testing an unrelated writing application', 'exploring');
  assert.equal((await repo.get(account))?.status, 'pending');
  const application: ApplicationInput = { introduction: 'I am a builder testing a small writing product.', github_url: 'https://github.com/preview-builder', linkedin_url: 'https://www.linkedin.com/in/preview-builder',
    use_case: 'A small writing tool for research teams.', expected_traffic: 'under_100_daily', cohort_interest: 'next' };
  const original = await repo.get(account);
  assert.equal(original?.introduction, null, 'legacy application survives with unknown new fields');
  const updated = await repo.updateApplication(account, 1, application);
  assert.equal(updated?.cohort_interest, 'next'); assert.equal(updated?.github_url, application.github_url); assert.equal(updated?.revision, 2);
  assert.equal(updated?.requested_at.toISOString(), original?.requested_at.toISOString()); assert(updated?.application_updated_at);
  assert.equal((await repo.get(other))?.introduction, null, 'another account stays untouched');
  const concurrent = await Promise.all([repo.updateApplication(account, 2, { ...application, cohort_interest: 'later' }), repo.updateApplication(account, 2, application)]);
  assert.equal(concurrent.filter(Boolean).length, 1, 'stale edits cannot overwrite another tab');
  assert.equal(await repo.updateApplication(other, 3, application), null);
  const admin = new PreviewAdminRepository(pool), owner = { id: randomUUID(), email: 'cohort-owner@example.test' };
  await admin.bootstrap(owner.email); await admin.session(owner);
  const details = (await admin.detail(owner, account)).request;
  assert.equal(details.introduction, application.introduction); assert.equal(details.linkedin_url, application.linkedin_url);
  await assert.rejects(admin.review(owner, account, 1, 'approved', 'This review used old application details.', 30), (e: any) => e.status === 409);
  await assert.rejects(pool.query("UPDATE private.developer_access_requests SET cohort_interest='approved' WHERE user_id=$1", [account]), /check constraint/);
  await assert.rejects(pool.query("UPDATE private.developer_access_requests SET github_url='https://evil.test/builder' WHERE user_id=$1", [account]), /check constraint/);
  await assert.rejects(pool.query("UPDATE private.developer_access_requests SET introduction='short' WHERE user_id=$1", [account]), /check constraint/);
  assert.equal(await repo.feedback(account, 'Pending account must not send feedback'), false);
  assert.equal(await repo.review(account, 'approved', 'fixture-operator'), true);
  assert.equal(await repo.updateApplication(account, (await repo.get(account))!.revision!, application), null, 'approved application cannot rewrite reviewed details');
  const approvals = await Promise.all(Array.from({ length: 8 }, () => repo.request(account, 'spoof@example.test', 'Repeated request cannot overwrite approval', 'exploring')));
  assert(approvals.every(row => row?.status === 'approved' && row.email === 'preview@example.test'));
  assert.equal((await repo.get(other))?.status, 'pending');
  const writes = await Promise.all(Array.from({ length: 8 }, () => repo.feedback(account, 'Private feedback preserved in the database')));
  assert.equal(writes.filter(Boolean).length, 1, 'durable per-account throttle serializes concurrent feedback');
  assert.equal(await repo.review(account, 'revoked', 'fixture-operator'), true);
  await repo.request(account, 'preview@example.test', 'Resubmission cannot restore revoked access', 'exploring');
  assert.equal((await repo.get(account))?.status, 'revoked');
  assert.equal(await repo.updateApplication(account, (await repo.get(account))!.revision!, application), null, 'edits cannot restore revoked access');
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
  await verifyPreviewSync(pool);
  const rollback = await pool.connect();
  try {
    await rollback.query('BEGIN');
    await rollback.query(await readFile(new URL('../supabase/rollbacks/20260912234139_developer_cohort_application.down.sql', import.meta.url), 'utf8'));
    assert.equal((await rollback.query('SELECT status FROM private.developer_access_requests WHERE user_id=$1', [account])).rows[0].status, 'revoked');
    assert.equal((await rollback.query("SELECT count(*) FROM private.preview_admin_members WHERE role='owner'")).rows[0].count, '1');
    await rollback.query(await readFile(new URL('../supabase/migrations/20260912234139_developer_cohort_application.sql', import.meta.url), 'utf8'));
    assert.equal((await rollback.query('SELECT introduction FROM private.developer_access_requests WHERE user_id=$1', [account])).rows[0].introduction, null);
  } finally { await rollback.query('ROLLBACK'); rollback.release(); }
  console.log('PASS: preview persistence, idempotency, approval, revocation, concurrent feedback, RLS and browser-role denial.');
} finally {
  await pool.query('DELETE FROM private.developer_access_requests WHERE user_id = ANY($1::text[])', [[account,other]]);
  await pool.end();
}
