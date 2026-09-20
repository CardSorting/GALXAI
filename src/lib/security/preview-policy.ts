import { isPublicReadingPath } from '@/lib/public-content/routes';
/** Products exempt from developer approval; account/session gates still apply. */
const publicPages = new Set(['/', '/home', '/about', '/explore', '/images', '/images/library', '/images/favorites', '/library', '/sites', '/pricing',
  '/login', '/signup', '/auth/signin', '/auth/signup', '/auth/callback', '/terms', '/privacy', '/status', '/checkout', '/checkout/success']);
const publicApis = new Set(['/api/health', '/api/openapi.json', '/api/auth/signup-offer', '/api/auth/session',
  '/api/developer-access', '/api/developer-access/feedback', '/api/developer-access/check',
  '/api/sites/workspace', '/api/sites/content', '/api/sites/domains',
  '/api/images/availability', '/api/images/feed', '/api/images/moderate', '/api/images/library', '/api/images/library/batch', '/v1/images/generations',
  '/api/billing', '/api/billing/plan', '/api/billing/quote', '/api/billing/generation-quota', '/api/wallet/summary',
  '/api/wallet/usage', '/api/wallet/transactions', '/api/wallet/deposit', '/api/wallet/estimate', '/api/wallet/auto-topup',
  '/api/stripe/config', '/api/stripe/checkout', '/api/stripe/session', '/api/stripe/portal', '/api/stripe/webhook',
  '/api/seo/rates', '/api/compute/pool']);
const publicAssets = new Set(['/favicon.ico', '/favicon.svg', '/robots.txt', '/sitemap.xml', '/feed.xml',
  '/manifest.webmanifest', '/opensearch.xml', '/icon-192.png', '/icon.png', '/apple-icon.png', '/apple-touch-icon.png', '/icon-512.png', '/apple-touch-icon-precomposed.png',
  '/opengraph-image', '/twitter-image', '/api/og', '/BingSiteAuth.xml',
  '/.well-known/security.txt', '/.well-known/pgp-key.txt', '/.well-known/traffic-advice', '/.well-known/ai-plugin.json']);
export function normalizedPath(pathname: string): string {
  try { return decodeURIComponent(pathname).replace(/\/+$/, '') || '/'; } catch { return '/invalid-private-path'; }
}
export function isApiPath(pathname: string): boolean { return /^\/(?:api|v1)(?:\/|$)/.test(pathname); }
export function isPublicProductPath(pathname: string): boolean {
  const p = normalizedPath(pathname);
  if (publicApis.has(p) || publicPages.has(p) || publicAssets.has(p) || isPublicReadingPath(p)) return true;
  // Resource identifiers never extend an exemption to sibling API namespaces.
  if (/^\/v1\/images\/(?:requests\/[^/]+(?:\/stream)?|assets\/[^/]+(?:\/thumbnail)?|sessions\/[^/]+)$/.test(p)) return true;
  if (/^\/api\/images\/library\/[^/]+$/.test(p) || /^\/api\/sites\/published\/[^/]+$/.test(p)) return true;
  if (/^\/api\/community\/participants\/[a-z0-9][a-z0-9_-]{2,31}$/.test(p)) return true;
  if (/^\/profile\/[a-z0-9][a-z0-9_-]{2,31}$/.test(p)) return true;
  if (/^\/sites\/[^/]+$/.test(p) || /^\/billing(?:\/|$)/.test(p)) return true;
  if (/^\/(?:brand|fonts|inspiration|images\/showcase)\//.test(p) || /^\/images\/studio\/(?:desert|glass|paper)\.webp$/.test(p)) return true;
  if (/^\/(?:google[^/]+\.html|yandex_[^/]+\.html)$/.test(p)) return true;
  return false;
}
/** Framework assets inherit access only from an exact, reviewed route template. */
export function isPublicFrameworkAssetPath(pathname: string): boolean {
  const path = normalizedPath(pathname);
  if (!path.startsWith('/_next/')) return false;
  const pageChunk = path.match(/^\/_next\/static\/chunks\/app\/(.+)\/(?:page|layout)-[^/]+\.js$/);
  if (!pageChunk) return true;
  const route = '/' + pageChunk[1];
  if (route === '/profile/[handle]') return true;
  return isPublicProductPath(route);
}
export function isMachineRoute(pathname: string): boolean {
  // These handlers must retain their independent administrator/signature checks.
  return /^\/api\/internal(?:\/|$)/.test(pathname) || pathname === '/api/credits/stripe';
}
