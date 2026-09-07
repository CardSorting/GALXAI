import { NextRequest, NextResponse } from 'next/server';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { AccountIdentityError, requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { BillingError } from '@/lib/billing/account';
import { checkPaymentOrigin, depositAmount, hostedPaymentUrl } from '@/lib/billing/payment';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    checkPaymentOrigin(req);
    const actor = await requireAccountIdentity(req);
    const body = await req.json().catch(() => ({}));
    const amount = depositAmount(body.amount ?? body.depositAmount);
    const config = getStripeConfig();
    if (!config.isConfigured || !config.webhookSecrets.length) throw new BillingError('Payments are unavailable. Please try again later.', 503);
    const pool = getPostgresPool();
    if (!pool) throw new Error('Storage unavailable');
    // Do not start checkout when the authoritative billing storage is unavailable.
    await pool.query('SELECT id FROM galx_wallets WHERE user_id = $1', [actor.id]);
    const origin = new URL(config.appUrl).origin;
    const result = await StripeEngine.getInstance().createCheckoutSession({ userId: actor.id, customerEmail: actor.email, depositAmount: amount, autoReload: false,
      successUrl: `${origin}/billing?checkout=returned`, cancelUrl: `${origin}/billing?checkout=canceled` });
    if (!result.success || result.isSimulated) throw new BillingError('Could not start checkout. Please try again.', 503);
    return NextResponse.json({ success: true, url: hostedPaymentUrl(result.url, 'checkout.stripe.com') }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const known = error instanceof BillingError || error instanceof AccountIdentityError;
    return NextResponse.json({ success: false, error: known ? error.message : 'Checkout is unavailable. Please try again.' }, { status: known ? error.status : 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
