import { NextRequest, NextResponse } from 'next/server';
import { BroccoliTelemetryEngine } from '@/core/telemetry/BroccoliTelemetryEngine';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const internalSecret = req.headers.get('x-galx-internal-key');
    const isValidInternal = internalSecret && internalSecret === process.env.GALX_INTERNAL_ADMIN_KEY;

    if (!authResult.authenticated && !isValidInternal) {
      return NextResponse.json(
        { error: 'Unauthorized. Internal telemetry pipeline access required.' },
        { status: 401 }
      );
    }

    const telemetry = BroccoliTelemetryEngine.getInstance();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');
    const windowMs = parseInt(searchParams.get('windowMs') || '3600000', 10);

    // Prometheus / OpenMetrics Exposition Format
    if (format === 'prometheus' || req.headers.get('accept')?.includes('text/plain')) {
      const promText = telemetry.toPrometheusFormat(windowMs);
      return new NextResponse(promText, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      });
    }

    // Default JSON Snapshot
    const summaries = telemetry.getAllMetricSummaries(windowMs);
    return NextResponse.json({
      status: 'operational',
      engine: 'BroccoliDB_Silent_Telemetry_L1',
      windowMs,
      totalRetainedPoints: telemetry.metricsTable.count(),
      metrics: summaries,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal telemetry error' }, { status: 500 });
  }
}
