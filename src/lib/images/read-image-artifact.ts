import { BroccoliBoundedCache, BroccoliReadCoordinator } from '@/core/broccolidb/broccolidb-bounded-cache';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import type { NextRequest } from 'next/server';
import { ImageLibraryRepository } from '@/lib/supabase/repositories/ImageLibraryRepository';
import { GalxR2AssetAdapter } from '@/workers/cloudflare/GalxR2AssetAdapter';
import { sanitizeImageArtifact, sanitizeImageThumbnail, type PublicImageArtifact } from '@/lib/security/image-artifact';

const thumbnails = new BroccoliBoundedCache<PublicImageArtifact>('galx_image_thumbnails', { entries: 128, bytes: 16 * 1024 * 1024, ttlMs: 300_000 });
const transforms = new BroccoliReadCoordinator(2, 64);

/** Authorization precedes every cache hit, including reads after deletion. */
export async function readImageArtifact(token: string, thumbnail = false, request?: NextRequest): Promise<PublicImageArtifact | null> {
  const identity = GalxCryptoVault.openImageDownload(token);
  if (!identity) return null;
  const asset = await ImageLibraryRepository.getInstance().getAsset(identity.userId, identity.assetId);
  if (!asset || asset.status !== 'completed') return null;
  // Public links are intentionally readable without a session. Private links
  // are owner-scoped even when the opaque URL has been copied or cached.
  // `unlisted` remains link-addressable by design; it is hidden from feeds,
  // but only the explicit `private` state (or a legacy non-unlisted false
  // flag) receives owner-session enforcement.
  const isPrivate = asset.visibility === 'private' || (asset.visibility !== 'unlisted' && asset.isPublic === false);
  if (isPrivate) {
    if (!request) return null;
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(request);
    if (!auth.authenticated || auth.userId !== identity.userId) return null;
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
