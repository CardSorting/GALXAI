/** Explicit public reading routes. Never widen this list to the private docs corpus. */
export const PUBLIC_READING_PATHS = [
  '/pricing',
  '/pricing/galx-pro',
  '/pricing/fair-use',
  '/pricing/billing-and-cancellation',
  '/faq',
  '/knowledge-base',
  '/knowledge-base/getting-started',
  '/knowledge-base/remixing-creations',
  '/knowledge-base/public-creations',
  '/knowledge-base/public-beta',
] as const;

const readingPaths = new Set<string>(PUBLIC_READING_PATHS);
export function isPublicReadingPath(pathname: string) { return readingPaths.has(pathname); }

export const PUBLIC_NAVIGATION = [
  { label: 'Explore', href: '/explore' },
  { label: 'Images', href: '/images' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Knowledge base', href: '/knowledge-base' },
] as const;
