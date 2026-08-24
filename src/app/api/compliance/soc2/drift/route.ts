import { NextRequest, NextResponse } from 'next/server';
import { galxDriftDetector } from '@/core/compliance/GalxSOC2DriftDetector';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const driftReport = galxDriftDetector.evaluateControlDrift();
    return NextResponse.json(driftReport, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Galx-SOC2-Drift-Posture': driftReport.overallDriftPosture,
        'X-Galx-Compliant-Count': String(driftReport.compliantControlsCount)
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to evaluate SOC 2 control drift' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { controlId } = body;
    if (!controlId) {
      return NextResponse.json({ error: 'controlId is required for remediation' }, { status: 400 });
    }

    const result = galxDriftDetector.autoRemediateControl(controlId);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to auto-remediate control' },
      { status: 500 }
    );
  }
}
