import { NextRequest, NextResponse } from 'next/server';
import { galxSOC2 } from '@/core/compliance/GalxSOC2AuditEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const posture = await galxSOC2.getSOC2PostureReport();
    return NextResponse.json(posture, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Galx-SOC2-Status': posture.auditReadinessStatus,
        'X-Galx-SOC2-Score': String(posture.overallComplianceScore)
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve SOC 2 compliance posture' },
      { status: 500 }
    );
  }
}
