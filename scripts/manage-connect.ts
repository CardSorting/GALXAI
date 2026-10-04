/** Trusted operator CLI; never imported into the application or exposed as a user API. */
import { getPostgresPool, closePostgresPool } from '../src/lib/db/postgres';
const [action, userId, until] = process.argv.slice(2);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
try {
  if (!['grant','end-access','cleanup'].includes(action) || (action !== 'cleanup' && (!userId || !uuid.test(userId)))) throw new Error('Use grant <existing-account-uuid> <ISO-expiry>, end-access <account-uuid>, or cleanup.');
  const pool = getPostgresPool(); if (!pool) throw new Error('Server database configuration is required.');
  if (action === 'grant') {
    const expiry = new Date(until);
    if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now() || expiry.getTime() > Date.now() + 90*86400_000) throw new Error('Choose a future ISO expiry within 90 days.');
    const result = await pool.query(`INSERT INTO private.galx_inference_access(user_id,enabled,valid_until)
      SELECT id,true,$2 FROM auth.users WHERE id=$1 AND is_anonymous IS NOT TRUE
      ON CONFLICT(user_id) DO UPDATE SET enabled=true,valid_until=excluded.valid_until,updated_at=now() RETURNING user_id`, [userId,expiry]);
    if (result.rowCount !== 1) throw new Error('An existing non-anonymous account is required.');
    console.log('Inference access granted until the specified expiry. No application was authorized.');
  } else if (action === 'end-access') {
    await pool.query('UPDATE private.galx_inference_access SET enabled=false,updated_at=now() WHERE user_id=$1', [userId]);
    console.log('Inference access ended. Application grants and media access are unchanged.');
  } else {
    for (const [table,key,predicate] of [
      ['galx_connect_requests','id',"expires_at < now()-interval '1 day'"],
      ['galx_connect_codes','code_hash',"expires_at < now()-interval '1 day'"],
      ['galx_connect_tokens','access_hash',"refresh_expires_at < now()-interval '1 day'"],
      ['galx_nova_requests','id',"created_at < now()-interval '30 days' AND lease_until < now()"],
    ]) await pool.query(`DELETE FROM private.${table} WHERE ${key} IN (SELECT ${key} FROM private.${table} WHERE ${predicate} LIMIT 1000)`);
    console.log('Bounded Connect housekeeping completed.');
  }
} catch (error) { console.error(error instanceof Error && !('code' in error) ? error.message : 'Connect maintenance could not be confirmed.'); process.exitCode=1; }
finally { await closePostgresPool(); }
