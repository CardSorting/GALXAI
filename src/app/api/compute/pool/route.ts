import { NextResponse } from 'next/server';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Retired compatibility route. The former response exposed a free grant and
 * priority-pool state, neither of which is part of Developer Access. Keep the
 * address inert until an approved usage contract exists.
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key, x-galx-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function GET() {
  return NextResponse.json({
    error: 'Usage allowances are not part of Developer Access. Usage is billed at $0.02 per completed message with a default $25 monthly usage cap.',
    usage_pricing_url: USAGE_PRICING.path,
  }, {
    status: 410,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
