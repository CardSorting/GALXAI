import { NextRequest, NextResponse } from 'next/server';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { AccountIdentityError, requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { BillingError } from '@/lib/billing/account';
import { checkPaymentOrigin, hostedPaymentUrl, paymentOrigin } from '@/lib/billing/payment';
import { billingPortalConfiguration } from '@/lib/billing/portal';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  try {
    checkPaymentOrigin(req);
    const actor = await requireAccountIdentity(req);
    const config = getStripeConfig();
    if (!config.isConfigured) throw new BillingError('Payments are unavailable. Please try again later.', 503);
    const pool = getPostgresPool();
    if (!pool) throw new Error('Storage unavailable');
    const { rows } = await pool.query('SELECT stripe_customer_id FROM galx_stripe_customers WHERE user_id = $1', [actor.id]);
    const customer = rows[0]?.stripe_customer_id;
    if (!customer || customer.startsWith('cus_mock_')) throw new BillingError('Your billing profile becomes available when you start a checkout.', 404);
    const stripe = StripeEngine.getInstance().getClient();
    if (!stripe) throw new Error('Payments unavailable');
    const configuration = await billingPortalConfiguration(stripe);
    const session = await stripe.billingPortal.sessions.create({ customer, configuration, return_url: `${paymentOrigin(config.appUrl)}/billing/payment-methods` }, { timeout: 8000, maxNetworkRetries: 0 });
    return NextResponse.json({ success: true, url: hostedPaymentUrl(session.url, 'billing.stripe.com') }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const known = error instanceof BillingError || error instanceof AccountIdentityError;
    return NextResponse.json({ error: known ? error.message : 'Payment settings are unavailable. Please try again.' }, { status: known ? error.status : 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
