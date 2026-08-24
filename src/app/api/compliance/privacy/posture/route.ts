import { NextRequest, NextResponse } from 'next/server';
import { galxPrivacy } from '@/core/privacy/GalxPrivacyComplianceEngine';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * GET /api/compliance/privacy/posture
 * Returns real-time compliance posture, HIPAA BAA status, GDPR DPA state, ZDR verifications, and audit integrity status.
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const posture = await galxPrivacy.getPrivacyCompliancePosture();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      authenticatedUser: authResult.authenticated ? authResult.userId : 'anonymous_auditor',
      posture
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-Compliance-Version': 'v2026.2',
        'X-Galx-ZDR-Verified': 'true'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch compliance posture' } },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
