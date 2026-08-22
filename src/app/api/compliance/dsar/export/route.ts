import { NextRequest, NextResponse } from 'next/server';
import { galxPrivacy } from '@/core/privacy/GalxPrivacyComplianceEngine';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * POST /api/compliance/dsar/export
 * GDPR Article 15 (Right of Access) & CCPA § 1798.110 DSAR Data Export.
 * Compiles all non-ephemeral records for authenticated tenant or requested userId.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    let targetUserId = authResult.userId;
    try {
      const body = await req.json();
      if (body && body.userId && (authResult.claims?.role === 'admin' || authResult.claims?.role === 'owner' || !authResult.authenticated)) {
        targetUserId = body.userId;
      }
    } catch {}

    if (!targetUserId || targetUserId === 'anonymous_developer') {
      return NextResponse.json(
        { error: { message: 'Authentication or target userId required for DSAR export' } },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const exportData = await galxPrivacy.exportUserData(targetUserId);

    return NextResponse.json({
      success: true,
      dsarExport: exportData
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': `attachment; filename="dsar_export_${targetUserId}.json"`,
        'X-Galx-GDPR-DSAR': 'completed'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'DSAR export failed' } },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
