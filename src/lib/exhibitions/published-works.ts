import 'server-only';
import { PublicParticipantRepository } from '@/lib/community/public-participants';
import { selectPublishedArtwork } from './public-artwork';
import type { CuratedArtwork } from './catalog';

export async function getPublishedWorks(works: readonly CuratedArtwork[]) {
  const handles = [...new Set(works.map(work => work.handle))];
  const pages = await Promise.all(handles.map(async handle => {
    try {
      const ids = works.filter(work => work.handle === handle).map(work => work.id);
      const items = await PublicParticipantRepository.getSelectedCreations(handle, ids);
      return [handle, items] as const;
    } catch {
      return [handle, []] as const;
    }
  }));
  const byHandle = new Map<string, readonly unknown[]>(pages);
  return new Map(works.map(work => [work.id, selectPublishedArtwork(work, byHandle.get(work.handle) ?? [])]));
}
