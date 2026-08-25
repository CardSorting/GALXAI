import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * GET /api/auth/sessions
 * Lists all active logged-in devices and sessions for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated || !auth.session) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const sessions = await authEngine.getUserActiveSessions(auth.userId, auth.session.id);

    return NextResponse.json({
      success: true,
      sessions,
      total: sessions.length,
      currentSessionId: auth.session.id
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve active sessions' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

/**
 * DELETE /api/auth/sessions
 * Revokes all active sessions for the current user EXCEPT the current session (Remote Logout).
 */
export async function DELETE(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated || !auth.session) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const revokedCount = await authEngine.revokeOtherSessions(
      auth.userId,
      auth.session.id,
      'User initiated logout of all other devices'
    );

    return NextResponse.json({
      success: true,
      message: `Successfully terminated ${revokedCount} remote session(s).`,
      revokedCount
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke remote sessions' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
