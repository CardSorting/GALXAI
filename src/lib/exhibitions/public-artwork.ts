import type { CuratedArtwork } from './catalog';

export type ArtworkAvailability = { id: string; src: string | null; thumbnailSrc: string | null };

/** Only a selected, currently public STAR work may supply an exhibition image. */
export function selectPublishedArtwork(work: CuratedArtwork, candidates: readonly unknown[]): ArtworkAvailability {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const row = candidate as Record<string, unknown>;
    if (row.id !== work.id || !row.author || typeof row.author !== 'object') continue;
    const author = row.author as Record<string, unknown>;
    if (author.handle !== work.handle || author.participantKind !== 'star') continue;
    if (typeof row.public_url !== 'string' || !/^\/v1\/images\/assets\/[A-Za-z0-9._-]+$/.test(row.public_url)) continue;
    return { id: work.id, src: row.public_url, thumbnailSrc: row.thumbnail_url === `${row.public_url}/thumbnail` ? row.thumbnail_url : null };
  }
  return { id: work.id, src: null, thumbnailSrc: null };
}
