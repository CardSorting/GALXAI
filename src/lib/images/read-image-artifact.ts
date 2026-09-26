import { BroccoliBoundedCache, BroccoliReadCoordinator } from '@/core/broccolidb/broccolidb-bounded-cache';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import type { NextRequest } from 'next/server';
import { ImageLibraryRepository } from '@/lib/supabase/repositories/ImageLibraryRepository';
import { GalxR2AssetAdapter } from '@/workers/cloudflare/GalxR2AssetAdapter';
import { sanitizeImageArtifact, sanitizeImageThumbnail, type PublicImageArtifact } from '@/lib/security/image-artifact';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { mayReadOrbitWork } from './orbit-works';

const thumbnails = new BroccoliBoundedCache<PublicImageArtifact>('galx_image_thumbnails', { entries: 128, bytes: 16 * 1024 * 1024, ttlMs: 300_000 });
const transforms = new BroccoliReadCoordinator(2, 64);

export function isExhibitedStarAsset(asset: { workClass?: string; isPublic?: boolean; visibility?: string }): boolean {
  return asset.workClass === 'star_published' && asset.isPublic === true && asset.visibility === 'public';
}

/** Authorization precedes every cache hit, including reads after deletion. */
export async function readImageArtifact(token: string, thumbnail = false, request?: NextRequest): Promise<PublicImageArtifact | null> {
  const identity = GalxCryptoVault.openImageDownload(token);
  if (!identity) return null;
  const asset = await ImageLibraryRepository.getInstance().getAsset(identity.userId, identity.assetId);
  if (!asset || asset.status !== 'completed') return null;
  // Publication is a distinct content class, never a user-selected visibility
  // toggle. All other Works stay owner-scoped even if a stale link is copied.
  if (!isExhibitedStarAsset(asset)) {
    if (!request) return null;
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(request);
    if (!auth.authenticated) return null;
    if (auth.userId !== identity.userId) {
      const account = await requireAccountIdentity(request).catch(()=>null);
      const pool = getPostgresPool();
      const stripe = StripeEngine.getInstance().getClient();
      if (!account || !pool || !stripe || !await mayReadOrbitWork(pool,stripe,account.id,identity.assetId,identity.userId,getStripeConfig().secretKey.includes('_live_'))) return null;
    }
  }
  const key = JSON.stringify([asset.userId, asset.id, asset.sha256, asset.updatedAt, thumbnail]);
  const cached = thumbnail ? thumbnails.get(key) : undefined;
  if (cached) return cached;
  return transforms.run(key, async () => {
    const bytes = await GalxR2AssetAdapter.getInstance().getAssetBuffer(asset.r2Key);
    const artifact = await (thumbnail ? sanitizeImageThumbnail(bytes) : sanitizeImageArtifact(bytes));
    if (thumbnail) thumbnails.put(key, artifact, artifact.bytes.byteLength);
    return artifact;
  });
}
