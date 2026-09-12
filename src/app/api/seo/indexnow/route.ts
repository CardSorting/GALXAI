import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const dynamic = 'force-dynamic';

/**
 * IndexNow Search Engine Indexation Dispatcher
 * Submits updated URLs to the IndexNow protocol (supported by Bing, Yandex, Seznam, Naver).
 */
async function previewPOST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const urls: string[] = body.urls || [SITE_CONFIG.url];

    const payload = {
      host: new URL(SITE_CONFIG.url).hostname,
      key: SITE_CONFIG.indexNow.key,
      keyLocation: SITE_CONFIG.indexNow.keyLocation,
      urlList: urls,
    };

    // Dispatch to IndexNow universal endpoint
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    const ok = response.ok;

    return NextResponse.json({
      success: ok,
      status,
      submittedUrls: urls.length,
      host: payload.host,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during IndexNow submission',
      },
      { status: 500 }
    );
  }
}

async function previewGET() {
  return NextResponse.json({
    protocol: 'IndexNow & Search Console Dispatcher',
    host: new URL(SITE_CONFIG.url).hostname,
    keyLocation: SITE_CONFIG.indexNow.keyLocation,
    status: 'active',
  });
}

export const POST = withDeveloperAccess(previewPOST);
export const GET = withDeveloperAccess(previewGET);
