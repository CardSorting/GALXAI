import { NextRequest, NextResponse } from 'next/server';
import { galxSOC2 } from '@/core/compliance/GalxSOC2AuditEngine';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || 'galx-enterprise-primary';
    const evidence = await galxSOC2.generateSOC2EvidenceDossier(tenantId);

    return NextResponse.json(evidence, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Galx-SOC2-Evidence': evidence.dossierId,
        'X-Galx-Audit-Signature': evidence.cryptographicProof.dossierSignatureSha256
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate SOC 2 evidence dossier' },
      { status: 500 }
    );
  }
}
