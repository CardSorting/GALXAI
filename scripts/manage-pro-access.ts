/** Trusted database operator only. Never accepts browser authority. */
import { getPostgresPool, closePostgresPool } from '../src/lib/db/postgres';

const [action, id, ...extra] = process.argv.slice(2);
if (!['status', 'grant', 'revoke'].includes(action) || extra.length ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
  throw new Error('Usage: node --env-file-if-exists=.env.local --import tsx scripts/manage-pro-access.ts status|grant|revoke <account-id>');
}
const pool = getPostgresPool();
if (!pool) throw new Error('Trusted database configuration is required.');
try {
  if (action !== 'status') {
    const result = await pool.query(`UPDATE auth.users
      SET raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('galx_pro',$2::boolean),updated_at=now()
      WHERE id=$1::uuid AND ($2=false OR (email_confirmed_at IS NOT NULL AND is_anonymous=false
        AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<=statement_timestamp()))) RETURNING id`, [id, action === 'grant']);
    if (result.rowCount !== 1) throw new Error('A verified active account is required.');
  }
  const result = await pool.query(`SELECT id,coalesce(raw_app_meta_data->'galx_pro'='true'::jsonb,false) AS granted FROM auth.users WHERE id=$1::uuid`,[id]);
  const row = result.rows[0];
  if (!row || (action !== 'status' && row.granted !== (action === 'grant'))) throw new Error('Pro access read-back did not match.');
  console.log(JSON.stringify({ accountId: row.id, complimentaryPro: row.granted }));
} finally { await closePostgresPool(); }
