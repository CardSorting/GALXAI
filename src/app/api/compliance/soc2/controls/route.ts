import { NextRequest, NextResponse } from 'next/server';
import { galxSOC2 } from '@/core/compliance/GalxSOC2AuditEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const controls = galxSOC2.getSOC2ControlMatrix();
    return NextResponse.json(
      {
        standard: 'AICPA SOC 2 Type II (Trust Services Criteria)',
        totalControls: controls.length,
        controls
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Galx-SOC2-Controls-Count': String(controls.length)
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve SOC 2 controls' },
      { status: 500 }
    );
  }
}
