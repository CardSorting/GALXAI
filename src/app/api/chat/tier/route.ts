import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { publicUsagePricing } from '@/lib/billing/usage-pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET /api/chat/tier
 *
 * This compatibility endpoint is intentionally a small public DTO. It does
 * not serialize seat names, spend caps, credits, rolling windows, routing
 * pools, or other internal governance state.
 */
async function previewGET(_req: NextRequest) {
  return NextResponse.json({
    authenticated: true,
    access: 'developer',
    usagePricing: publicUsagePricing(),
  }, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const GET = withDeveloperAccess(previewGET);
