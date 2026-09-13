/** Explicit public reading routes. Never widen this list to the private docs corpus. */
export const PUBLIC_READING_PATHS = [
  '/pricing',
  '/pricing/galx-pro',
  '/pricing/fair-use',
  '/pricing/billing-and-cancellation',
  '/faq',
  '/knowledge-base',
  '/knowledge-base/getting-started',
  '/knowledge-base/revising-your-site',
  '/knowledge-base/publishing-your-site',
  '/knowledge-base/public-beta',
  '/knowledge-base/images-and-developer-access',
] as const;

const readingPaths = new Set<string>(PUBLIC_READING_PATHS);
export function isPublicReadingPath(pathname: string) { return readingPaths.has(pathname); }

export const PUBLIC_NAVIGATION = [
  { label: 'Sites', href: '/sites' },
  { label: 'Images', href: '/images' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Knowledge base', href: '/knowledge-base' },
  { label: 'Developer preview', href: '/developers' },
] as const;
