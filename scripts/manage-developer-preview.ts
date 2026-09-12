/** Private operator CLI. No API credentials or approval controls are sent to browsers. */
import { getPostgresPool } from '../src/lib/db/postgres';
import { DeveloperAccessRepository } from '../src/lib/supabase/repositories/DeveloperAccessRepository';
import { PreviewAdminRepository } from '../src/lib/supabase/repositories/PreviewAdminRepository';
const [action = 'list', userId, reviewer] = process.argv.slice(2);
if (!['list', 'feedback', 'approve', 'revoke', 'bootstrap-owner'].includes(action) ||
  (action === 'bootstrap-owner' && (!userId || userId.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userId))) ||
  (['approve','revoke'].includes(action) && (!userId || !reviewer))) {
  console.error('Usage: npm run developer-preview -- bootstrap-owner <email> | list | feedback [user-id] | approve <user-id> <reviewer> | revoke <user-id> <reviewer>');
  process.exitCode = 1;
} else {
  const pool = getPostgresPool();
  if (!pool) throw new Error('Database connection is required.');
  try {
    if (action === 'bootstrap-owner') {
      await new PreviewAdminRepository(pool).bootstrap(userId.toLowerCase());
      console.log('First owner added. Sign in with this verified email at /admin. No email was sent.');
    } else if (action === 'list') console.table((await pool.query(`SELECT user_id, email, use_case, expected_traffic, status, expires_at, revision, requested_at, reviewed_at, reviewed_by
      FROM private.developer_access_requests ORDER BY (status = 'pending') DESC, requested_at ASC LIMIT 100`)).rows);
    else if (action === 'feedback') console.table((await pool.query(`SELECT f.id, f.user_id, a.email, f.message, f.created_at
      FROM private.developer_preview_feedback f JOIN private.developer_access_requests a USING (user_id)
      WHERE ($1::text IS NULL OR f.user_id = $1) ORDER BY f.created_at DESC LIMIT 100`, [userId || null])).rows);
    else {
      const updated = await new DeveloperAccessRepository(pool).review(userId, action === 'approve' ? 'approved' : 'revoked', reviewer);
      if (!updated) throw new Error('No access request exists for that account. Ask them to sign up and submit a request first.');
      console.log(action === 'approve' ? 'Developer preview access approved.' : 'Developer preview access revoked.');
    }
  } finally { await pool.end(); }
}
