import type { ImageGenerationResponse } from '../../core/contracts/GalxContracts';
import { decodeImageBase64, sanitizeImageArtifact, type ImageFormat } from './image-artifact';
import { imageDownloadUrl } from './image-download-url';
import { imageBytesResponse, imageJsonResponse } from './public-image-http';

export type ImageResponseFormat = 'binary' | 'url' | 'b64_json';
/** Private normalization: no upstream field crosses directly into the HTTP serializer. */
export async function normalizeImageOutput(result: ImageGenerationResponse, options: {
  requestId: string; userId: string; responseFormat: ImageResponseFormat; outputFormat?: ImageFormat;
}): Promise<Response> {
  if (!Array.isArray(result.data) || !result.data.length || result.data.length > 4) throw new Error('Invalid image result');
  if (options.responseFormat === 'binary' && result.data.length !== 1) throw new Error('Invalid image count');
  const artifacts = [];
  for (const image of result.data) {
    let bytes: Buffer;
    if (typeof image.b64_json === 'string') bytes = decodeImageBase64(image.b64_json);
    else {
      // Historical completed requests may retain only the owned asset reference.
      // Resolve through private storage; never fetch the URL in an internal result.
      if (typeof image.asset_id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(image.asset_id)) throw new Error('Missing image artifact');
      const { ImageLibraryRepository } = await import('../supabase/repositories/ImageLibraryRepository');
      const { GalxR2AssetAdapter } = await import('../../workers/cloudflare/GalxR2AssetAdapter');
      const record = await ImageLibraryRepository.getInstance().getAsset(options.userId, image.asset_id);
      if (!record) throw new Error('Image unavailable');
      bytes = await GalxR2AssetAdapter.getInstance().getAssetBuffer(record.r2Key);
    }
    const clean = await sanitizeImageArtifact(bytes, options.outputFormat);
    artifacts.push(clean);
  }
  if (options.responseFormat === 'binary') return imageBytesResponse(artifacts[0], options.requestId);
  return imageJsonResponse(artifacts.map((artifact, index) => {
    const assetId = result.data[index].asset_id;
    if (options.responseFormat === 'url') {
      // A data URL is the supported fallback when durable image storage is temporarily unavailable.
      return { url: typeof assetId === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(assetId) && !options.outputFormat
        ? imageDownloadUrl(options.userId, assetId)
        : `data:${artifact.contentType};base64,${artifact.bytes.toString('base64')}` };
    }
    return { b64_json: artifact.bytes.toString('base64') };
  }), options.requestId);
}
