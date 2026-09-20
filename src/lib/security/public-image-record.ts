import type { ImageGenerationRecord } from '../../core/contracts/GalxContracts';
import { imageDownloadUrl } from './image-download-url';

/** Library metadata is user-owned, but backing storage and operational metadata are private. */
export function publicImageRecord(record: ImageGenerationRecord) {
  const publicUrl = imageDownloadUrl(record.userId, record.id);
  const visibility = record.visibility === 'unlisted'
    ? 'unlisted'
    : record.visibility === 'private' || record.isPublic === false
      ? 'private'
      : 'public';
  return { id: record.id, sessionId: record.sessionId, status: record.status,
    prompt: record.prompt, model: 'galx-nova-image', aspectRatio: record.aspectRatio,
    dimensions: record.dimensions, quality: record.quality,
    publicUrl, thumbnailUrl: `${publicUrl}/thumbnail`,
    isFavorite: record.isFavorite, isPublic: visibility === 'public', visibility,
    tags: record.tags, createdAt: record.createdAt, updatedAt: record.updatedAt,
  };
}

/** Bounded card metadata. Full prompts are available through the owner-authorized detail route. */
export function publicImageSummary(record: ImageGenerationRecord) {
  const publicUrl = imageDownloadUrl(record.userId, record.id);
  const visibility = record.visibility === 'unlisted'
    ? 'unlisted'
    : record.visibility === 'private' || record.isPublic === false
      ? 'private'
      : 'public';
  return { id: record.id, status: record.status, promptPreview: record.prompt.slice(0, 300),
    aspectRatio: record.aspectRatio, quality: record.quality, publicUrl, thumbnailUrl: `${publicUrl}/thumbnail`,
    isFavorite: record.isFavorite, visibility, createdAt: record.createdAt };
}
