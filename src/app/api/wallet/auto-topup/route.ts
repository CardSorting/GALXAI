import { NextResponse } from 'next/server';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function unavailable() {
  return NextResponse.json({ error: 'Automatic top-ups are not part of the current pricing strategy. Review the separate usage-pricing boundary before starting Developer Access.', usage_pricing_url: USAGE_PRICING.path }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
export const GET = unavailable;
export const POST = unavailable;
