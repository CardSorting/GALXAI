import { NextResponse } from 'next/server';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The former route returned a decorative usage/pricing dataset without an
 * account authority check. Keep the address bounded until a real owner-scoped
 * usage contract is available; never publish invented balances, savings or
 * model-level rates.
 */
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

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Usage details are separate from Developer Access and are not available through this retired wallet route.',
    requestUrl: USAGE_PRICING.path,
  }, {
    status: 410,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
