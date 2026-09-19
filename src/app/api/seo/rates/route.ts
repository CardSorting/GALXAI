import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Retired public rate-card compatibility route.
 *
 * The access subscription is not a usage-rate contract. Keep this address
 * inert so crawlers and old clients cannot receive internal model costs,
 * discounts, cache rebates, or inferred consumption prices.
 */
export function GET() {
  return NextResponse.json({
    error: 'Public usage-rate discovery is not available.',
  }, {
    status: 410,
    headers: {
      'Cache-Control': 'public, max-age=0, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
