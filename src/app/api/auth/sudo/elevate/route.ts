import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

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
 * POST /api/auth/sudo/elevate
 * Step-Up SUDO Mode Elevation (15-Minute Privileged Window for high-risk operations).
 */
async function previewPOST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated || !auth.session) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const durationMs = Number(body.durationMs) || 15 * 60 * 1000; // 15 mins default

    const result = await authEngine.elevateSessionSudo(auth.session.id, auth.userId, durationMs);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to elevate SUDO mode' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return NextResponse.json({
      success: true,
      sudoActive: true,
      sudoElevatedUntilMs: result.sudoElevatedUntilMs,
      expiresInMs: result.expiresInMs,
      message: `SUDO mode successfully activated for ${Math.round(result.expiresInMs / 60000)} minutes.`
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error during SUDO elevation' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const POST = withDeveloperAccess(previewPOST);
