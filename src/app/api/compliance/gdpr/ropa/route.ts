import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { galxPrivacy } from '@/core/privacy/GalxPrivacyComplianceEngine';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

async function previewGET(req: NextRequest) {
  try {
    const ropa = galxPrivacy.generateRoPAReport();
    return NextResponse.json(ropa, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Galx-GDPR-RoPA': 'Article-30-Compliant',
        'X-Galx-RoPA-Seal': ropa.cryptographicSealSha256
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate GDPR RoPA report' },
      { status: 500 }
    );
  }
}

export const GET = withDeveloperAccess(previewGET);
