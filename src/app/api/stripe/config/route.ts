import { NextResponse } from 'next/server';
import { getStripeConfig } from '@/lib/stripe/config';
import { DEVELOPER_ACCESS, PRO_PLAN } from '@/lib/billing/pro-plan';
import { publicUsagePricing } from '@/lib/billing/usage-pricing';

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
    developerAccess: {
      id: DEVELOPER_ACCESS.id,
      name: DEVELOPER_ACCESS.name,
      monthlyPriceUsd: DEVELOPER_ACCESS.monthlyPriceUsd,
      currency: DEVELOPER_ACCESS.currency,
      interval: DEVELOPER_ACCESS.interval,
      checkoutEnabled: DEVELOPER_ACCESS.checkoutEnabled,
      automaticActivation: DEVELOPER_ACCESS.automaticActivation,
      usageBilledSeparately: DEVELOPER_ACCESS.usageBilledSeparately,
      includedUsageCreditsUsd: DEVELOPER_ACCESS.includedUsageCreditsUsd,
    },
    usagePricing: publicUsagePricing(),
  }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
