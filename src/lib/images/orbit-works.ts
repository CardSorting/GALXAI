import type { Pool } from 'pg';
import type Stripe from 'stripe';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { orbitRecords, readOrbitAccess } from '@/lib/billing/orbit';

/** Recheck designation, provenance, owner and private visibility, not cached library metadata. */
export const orbitWorkProjection = `SELECT w.asset_id,w.actor_id,w.title,w.published_at,l.user_id,l.aspect_ratio
  FROM private.galx_orbit_works w JOIN public.user_image_library l ON l.id=w.asset_id
  JOIN private.galx_autonomous_actors a ON a.actor_id=w.actor_id AND a.account_id=l.user_id
  JOIN private.galx_account_identities i ON i.account_id=a.account_id AND i.account_class='autonomous'
  JOIN private.galx_star_profiles s ON s.actor_id=a.actor_id AND s.is_discoverable
  JOIN private.galx_account_profiles p ON p.id=s.account_profile_id AND p.status='active'
  WHERE l.status='completed' AND l.work_class IN ('private','star_published') AND l.visibility='private'
    AND l.is_public=false AND l.is_explore_visible=false
    AND EXISTS (SELECT 1 FROM private.galx_star_generation_attempts t
      JOIN private.galx_generation_assets ga ON ga.generation_id=t.generation_id AND ga.asset_id=l.id
      JOIN private.galx_generation_records g ON g.id=t.generation_id AND g.account_id=l.user_id AND g.state='completed'
      WHERE t.actor_id=a.actor_id AND l.id=ANY(t.asset_ids) AND t.kind='content' AND t.state='completed')`;

export async function hasOrbitAccess(pool: Pool,stripe: Stripe,userId: string,actorId: string,livemode: boolean) {
  for (const row of await orbitRecords(pool,userId,livemode,actorId)) {
    if ((await readOrbitAccess(stripe,row)).active) return true;
  }
  return false;
}

export async function mayReadOrbitWork(pool: Pool,stripe: Stripe,userId: string,assetId: string,ownerId: string,livemode: boolean) {
  const work = (await pool.query(`${orbitWorkProjection} AND w.asset_id=$1 AND l.user_id=$2`,[assetId,ownerId])).rows[0];
  return Boolean(work && await hasOrbitAccess(pool,stripe,userId,work.actor_id,livemode));
}

export async function readOrbitWorks(pool: Pool,actorId: string) {
  const rows = (await pool.query(`${orbitWorkProjection} AND w.actor_id=$1 ORDER BY w.published_at DESC,w.asset_id LIMIT 100`,[actorId])).rows;
  return rows.map(row => {
    const token = GalxCryptoVault.sealImageDownload(String(row.user_id),String(row.asset_id));
    return { id:String(row.asset_id),title:String(row.title),imageUrl:`/v1/images/assets/${token}`,
      thumbnailUrl:`/v1/images/assets/${token}/thumbnail`,publishedAt:new Date(row.published_at).toISOString() };
  });
}
