import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

/**
 * GET /api/auth/security/posture
 * Returns the comprehensive user security posture, overall health grade, risk metrics, and recommendations.
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated || !auth.session) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401 }
      );
    }

    const posture = await authEngine.getUserSecurityPosture(auth.userId, auth.session.id);

    return NextResponse.json({
      success: true,
      posture
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve security posture' },
      { status: 500 }
    );
  }
}
