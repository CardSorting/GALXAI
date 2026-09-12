import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * GET /api/auth/security/posture
 * Returns the comprehensive user security posture, overall health grade, risk metrics, and recommendations.
 */
async function previewGET(req: NextRequest) {
  try {
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve security posture' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const GET = withDeveloperAccess(previewGET);
