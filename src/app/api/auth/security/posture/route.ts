import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { hasInternalAccess } from '@/lib/security/internal-access';
import { sessionFailure, sessionResponse } from '@/lib/auth/session-http';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/security/posture
 * Returns the comprehensive user security posture, overall health grade, risk metrics, and recommendations.
 */
async function previewGET(req: NextRequest) {
  try {
    if (!hasInternalAccess(req.headers)) return sessionResponse({ error: 'Administrator authorization is required.' }, 403);
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated || !auth.session) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const posture = await authEngine.getUserSecurityPosture(auth.userId, auth.session.id);

    return NextResponse.json({
      success: true,
      posture
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return sessionFailure(error);
  }
}

export const GET = withDeveloperAccess(previewGET);
