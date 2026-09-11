import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { SITE_CONFIG } from "@/lib/seo/siteConfig";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // This endpoint authenticates its machine credential in the handler. Keep its
  // response allowlist intact for every caller, including crawlers and cookies.
  if (pathname === '/api/internal/sites/domains/process') return NextResponse.next();

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
          error: 'Access Denied. Search engine and data crawlers are strictly quarantined from internal training substrates.',
          status: 'crawler_quarantine_active',
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

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg (favicon files)
     * - robots.txt, sitemap.xml, feed.xml, manifest.webmanifest, opensearch.xml
     * - public assets & static font/image extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|robots\\.txt|sitemap\\.xml|feed\\.xml|manifest\\.webmanifest|opensearch\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|map)$).*)",
  ],
};
