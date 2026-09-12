import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { galxSOC2 } from '@/core/compliance/GalxSOC2AuditEngine';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

async function previewGET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get('modelId') || 'galx-gateway-ensemble';

    const dossier = galxSOC2.generateEUAIActAnnexIVDossier(modelId);
    return NextResponse.json(dossier, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Galx-EU-AI-Act': 'Article-53-Annex-IV-Compliant',
        'X-Galx-Annex-IV-Seal': dossier.cryptographicProofSha256
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate EU AI Act Annex IV dossier' },
      { status: 500 }
    );
  }
}

export const GET = withDeveloperAccess(previewGET);
