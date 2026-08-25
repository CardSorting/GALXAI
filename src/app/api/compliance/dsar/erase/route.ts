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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * POST /api/compliance/dsar/erase
 * GDPR Article 17: Right to Erasure ("Right to be Forgotten").
 * Permanently and cryptographically wipes all user sessions, API keys, credentials, and anonymizes audit logs.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const body = await req.json().catch(() => ({}));
    let targetUserId = authResult.userId;
    if (body.userId && (authResult.claims?.role === 'admin' || authResult.claims?.role === 'owner' || !authResult.authenticated)) {
      targetUserId = body.userId;
    }

    if (!targetUserId || targetUserId === 'anonymous_developer') {
      return NextResponse.json(
        { error: { message: 'Valid authorization or target userId required for Right to Erasure execution' } },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const reason = body.reason || 'User submitted GDPR Art. 17 Right to Erasure request';
    const purgeResult = await galxPrivacy.eraseUserData(targetUserId, reason);

    return NextResponse.json({
      success: true,
      purgeResult
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-GDPR-Erasure-Proof': purgeResult.cryptographicProof
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Right to Erasure execution failed' } },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
