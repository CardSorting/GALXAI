import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PreviewAdminRepository } from '../src/lib/supabase/repositories/PreviewAdminRepository';
import { DeveloperAccessRepository } from '../src/lib/supabase/repositories/DeveloperAccessRepository';
import { AdminError } from '../src/lib/admin/errors';
import { isolatedIntegrationEnvironment } from './lib/integration-test-environment';
isolatedIntegrationEnvironment({ GALX_INTEGRATION_DATABASE_URL: process.env.GALX_INTEGRATION_DATABASE_URL });
const pool = new Pool({ connectionString: process.env.GALX_INTEGRATION_DATABASE_URL, ssl: false });
const repo = new PreviewAdminRepository(pool), access = new DeveloperAccessRepository(pool);
const owner = { id: randomUUID(), email: 'owner@admin.example.test' }, reviewer = { id: randomUUID(), email: 'reviewer@admin.example.test' };
const viewer = { id: randomUUID(), email: 'viewer@admin.example.test' }, outsider = { id: randomUUID(), email: 'outsider@admin.example.test' };
const applicant = randomUUID();
const denied = (work: Promise<unknown>) => assert.rejects(work, (e: unknown) => e instanceof AdminError && e.status === 403);
const conflict = (work: Promise<unknown>) => assert.rejects(work, (e: unknown) => e instanceof AdminError && e.status === 409);
try {
  await repo.bootstrap(owner.email);
  await assert.rejects(repo.bootstrap(outsider.email), /already exists/);
  assert.equal((await repo.session(owner)).role, 'owner');
  await denied(repo.session({ id: randomUUID(), email: owner.email }));
  await repo.updateStaff(owner, reviewer.email, null, 'reviewer', 'Review the first cohort.');
  await repo.updateStaff(owner, viewer.email, null, 'viewer', 'Read private feedback.');
  assert.equal((await repo.session(reviewer)).role, 'reviewer'); assert.equal((await repo.session(viewer)).role, 'viewer');
  await access.request(applicant, 'applicant@example.test', '<script>alert(1)</script> building a writing tool', 'under_100_daily');
  const current = () => repo.detail(owner, applicant).then(r => r.request);
  await denied(repo.requests(outsider, 'all', '', 1)); await denied(repo.detail(outsider, applicant));
  await denied(repo.staff(reviewer, 1)); await denied(repo.activity(outsider, 1)); await denied(repo.feedback(outsider, 'all', 1));
  await denied(repo.review(viewer, applicant, 1, 'approved', 'Viewer cannot grant access.', 30));
  await denied(repo.updateStaff(reviewer, reviewer.email, 2, 'owner', 'Cannot elevate myself.'));
  const decisions = await Promise.allSettled([
    repo.review(owner, applicant, 1, 'approved', 'First cohort: small project.', 30),
    repo.review(reviewer, applicant, 1, 'declined', 'Competing stale decision.', null),
  ]);
  assert.equal(decisions.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(decisions.filter(r => r.status === 'rejected' && r.reason.status === 409).length, 1);
  let record = await current();
  if (record.status !== 'approved') await repo.review(owner, applicant, record.revision, 'approved', 'Approve after discussion.', 30);
  record = await current(); assert.equal(await access.isApproved(applicant), true); assert(record.expires_at);
  await denied(repo.session({ id: applicant, email: 'applicant@example.test' }));
  const detail = await repo.detail(viewer, applicant);
  assert(detail.activity.some(x => x.action === 'request_reviewed'));
  assert.deepEqual(Object.keys(detail.request).sort(), ['access_state','email','expected_traffic','expires_at','requested_at','reviewed_at','revision','status','use_case','user_id','introduction','github_url','linkedin_url','cohort_interest','application_updated_at'].sort());
  await assert.rejects(repo.review(owner, applicant, record.revision, 'revoked', 'x'.repeat(1001), null));
  assert.equal((await current()).revision, record.revision, 'audit failure must roll back the permission change');
  assert.equal(await access.isApproved(applicant), true);
  assert.equal(await access.feedback(applicant, 'The first experience worked; an error could be clearer.'), true);
  const report = (await repo.feedback(viewer, 'open', 1)).items[0];
  await denied(repo.resolveFeedback(viewer, report.id, report.revision, true));
  await repo.resolveFeedback(reviewer, report.id, report.revision, true);
  await conflict(repo.resolveFeedback(owner, report.id, report.revision, false));
  assert.equal((await repo.feedback(owner, 'open', 1)).items.length, 0);
  await repo.resolveFeedback(owner, report.id, report.revision + 1, false);
  assert.equal((await repo.feedback(owner, 'open', 1)).items.length, 1);
  await pool.query("UPDATE private.developer_access_requests SET expires_at=now()-interval '1 second' WHERE user_id=$1", [applicant]);
  assert.equal(await access.isApproved(applicant), false, 'expiry must deny without a scheduled task');
  assert.equal(await access.feedback(applicant, 'Expired accounts cannot submit new feedback.'), false);
  assert.equal((await current()).access_state, 'expired');
  assert.equal((await repo.requests(owner, 'expired', '', 1)).items.length, 1);
  assert.equal((await repo.requests(owner, 'approved', '', 1)).items.length, 0);
  await repo.review(reviewer, applicant, (await current()).revision, 'revoked', 'Pause while we improve onboarding.', null);
  await repo.review(reviewer, applicant, (await current()).revision, 'pending', 'Reconsider in the next cohort.', null);
  await repo.review(reviewer, applicant, (await current()).revision, 'declined', 'Not a fit for the current preview.', null);
  await assert.rejects(repo.review(reviewer, applicant, (await current()).revision, 'revoked', 'Invalid transition.', null), (e: any) => e.status === 400);
  await access.request(applicant, 'spoof@example.test', 'Resubmission cannot undo the staff decision.', 'exploring');
  assert.equal((await current()).status, 'declined');
  const staff = await repo.staff(owner, 1);
  const ownerRow = staff.items.find(x => x.email === owner.email)!;
  await conflict(repo.updateStaff(owner, owner.email, ownerRow.revision, 'viewer', 'Cannot remove the only active owner.'));
  const second = { id: randomUUID(), email: 'second-owner@admin.example.test' };
  await repo.updateStaff(owner, second.email, null, 'owner', 'Another owner will help.');
  await conflict(repo.updateStaff(owner, owner.email, ownerRow.revision, null, 'An unclaimed invitation is not an active owner.'));
  await repo.session(second);
  const secondRow = (await repo.staff(owner, 1)).items.find(x => x.email === second.email)!;
  const removal = await Promise.allSettled([
    repo.updateStaff(owner, second.email, secondRow.revision, 'viewer', 'Concurrent owner change A.'),
    repo.updateStaff(second, owner.email, ownerRow.revision, 'viewer', 'Concurrent owner change B.'),
  ]);
  assert.equal(removal.filter(r => r.status === 'fulfilled').length, 1);
  const activeOwners = await pool.query("SELECT user_id FROM private.preview_admin_members WHERE role='owner' AND user_id IS NOT NULL");
  assert.equal(activeOwners.rowCount, 1, 'concurrent staff changes preserve an active owner');
  const remaining = activeOwners.rows[0].user_id === owner.id ? owner : second;
  const reviewStaff = (await repo.staff(remaining, 1)).items.find(x => x.email === reviewer.email)!;
  await repo.updateStaff(remaining, reviewer.email, reviewStaff.revision, null, 'Remove staff access immediately.');
  await denied(repo.detail(reviewer, applicant));
  await denied(repo.review(reviewer, applicant, (await current().catch(() => repo.detail(remaining, applicant).then(x => x.request))).revision, 'approved', 'Revoked reviewer cannot approve.', null));
  for (let i = 0; i < 28; i++) await access.request(randomUUID(), `page${i}@example.test`, 'A project to verify paginated request review.', 'exploring');
  const first = await repo.requests(remaining, 'pending', '', 1), next = await repo.requests(remaining, 'pending', '', 2);
  assert.equal(first.items.length, 25); assert(first.has_more); assert.equal(next.items.length, 3);
  assert(!first.items.some(a => next.items.some(b => a.user_id === b.user_id)));
  assert.equal((await repo.requests(remaining, 'all', "%'; DROP TABLE private.preview_admin_members; --", 1)).items.length, 0);
  for (const table of ['preview_admin_members', 'preview_admin_audit', 'developer_access_requests', 'developer_preview_feedback']) {
    const flags = await pool.query(`SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass`, ['private.'+table]);
    assert(flags.rows[0].relrowsecurity && flags.rows[0].relforcerowsecurity);
    for (const role of ['anon','authenticated']) {
      const result = await pool.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed", [role, 'private.'+table]);
      assert.equal(result.rows[0].allowed, false);
    }
  }
  const auditPrivileges = await pool.query("SELECT has_table_privilege('service_role','private.preview_admin_audit','UPDATE,DELETE,TRUNCATE') AS allowed");
  assert.equal(auditPrivileges.rows[0].allowed, false);
  const rollback = await pool.connect();
  try {
    await rollback.query('BEGIN');
    await rollback.query(await readFile(new URL('../supabase/rollbacks/20260912222003_preview_admin_workspace.down.sql', import.meta.url), 'utf8'));
    assert.equal((await rollback.query("SELECT status FROM private.developer_access_requests WHERE user_id=$1", [applicant])).rows[0].status, 'revoked');
  } finally { await rollback.query('ROLLBACK'); rollback.release(); }
  console.log('PASS: staff isolation, invite binding, role permissions, concurrent review, atomic audit, expiry, feedback, immediate staff revocation, last-owner race, pagination, RLS, audit immutability and rollback.');
} finally { await pool.end(); }
