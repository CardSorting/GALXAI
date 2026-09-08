import { NextRequest, NextResponse } from 'next/server';
import { BroccoliTelemetryEngine } from '@/core/telemetry/BroccoliTelemetryEngine';
import { hasInternalAccess } from '@/lib/security/internal-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!hasInternalAccess(req.headers)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
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
          'Cache-Control': 'no-store',
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
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}
