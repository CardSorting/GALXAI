import { NextRequest } from 'next/server';
import { readBilling } from '@/lib/billing/account';
import { billingReadRoute } from '@/lib/billing/readRoute';
import { getStripeConfig } from '@/lib/stripe/config';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) {
  const config = getStripeConfig();
  return billingReadRoute(req, async (db, userId) => ({ ...await readBilling(db, userId, req.nextUrl.searchParams), paymentsAvailable: config.isConfigured && config.webhookSecrets.length > 0 }));
}
