import { NextResponse } from 'next/server';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';

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
    error: 'Developer usage is billed at $0.02 per completed message with a default $25 monthly usage cap.',
    usage_pricing_url: USAGE_PRICING.path,
  }, {
    status: 410,
    headers: {
      'Cache-Control': 'public, max-age=0, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
