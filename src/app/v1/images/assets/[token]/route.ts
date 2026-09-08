import { NextRequest } from 'next/server';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { ImageLibraryRepository } from '@/lib/supabase/repositories/ImageLibraryRepository';
import { GalxR2AssetAdapter } from '@/workers/cloudflare/GalxR2AssetAdapter';
import { sanitizeImageArtifact } from '@/lib/security/image-artifact';
import { imageBytesResponse, imageError } from '@/lib/security/public-image-http';
import { logImageFailure } from '@/lib/security/private-image-diagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const identity = GalxCryptoVault.openImageDownload((await params).token);
    if (!identity) return imageError('not_found', requestId);
    const asset = await ImageLibraryRepository.getInstance().getAsset(identity.userId, identity.assetId);
    if (!asset) return imageError('not_found', requestId);
    const bytes = await GalxR2AssetAdapter.getInstance().getAssetBuffer(asset.r2Key);
    return imageBytesResponse(await sanitizeImageArtifact(bytes), requestId);
  } catch (error) {
    logImageFailure(requestId, error);
    return imageError('temporarily_unavailable', requestId);
  }
}
