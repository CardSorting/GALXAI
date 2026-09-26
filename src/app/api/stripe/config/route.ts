import { NextResponse } from 'next/server';
import { getStripeConfig } from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getStripeConfig();

  return NextResponse.json({
    success: true,
    publishableKey: config.publishableKey,
    isConfigured: config.isConfigured,
    currency: config.currency,
    offers: [
      { id: 'orbit', name: 'Orbit', monthlyPriceUsd: 10, currency: 'USD', interval: 'month', perStar: true, checkoutAvailable: false },
      { id: 'foundry', name: 'Foundry', monthlyPriceUsd: 200, currency: 'USD', interval: 'month', perStar: false, checkoutAvailable: false },
    ],
  }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
