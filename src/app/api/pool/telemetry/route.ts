import { NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function GET() {
  const persistence = GalxPersistence.getInstance();
  const logs = persistence.getAuditLogs();
  const metrics = galxRouter.metrics.getMetrics();

  return NextResponse.json({
    metrics,
    logs: logs.slice(0, 100),
    totalLogs: logs.length,
    timestamp: Date.now()
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}
