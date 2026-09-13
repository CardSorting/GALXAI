import { BroccoliBoundedCache, BroccoliReadCoordinator } from '@/core/broccolidb/broccolidb-bounded-cache';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { ImageLibraryRepository } from '@/lib/supabase/repositories/ImageLibraryRepository';
import { GalxR2AssetAdapter } from '@/workers/cloudflare/GalxR2AssetAdapter';
import { sanitizeImageArtifact, sanitizeImageThumbnail, type PublicImageArtifact } from '@/lib/security/image-artifact';

const thumbnails = new BroccoliBoundedCache<PublicImageArtifact>('galx_image_thumbnails', { entries: 128, bytes: 16 * 1024 * 1024, ttlMs: 300_000 });
const transforms = new BroccoliReadCoordinator(2, 64);

/** Authorization precedes every cache hit, including reads after deletion. */
export async function readImageArtifact(token: string, thumbnail = false): Promise<PublicImageArtifact | null> {
  const identity = GalxCryptoVault.openImageDownload(token);
  if (!identity) return null;
  const asset = await ImageLibraryRepository.getInstance().getAsset(identity.userId, identity.assetId);
  if (!asset || asset.status !== 'completed') return null;
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
