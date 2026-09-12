import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxOAuthManager } from '@/core/auth/GalxOAuthManager';
import { GalxModelRouter } from '@/core/router/GalxModelRouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Standard RFC 7662 OAuth 2.0 Token Introspection Endpoint.
 * Resolves token validity, claims, scopes, and expiration in sub-milliseconds.
 */
async function previewPOST(req: NextRequest) {
  try {
    let token = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      token = (formData.get('token') as string) || '';
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token || '';
    }

    if (!token) {
      return NextResponse.json({ active: false }, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'application/json'
        }
      });
    }

    const oauthManager = GalxOAuthManager.getInstance();
    const result = await oauthManager.introspectToken(token);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  } catch (err: any) {
    const sanitized = GalxModelRouter.sanitizeUpstreamError(err?.message || 'Introspection failed');
    return NextResponse.json(
      { active: false, error: sanitized },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}

export const POST = withDeveloperAccess(previewPOST);
