import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';

/**
 * GET /api/auth/session
 * Introspects and validates the current bearer session token against Supabase PostgreSQL.
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const identity = await authEngine.resolveAuthIdentity(req);

    if (!identity.authenticated || !identity.session || !identity.claims) {
      return NextResponse.json({ valid: false, error: identity.error || 'Invalid or expired session' }, { status: 401 });
    }

    const token = identity.token || '';

    return NextResponse.json({
      valid: true,
      user: {
        id: identity.claims.sub,
        email: identity.claims.email,
        name: identity.claims.name,
        provider: identity.claims.provider,
        shardId: identity.claims.shardId,
        shardMode: identity.claims.shardMode,
        token
      },
      claims: identity.claims,
      session: identity.session
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/session
 * Instantly revokes the current session across memory cache and Supabase PostgreSQL.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const identity = await authEngine.resolveAuthIdentity(req);

    const token = identity.token || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Missing token to revoke' }, { status: 400 });
    }

    const success = await authEngine.revokeSession(token, 'User initiated logout');

    const response = NextResponse.json({
      success,
      message: success ? 'Session revoked successfully' : 'Session not found or already inactive'
    });

    // Clear session cookie
    response.cookies.set('galx_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
