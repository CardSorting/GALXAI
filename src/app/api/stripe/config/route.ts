import { NextResponse } from 'next/server';
import { getStripeConfig } from '@/lib/stripe/config';
import { PRO_PLAN } from '@/lib/billing/pro-plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getStripeConfig();

  return NextResponse.json({
    success: true,
    publishableKey: config.publishableKey,
    isConfigured: config.isConfigured,
    currency: config.currency,
    consumerPlan: {
      id: PRO_PLAN.id,
      name: PRO_PLAN.name,
      monthlyPriceUsd: PRO_PLAN.monthlyPriceUsd,
      currency: PRO_PLAN.currency,
      interval: PRO_PLAN.interval,
    },
  }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
