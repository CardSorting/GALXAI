import { NextRequest, NextResponse } from 'next/server';
import { GalxOAuthManager } from '../../../../../core/auth/GalxOAuthManager';

/**
 * Standard RFC 7662 OAuth 2.0 Token Introspection Endpoint.
 * Resolves token validity, claims, scopes, and expiration in sub-milliseconds.
 */
export async function POST(req: NextRequest) {
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
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const oauthManager = GalxOAuthManager.getInstance();
    const result = await oauthManager.introspectToken(token);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { active: false, error: err.message || 'Introspection failed' },
      { status: 500 }
    );
  }
}
