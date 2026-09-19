import { NextRequest, NextResponse } from 'next/server';
import { checkPaymentOrigin } from '@/lib/billing/payment';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    checkPaymentOrigin(req);
    return NextResponse.json({
      success: false,
      error: 'This purchase route is retired. Start the $50/month GALX Nova Developer Access subscription at /developers; usage terms are separate.',
      usage_pricing_url: USAGE_PRICING.path,
    }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Checkout is unavailable. Please try again.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
