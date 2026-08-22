import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';

/**
 * POST /api/auth/sudo/elevate
 * Step-Up SUDO Mode Elevation (15-Minute Privileged Window for high-risk operations).
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated || !auth.session) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const durationMs = Number(body.durationMs) || 15 * 60 * 1000; // 15 mins default

    const result = await authEngine.elevateSessionSudo(auth.session.id, auth.userId, durationMs);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to elevate SUDO mode' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sudoActive: true,
      sudoElevatedUntilMs: result.sudoElevatedUntilMs,
      expiresInMs: result.expiresInMs,
      message: `SUDO mode successfully activated for ${Math.round(result.expiresInMs / 60000)} minutes.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error during SUDO elevation' },
      { status: 500 }
    );
  }
}
