/**
 * Verification test for private.user_star_follows table in Supabase PostgreSQL
 */
import assert from 'node:assert';
import { executePostgresQuery, closePostgresPool } from '../src/lib/db/postgres';

async function testUserStarFollows() {
  console.log('--- Testing private.user_star_follows Database Operations ---');

  const testUserId = 'test_human_user_' + Date.now();
  const testStarHandle = 'astra';

  try {
    // 1. Clean up any existing test records
    await executePostgresQuery(
      `DELETE FROM private.user_star_follows WHERE user_id = $1`,
      [testUserId]
    );

    // 2. Insert follow
    const insertResult = await executePostgresQuery(
      `INSERT INTO private.user_star_follows (user_id, star_handle)
       VALUES ($1, $2)
       RETURNING user_id, star_handle, followed_at`,
      [testUserId, testStarHandle]
    );
    assert(insertResult && insertResult.rows.length === 1, 'Failed to insert follow record');
    assert.strictEqual(insertResult.rows[0].user_id, testUserId);
    assert.strictEqual(insertResult.rows[0].star_handle, testStarHandle);
    console.log('✓ Insert follow record verified');

    // 3. Idempotent re-insert
    const duplicateResult = await executePostgresQuery(
      `INSERT INTO private.user_star_follows (user_id, star_handle)
       VALUES ($1, $2)
       ON CONFLICT (user_id, star_handle) DO NOTHING
       RETURNING user_id, star_handle`,
      [testUserId, testStarHandle]
    );
    assert(duplicateResult && duplicateResult.rows.length === 0, 'Duplicate insert should be ignored');
    console.log('✓ Idempotent follow conflict handling verified');

    // 4. Query follow count and follow status
    const statusResult = await executePostgresQuery(
      `SELECT 1 FROM private.user_star_follows
       WHERE user_id = $1 AND star_handle = $2
       LIMIT 1`,
      [testUserId, testStarHandle]
    );
    assert(statusResult && statusResult.rows.length === 1, 'Follow check failed');

    const countResult = await executePostgresQuery(
      `SELECT COUNT(*)::int as count FROM private.user_star_follows
       WHERE star_handle = $1`,
      [testStarHandle]
    );
    assert(countResult && Number(countResult.rows[0].count) >= 1, 'Follow count check failed');
    console.log(`✓ Follow query and count verified (current count for ${testStarHandle}: ${countResult.rows[0].count})`);

    // 5. Unfollow
    const deleteResult = await executePostgresQuery(
      `DELETE FROM private.user_star_follows
       WHERE user_id = $1 AND star_handle = $2
       RETURNING user_id`,
      [testUserId, testStarHandle]
    );
    assert(deleteResult && deleteResult.rows.length === 1, 'Failed to delete follow record');

    const postDeleteCheck = await executePostgresQuery(
      `SELECT 1 FROM private.user_star_follows
       WHERE user_id = $1 AND star_handle = $2`,
      [testUserId, testStarHandle]
    );
    assert(postDeleteCheck && postDeleteCheck.rows.length === 0, 'Record should no longer exist');
    console.log('✓ Unfollow operation verified');

    // 6. Test invalid handle format constraint
    const invalidResult = await executePostgresQuery(
      `INSERT INTO private.user_star_follows (user_id, star_handle)
       VALUES ($1, $2)`,
      [testUserId, 'INVALID_UPPERCASE_HANDLE!']
    );
    assert.strictEqual(invalidResult, null, 'Invalid handle format should be rejected by CHECK constraint');
    console.log('✓ CHECK constraint on star_handle verified');

    console.log('--- ALL user_star_follows DATABASE TESTS PASSED ---');
  } finally {
    await closePostgresPool();
  }
}

testUserStarFollows()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('user_star_follows DB TEST FAILED:', err);
    process.exit(1);
  });
