import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '../../../../../core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Standard RFC 7009 OAuth 2.0 Token Revocation Endpoint.
 * Revokes active access tokens or refresh tokens and invalidates downstream caches.
 * According to RFC 7009 § 2.2, returns HTTP 200 even if the token was already invalid or revoked.
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
      return NextResponse.json({ error: 'invalid_request', error_description: 'Missing token parameter' }, { status: 400 });
    }

    const authEngine = GalxAuthEngine.getInstance();
    await authEngine.revokeSession(token, 'RFC 7009 OAuth token revocation');

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
  } catch (err: any) {
    // RFC 7009 § 2.2: The authorization server responds with HTTP status code 200
    // if the token has been revoked successfully or if the client submitted an invalid token.
    return new NextResponse(null, { status: 200 });
  }
}
