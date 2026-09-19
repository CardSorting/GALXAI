import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The former endpoint published token-price and wallet-runway estimates. The
 * current Developer offer has no published usage rate or credit entitlement,
 * so this route must not infer or expose commercial terms.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Usage estimates are not available through this retired wallet route.',
  }, {
    status: 410,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
