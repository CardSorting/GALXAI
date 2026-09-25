/** Stable destinations; search and sort remain local library controls. */
export const IMAGE_PATHS = { create: '/images/create', library: '/images/library', favorites: '/images/favorites' } as const;
export type ImageView = keyof typeof IMAGE_PATHS;

export function imageView(pathname: string): ImageView {
  const path = pathname.replace(/\/+$/, '');
  return path === IMAGE_PATHS.favorites ? 'favorites' : path === IMAGE_PATHS.library ? 'library' : 'create';
}

export function legacyImagePath(pathname: string, search: URLSearchParams): string | null {
  if (pathname.replace(/\/+$/, '') !== '/images') return null;
  if (!search.has('view')) return '/explore';
  const view = search.getAll('view').length === 1 ? search.get('view') : null;
  return view === 'library' ? IMAGE_PATHS.library : view === 'favorites' ? IMAGE_PATHS.favorites : IMAGE_PATHS.create;
}
