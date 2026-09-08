import { GalxCryptoVault } from '../../core/vault/GalxCryptoVault';

export function imageDownloadUrl(userId: string, assetId: string): string {
  const token = GalxCryptoVault.sealImageDownload(userId, assetId);
  // Never derive a public URL from caller-controlled Host / Forwarded headers.
  return new URL(`/v1/images/assets/${token}`, process.env.NEXT_PUBLIC_APP_URL || 'https://galx.ai').toString();
}
