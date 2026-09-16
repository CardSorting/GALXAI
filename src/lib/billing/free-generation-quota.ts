import type { Pool, PoolClient } from 'pg';
import type { FreeGenerationQuota } from './free-generation-contract';
import { reserveFreeCapacity } from './free-generation-gate';

export class FreeQuotaError extends Error {
  constructor(readonly code: 'free_quota_exhausted' | 'free_site_limit' = 'free_quota_exhausted') { super(code); }
}
type Grant = { user_id: string; site_id: string | null };

/** Caller owns a short transaction. Verified account data, never client claims,
 * establishes eligibility. Existing and new accounts enroll lazily. */
async function grant(db: PoolClient, owner: string): Promise<Grant | null> {
  const identity = (await db.query(`SELECT encode(sha256(convert_to(lower(btrim(email)), 'UTF8')), 'hex') AS hash
    FROM auth.users WHERE id=$1::uuid AND email_confirmed_at IS NOT NULL AND is_anonymous=false
    AND nullif(btrim(email),'') IS NOT NULL AND deleted_at IS NULL
    AND (banned_until IS NULL OR banned_until<=statement_timestamp())`, [owner])).rows[0];
  if (!identity) throw new FreeQuotaError();
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`free-generation:${identity.hash}`]);
  await db.query(`INSERT INTO private.galx_free_generation_grants(user_id,identity_hash) VALUES($1,$2)
    ON CONFLICT DO NOTHING`, [owner, identity.hash]);
  const row = (await db.query<Grant>('SELECT user_id,site_id FROM private.galx_free_generation_grants WHERE user_id=$1 FOR UPDATE', [owner])).rows[0] || null;
  if (row) {
    // Expired queued work cannot be claimed. The state CAS races cancellation and
    // dispatch safely; generating/deadline-expired work remains charged.
    await db.query(`WITH expired AS (
      UPDATE private.galx_image_requests SET state='failed',payload='{}'::jsonb,updated_at=now()
      WHERE user_id=$1::text AND state='queued' AND created_at<=now()-interval '5 minutes'
        AND id::text IN (SELECT operation_id FROM private.galx_free_generation_usage
          WHERE user_id=$1::uuid AND kind='image' AND NOT released)
      RETURNING id
    ) UPDATE private.galx_free_generation_usage SET released=true,capacity_settled=true
      WHERE user_id=$1::uuid AND kind='image' AND operation_id IN (SELECT id::text FROM expired)`,[owner]);
  }
  return row;
}
export async function assignFreeSite(db: PoolClient, owner: string, id: string) {
  throw new FreeQuotaError('free_site_limit');
}
export async function requireAssignedFreeSite(db: PoolClient, owner: string, id: string) {
  throw new FreeQuotaError('free_site_limit');
}
export async function consumeFreeGeneration(db: PoolClient, owner: string, kind: 'site' | 'image', operation: string, quantity: number, siteId?: string) {
  if (kind === 'site') throw new FreeQuotaError('free_quota_exhausted');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 4) throw new FreeQuotaError();
  const row = await grant(db, owner);
  if (!row) throw new FreeQuotaError();
  const previous = (await db.query('SELECT quantity,released FROM private.galx_free_generation_usage WHERE user_id=$1 AND kind=$2 AND operation_id=$3', [owner,kind,operation])).rows[0];
  if (previous) {
    if (previous.quantity !== quantity || previous.released) throw new FreeQuotaError();
    return;
  }
  const used = Number((await db.query('SELECT coalesce(sum(quantity),0) AS used FROM private.galx_free_generation_usage WHERE user_id=$1 AND kind=$2 AND NOT released', [owner,kind])).rows[0].used);
  if (used + quantity > 5) throw new FreeQuotaError();
  await reserveFreeCapacity(db,owner,kind,quantity);
  await db.query('INSERT INTO private.galx_free_generation_usage(user_id,kind,operation_id,quantity) VALUES($1,$2,$3,$4)', [owner,kind,operation,quantity]);
}
/** Only call with proof of no dispatch. Failures/timeouts alone are not proof. */
export async function releaseFreeGeneration(db: Pick<PoolClient, 'query'>, owner: string, kind: 'site' | 'image', operation: string) {
  await db.query('UPDATE private.galx_free_generation_usage SET released=true,capacity_settled=true WHERE user_id=$1 AND kind=$2 AND operation_id=$3 AND NOT released', [owner,kind,operation]);
}
export async function readFreeGenerationQuota(pool: Pick<Pool,'connect'>, owner: string): Promise<FreeGenerationQuota> {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='5s'");
    const row = await grant(db,owner);
    const usage = (await db.query('SELECT kind,sum(quantity)::int AS used FROM private.galx_free_generation_usage WHERE user_id=$1 AND NOT released GROUP BY kind', [owner])).rows;
    await db.query('COMMIT');
    return { sites: 0,
      images: row ? Math.max(0,5-(usage.find(r=>r.kind==='image')?.used || 0)) : 0,
      siteTurns: 0 };
  } catch(error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
