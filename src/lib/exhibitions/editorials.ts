import { EDITORIALS, EXHIBITIONS, type Editorial } from './catalog';

/** Continue in authored order, wrapping to the beginning after the final essay. */
export function nextEditorial(slug: string, essays: readonly Editorial[] = EDITORIALS) {
  const index = essays.findIndex(essay => essay.slug === slug);
  return index < 0 || essays.length < 2 ? null : essays[(index + 1) % essays.length];
}

export function getEditorialContext(essay: Editorial) {
  const exhibition = EXHIBITIONS.find(item => item.slug === essay.exhibitionSlug);
  const work = exhibition?.works.find(item => item.id === essay.imageId);
  return exhibition && work ? { exhibition, work } : null;
}

export function editorialReadingMinutes(essay: Pick<Editorial, 'paragraphs'>) {
  const words = essay.paragraphs.join(' ').trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function editorialDate(publishedOn: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${publishedOn}T00:00:00Z`));
}
