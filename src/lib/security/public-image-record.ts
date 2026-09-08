import type { ImageGenerationRecord } from '../../core/contracts/GalxContracts';
import { imageDownloadUrl } from './image-download-url';

/** Library metadata is user-owned, but backing storage and operational metadata are private. */
export function publicImageRecord(record: ImageGenerationRecord) {
  return { id: record.id, sessionId: record.sessionId, status: record.status,
    prompt: record.prompt, model: 'openai-gpt-image-latest', aspectRatio: record.aspectRatio,
    dimensions: record.dimensions, quality: record.quality,
    publicUrl: imageDownloadUrl(record.userId, record.id),
    isFavorite: record.isFavorite, tags: record.tags, createdAt: record.createdAt, updatedAt: record.updatedAt,
  };
}
