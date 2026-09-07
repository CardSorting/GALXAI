import { getStripeConfig } from '@/lib/stripe/config';
import { NextRequest } from 'next/server';
import { readBillingSummary } from '@/lib/billing/account';
import { billingReadRoute } from '@/lib/billing/readRoute';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) {
  const config = getStripeConfig();
  return billingReadRoute(req, async (db, userId) => ({ success: true, paymentsAvailable: config.isConfigured && config.webhookSecrets.length > 0, summary: await readBillingSummary(db, userId) }));
}
