import { NextRequest, NextResponse } from 'next/server';
import { enforceDeveloperAccess } from './developer-access';
import { isApiPath, isMachineRoute, isPublicFrameworkAssetPath, isPublicProductPath, normalizedPath } from './preview-policy';
import { enforcePreviewAdmin } from '@/lib/admin/preview-route';

export async function previewMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const path = normalizedPath(req.nextUrl.pathname);
  // Staff access is independent of preview approval, API keys and internal service credentials.
  if (/^\/(?:admin|api\/admin)(?:\/|$)/.test(path) || /^\/_next\/static\/chunks\/app\/admin\//.test(path)) {
    const denied = await enforcePreviewAdmin(req);
    if (!denied) return null;
    if (path.startsWith('/admin') && ['GET', 'HEAD'].includes(req.method)) {
      if (denied.status === 401) {
        const url = new URL('/login?next=/admin', req.url);
        return NextResponse.redirect(url, { headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
      }
      return new NextResponse('This page is unavailable.', { status: denied.status === 403 ? 404 : 503,
        headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return denied;
  }
  // Framework assets are immutable and contain no grants. Page-specific developer
  // chunks are private as well; shared chunks must satisfy the public-content scan.
  if (path.startsWith('/_next/')) {
    if (isPublicFrameworkAssetPath(path)) return null;
  } else if (isPublicProductPath(path) || isMachineRoute(path)) return null;
  if (isApiPath(path) && req.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Api-Key, X-Galx-Key', 'Cache-Control': 'private, no-store',
  } });
  const denied = await enforceDeveloperAccess(req);
  if (!denied) return null;
  if (isApiPath(path) || path.startsWith('/_next/') || !['GET', 'HEAD'].includes(req.method)) return denied;
  const url = req.nextUrl.clone();
  url.pathname = '/developers';
  // Never copy credentials or arbitrary query strings into the redirect.
  url.search = '';
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
