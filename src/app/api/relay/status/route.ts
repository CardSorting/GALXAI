import { hasInternalAccess } from '@/lib/security/internal-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxRelaySupervisor } from '@/core/relay/GalxRelaySupervisor';
import { GalxTunnelSupervisor } from '@/core/relay/GalxTunnelSupervisor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Dedicated Next.js API Route for Relay Telemetry & Status.
 * GET /api/relay/status
 */
export async function GET(req: NextRequest) {
  if (!hasInternalAccess(req.headers)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  try {
    const status = await GalxRelaySupervisor.getStatus();
    const tunnel = GalxTunnelSupervisor.getTunnelState();

    return NextResponse.json({
      ...status,
      tunnel,
      timestamp: Date.now()
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'x-galx-relay-status': status.isOnline ? 'online' : 'offline'
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      isOnline: false,
      error: 'Service unavailable',
      timestamp: Date.now()
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });
  }
}
