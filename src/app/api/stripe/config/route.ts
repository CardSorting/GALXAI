import { NextResponse } from 'next/server';
import { getStripeConfig, STRIPE_CHECKOUT_PACKS } from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getStripeConfig();

  return NextResponse.json({
    success: true,
    publishableKey: config.publishableKey,
    isConfigured: config.isConfigured,
    currency: config.currency,
    packs: Object.values(STRIPE_CHECKOUT_PACKS)
  });
}
