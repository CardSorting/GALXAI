import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { DeveloperAccessRepository } from '../../src/lib/supabase/repositories/DeveloperAccessRepository';
import { createDeveloperAccessHandlers } from '../../src/lib/auth/developer-access-route';
import { NextRequest } from 'next/server';

/** Real PostgreSQL checks: query counts and logical response bytes, not billing estimates. */
export async function verifyPreviewSync(pool: Pool) {
  let queries = 0, bytes = 0;
  const measured = { query: async (sql: string, values: unknown[]) => {
    queries++;
    const result = await pool.query(sql, values);
    bytes += Buffer.byteLength(JSON.stringify(result.rows));
    return result;
  } } as Pick<Pool, 'query'>;
  const repo = new DeveloperAccessRepository(measured), second = new DeveloperAccessRepository(measured);
  const id = randomUUID(), missing = randomUUID(), concurrent = randomUUID();
  const reset = () => { queries = 0; bytes = 0; };
  try {
    await repo.request(id, 'sync@example.test', 'A'.repeat(2000), 'exploring', {
      introduction: 'B'.repeat(1000), use_case: 'A'.repeat(2000), expected_traffic: 'exploring',
      github_url: 'https://github.com/sync-builder', linkedin_url: null, cohort_interest: 'next',
    });
    assert.equal(queries, 1, 'new submission returns its receipt in one roundtrip');
    reset(); await repo.request(id, 'spoof@example.test', 'An unrelated overwritten project.', 'exploring');
    assert.equal(queries, 1, 'ordinary retries return existing records in one roundtrip');
    reset(); const cold = await repo.get(id), coldBytes = bytes;
    assert.equal(queries, 1); assert.equal(cold?.email, 'sync@example.test');
    reset(); const warm = await second.get(id), warmBytes = bytes;
    assert.equal(queries, 1, 'warm reads still validate against Postgres'); assert.deepEqual(warm, cold);
    assert(warmBytes < coldBytes / 10, 'unchanged application data must not cross the DB connection again');
    warm!.requested_at.setFullYear(1999); warm!.introduction = 'Mutated caller object';
    assert.deepEqual(await repo.get(id), cold, 'callers cannot mutate the shared snapshot');

    // Another process/operator can write without incrementing the application revision.
    await pool.query("UPDATE private.developer_access_requests SET status='approved', introduction=$2 WHERE user_id=$1", [id, 'A new introduction saved outside this process.']);
    const external = await repo.get(id);
    assert.equal(external?.revision, cold?.revision); assert.equal(external?.status, 'approved');
    assert.equal(external?.introduction, 'A new introduction saved outside this process.');
    const transaction = await pool.connect();
    try {
      await transaction.query('BEGIN');
      const transactional = new DeveloperAccessRepository(transaction);
      await transaction.query('UPDATE private.developer_access_requests SET introduction=$2 WHERE user_id=$1', [id, 'First update within the same transaction.']);
      assert.equal((await transactional.get(id))?.introduction, 'First update within the same transaction.');
      await transaction.query('UPDATE private.developer_access_requests SET introduction=$2 WHERE user_id=$1', [id, 'Second update within the same transaction.']);
      assert.equal((await transactional.get(id))?.introduction, 'Second update within the same transaction.');
    } finally { await transaction.query('ROLLBACK'); transaction.release(); }
    reset();
    const burst = await Promise.all(Array.from({ length: 64 }, (_, i) => (i % 2 ? second : repo).isApproved(i % 4 ? id : missing)));
    assert.equal(queries, 1, '64 queued checks across repository instances share one database roundtrip');
    assert(burst.every((approved, i) => approved === Boolean(i % 4)));
    await pool.query("UPDATE private.developer_access_requests SET status='revoked' WHERE user_id=$1", [id]);
    assert.equal(await repo.isApproved(id), false, 'a prior successful batch cannot authorize a later request');
    await pool.query("UPDATE private.developer_access_requests SET status='approved', expires_at=now()-interval '1 second' WHERE user_id=$1", [id]);
    assert.equal(await repo.isApproved(id), false, 'expiry remains authoritative without an application revision bump');
    const handlers = createDeveloperAccessHandlers({ identity: async () => ({id, email: 'sync@example.test', name: 'Sync'}), repository: () => repo });
    const response = await handlers.GET(new NextRequest('https://galx.ai/api/developer-access?user_id=another-account'));
    assert.equal((await response.clone().json()).status, 'expired');
    assert.doesNotMatch(await response.text(), /xmin|version|slot|approved|sync@example|broccoli|private\./i);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');

    assert.equal(await repo.get(missing), null);
    await new DeveloperAccessRepository(pool).request(missing, 'new@example.test', 'An application created by another process.', 'exploring');
    assert.equal((await repo.get(missing))?.email, 'new@example.test', 'missing results cannot conceal later applications');
    await pool.query('DELETE FROM private.developer_access_requests WHERE user_id=$1', [id]);
    assert.equal(await repo.get(id), null, 'deletion must discard a warm snapshot');
    const receipts = await Promise.all(Array.from({ length: 16 }, () => repo.request(concurrent, 'race@example.test', 'A concurrent application with sufficient detail.', 'exploring')));
    assert(receipts.every(r => r?.user_id === concurrent && r.revision === 1), 'concurrent first submissions converge without no-op writes');
    console.log(`PASS: preview sync: 64 checks -> 1 SQL roundtrip; unchanged application ${coldBytes} -> ${warmBytes} logical response bytes; current grants, expiry, deletions, external edits and concurrent receipts.`);
  } finally {
    await pool.query('DELETE FROM private.developer_access_requests WHERE user_id=ANY($1::text[])', [[id, missing, concurrent]]);
  }
}
