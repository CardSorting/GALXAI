import { NextRequest, NextResponse } from 'next/server';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { AccountIdentityError, requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { BillingError } from '@/lib/billing/account';
import { checkPaymentOrigin, depositAmount, paymentOrigin, readPaymentBody } from '@/lib/billing/payment';
import { createAccountCheckout } from '@/lib/billing/checkout';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    checkPaymentOrigin(req);
    const actor = await requireAccountIdentity(req);
    const body = await readPaymentBody(req);
    const amount = depositAmount(body.amount ?? body.depositAmount);
    const config = getStripeConfig();
    if (!config.isConfigured || !config.webhookSecrets.length) throw new BillingError('Payments are unavailable. Please try again later.', 503);
    const pool = getPostgresPool();
    if (!pool) throw new Error('Storage unavailable');
    const stripe = StripeEngine.getInstance().getClient();
    if (!stripe) throw new Error('Payments unavailable');
    const result = await createAccountCheckout(pool, stripe, { userId: actor.id, email: actor.email, amount,
      requestId: typeof body.requestId === 'string' ? body.requestId : '', surface: body.surface, origin: paymentOrigin(config.appUrl) });
    return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const known = error instanceof BillingError || error instanceof AccountIdentityError;
    return NextResponse.json({ success: false, error: known ? error.message : 'Checkout is unavailable. Please try again.' }, { status: known ? error.status : 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
