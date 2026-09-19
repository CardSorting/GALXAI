import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) {
  void req;
  return NextResponse.json({
    error: 'Usage pricing is separate from GALX Nova Developer Access and is not available through this retired credit-quote route.',
    usage_pricing_url: USAGE_PRICING.path,
  }, { status: 410, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
