import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';

/**
 * GET /api/auth/session
 * Introspects and validates the current bearer session token against Supabase PostgreSQL.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Missing bearer authorization token' }, { status: 401 });
    }

    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.verifySession(token, true);

    if (!result.valid || !result.claims) {
      return NextResponse.json({ valid: false, error: result.error || 'Invalid or expired session' }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: result.claims.sub,
        email: result.claims.email,
        name: result.claims.name,
        provider: result.claims.provider,
        shardId: result.claims.shardId,
        shardMode: result.claims.shardMode,
        token
      },
      claims: result.claims,
      session: result.session
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
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Missing token to revoke' }, { status: 400 });
    }

    const authEngine = GalxAuthEngine.getInstance();
    const success = await authEngine.revokeSession(token, 'User initiated logout');

    return NextResponse.json({
      success,
      message: success ? 'Session revoked successfully' : 'Session not found or already inactive'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
