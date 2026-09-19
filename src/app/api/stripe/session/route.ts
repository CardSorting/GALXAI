import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { AccountIdentityError, requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { BillingError } from '@/lib/billing/account';
import { getPostgresPool } from '@/lib/db/postgres';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { fulfillStripeEvent } from '@/lib/billing/fulfillment';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(req: NextRequest) {
  try {
    const actor = await requireAccountIdentity(req);
    const id = req.nextUrl.searchParams.get('session_id');
    if (!id || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(id) || id.length > 255) throw new BillingError('Invalid checkout session.');
    const pool = getPostgresPool();
    if (!pool) throw new Error('Storage unavailable');
    const read = async () => (await pool.query(`SELECT session_id,status,payment_status,amount_usd,total_credited_usd,metadata FROM galx_stripe_checkout_sessions WHERE session_id=$1 AND user_id=$2`, [id, actor.id])).rows[0];
    let session = await read();
    if (!session) throw new BillingError('Checkout session not found.', 404);
    const stripe = StripeEngine.getInstance().getClient();
    if (!session.metadata.fulfilledAt && stripe) {
      // Recover a missing/delayed webhook from Stripe itself, never from return
      // parameters. Bound provider reads across browsers and server instances.
      const claim = await pool.query(`UPDATE galx_stripe_checkout_sessions SET metadata=metadata || jsonb_build_object('lastReconciledAt',now())
        WHERE session_id=$1 AND user_id=$2 AND (metadata->>'lastReconciledAt' IS NULL OR (metadata->>'lastReconciledAt')::timestamptz < now()-interval '30 seconds') RETURNING session_id`, [id, actor.id]);
      if (claim.rowCount) {
        const remote = await stripe.checkout.sessions.retrieve(id);
        if (remote.livemode !== getStripeConfig().secretKey.includes('_live_')) throw new Error('Payment mode mismatch');
        if (remote.payment_status === 'paid' || remote.status === 'expired') {
          const event = { id: `reconcile_${id}_${remote.payment_status === 'paid' ? 'paid' : 'expired'}`, type: remote.payment_status === 'paid' ? 'checkout.session.completed' : 'checkout.session.expired',
            object: 'event', api_version: '2026-07-29.dahlia', pending_webhooks: 0, request: null,
            created: Math.floor(Date.now()/1000), livemode: remote.livemode, data: { object: remote } } as Stripe.Event;
          // The durable checkout row already records the Price that passed
          // the server-side Developer contract check. Reconciliation must not
          // depend on that Price remaining active in Stripe.
          const result = await fulfillStripeEvent(pool, event, JSON.stringify(event));
          if (result.changedUser) {
            const { WalletRepository } = await import('@/lib/supabase/repositories/WalletRepository');
            WalletRepository.getInstance().invalidateAccount(result.changedUser);
          }
          session = await read();
        }
      }
    }
    return NextResponse.json({ success: true, session: { sessionId: id, status: session.status, paymentStatus: session.payment_status,
      verified: session.payment_status === 'paid' && Boolean(session.metadata.fulfilledAt),
      creditUsd: Number(session.metadata.settledCreditUsd ?? session.total_credited_usd), amountTotalUsd: Number(session.amount_usd) } }, { headers });
  } catch (error) {
    const known = error instanceof BillingError || error instanceof AccountIdentityError;
    return NextResponse.json({ error: known ? error.message : 'Could not check payment status. Please try again.' }, { status: known ? error.status : 503, headers });
  }
}
