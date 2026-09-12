import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { galxSOC2 } from '@/core/compliance/GalxSOC2AuditEngine';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

async function previewGET(req: NextRequest) {
  try {
    const oscal = galxSOC2.generateOSCALAssessmentReport();
    return NextResponse.json(oscal, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Galx-OSCAL-Version': oscal.oscalVersion,
        'X-Galx-OSCAL-Signature': oscal.digitalSignatureSha256
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate OSCAL assessment report' },
      { status: 500 }
    );
  }
}

export const GET = withDeveloperAccess(previewGET);
