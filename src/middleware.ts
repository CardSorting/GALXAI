import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { SITE_CONFIG } from "@/lib/seo/siteConfig";
import { publishedSiteProxy } from '@/lib/sites/published-proxy';
import { previewMiddleware } from '@/lib/security/preview-middleware';
import { isPublicProductPath } from '@/lib/security/preview-policy';
import { isWorkspacePath } from '@/lib/security/workspace-policy';
import { legacyAuthPath } from '@/lib/auth/redirects';
import { legacyImagePath } from '@/lib/images/navigation';
import { isClosedProviderPath } from '@/lib/auth/provider-connection-route';
import { billingCompatibilityPath } from '@/lib/billing/compatibility';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  if (/^[a-z0-9-]+\.[a-z0-9-]+\.galx\.ai$/.test(host)) {
    if (!['GET','HEAD'].includes(request.method) || pathname !== '/') return new NextResponse('Site unavailable.',{status:404,headers:{'Cache-Control':'private, no-store'}});
    return publishedSiteProxy(request,host);
  }
  // Retired handlers return a terminal denial without parsing input or starting
  // an account/preview authentication flow. This is an exact route allowlist.
  if (isClosedProviderPath(pathname)) return NextResponse.next();
  const billingDestination = billingCompatibilityPath(pathname, request.nextUrl.searchParams);
  if (billingDestination && ['GET', 'HEAD'].includes(request.method)) {
    return NextResponse.redirect(new URL(billingDestination, request.url), { status: 307,
      headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  // Migrate bookmarks before rendering; only finite public fields reach Location.
  const canonical = legacyAuthPath(pathname, request.nextUrl.searchParams) ?? legacyImagePath(pathname, request.nextUrl.searchParams);
  if (canonical && ['GET', 'HEAD'].includes(request.method)) {
    return NextResponse.redirect(new URL(canonical, request.url), { status: 308,
      headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  // Retire the old public developer guides. Preserve only the product-capability
  // overview, and discard query parameters when redirecting legacy paths.
  if (pathname.startsWith('/docs/') && ['GET', 'HEAD'].includes(request.method)) {
    return NextResponse.redirect(new URL('/docs', request.url), { status: 308,
      headers: { 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  if (pathname.startsWith('/docs/') && request.method !== 'GET' && request.method !== 'HEAD') {
    return new NextResponse('Not found.', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  // Account workspaces require a session before any preview or asset exemption.
  if (isWorkspacePath(pathname)) return updateSession(request);
  const previewDenied = await previewMiddleware(request);
  if (previewDenied) return previewDenied;
  // The broad matcher protects private page assets too. Public static assets
  // must not refresh a signed-in user's session once per font/image/script.
  if (pathname.startsWith('/_next/') || /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|map)$/.test(pathname)) {
    const response = NextResponse.next();
    if (/^\/_next\/static\/chunks\/app\/admin\//.test(pathname)) {
      response.headers.set('Cache-Control', 'private, no-store');
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
    return response;
  }
  // This endpoint authenticates its machine credential in the handler. Keep its
  // response allowlist intact for every caller, including crawlers and cookies.
  if (pathname === '/api/internal/sites/domains/process') return NextResponse.next();
  if (pathname.startsWith('/api/sites/workspace') || pathname.startsWith('/api/sites/published/')) return NextResponse.next();

  // 1. Universal Google Search Console HTML verification file handler (/google[token].html)
  if (pathname.startsWith('/google') && pathname.endsWith('.html')) {
    const filename = pathname.replace(/^\//, '');
    return new NextResponse(`google-site-verification: ${filename}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 2. Universal Bing Webmaster Tools XML verification file handler (/BingSiteAuth.xml)
  if (pathname === '/BingSiteAuth.xml') {
    const bingKey = SITE_CONFIG.verification.bing;
    const xml = `<?xml version="1.0"?>
<users>
  <user>${bingKey}</user>
</users>`;
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 3. Universal Yandex Webmaster verification file handler (/yandex_[token].html)
  if (pathname.startsWith('/yandex_') && pathname.endsWith('.html')) {
    const token = pathname.replace(/^\/yandex_/, '').replace(/\.html$/, '');
    const html = `<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>Verification: ${token}</body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 4. Edge Crawler Firewall: Strictly block Googlebot, Google-Extended, and automated crawlers from training endpoints
  const isTrainingOrInternalEndpoint = pathname.startsWith('/api/internal') || pathname.startsWith('/api/training') || pathname.startsWith('/datasets');
  if (isTrainingOrInternalEndpoint) {
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    const isGoogleCrawler = 
      userAgent.includes('googlebot') ||
      userAgent.includes('google-extended') ||
      userAgent.includes('googleother') ||
      userAgent.includes('mediapartners-google') ||
      userAgent.includes('adsbot-google') ||
      userAgent.includes('feedfetcher-google') ||
      userAgent.includes('apis-google') ||
      userAgent.includes('appengine-google');

    if (isGoogleCrawler) {
      return new NextResponse(
        JSON.stringify({
          error: { code: 'access_denied', message: 'Access denied.' },
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate',
            'Googlebot': 'noindex, nofollow, noarchive',
          },
        }
      );
    }
  }

  const response = await updateSession(request);
  if (!isPublicProductPath(pathname)) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = { runtime: 'nodejs', matcher: ['/:path*'] };
