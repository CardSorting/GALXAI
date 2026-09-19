import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { StripeEngine } from '@/lib/stripe/stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { getPostgresPool } from '@/lib/db/postgres';
import { fulfillStripeEvent } from '@/lib/billing/fulfillment';
import { developerPrice, isProPaymentAdjustment } from '@/lib/billing/plan-subscription';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const config = getStripeConfig();
  if (!config.isConfigured || !config.webhookSecrets.length) return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 });
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  try {
    const reader = req.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'Missing body' }, { status: 400 });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 1_048_576) { await reader.cancel(); return NextResponse.json({ error: 'Body too large' }, { status: 413 }); }
      chunks.push(value);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const engine = StripeEngine.getInstance();
    const verification = engine.verifyWebhookSignature(rawBody, signature);
    if (!verification.isValid || !verification.event || verification.event.livemode !== config.secretKey.includes('_live_')) return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    const event = verification.event;
    const stripe = engine.getClient()!;
    const pool = getPostgresPool();
    if (!pool) throw new Error('Storage unavailable');
    const eventObject = event.data.object as any;
    // New subscription activation still verifies the currently approved Price.
    // Known checkout/subscription records carry their durable Price identity so
    // cancellation and replay remain reconcilable if a successor Price is
    // later activated or the old one is archived.
    const knownSubscription = event.type.startsWith('customer.subscription.') && typeof eventObject?.id === 'string'
      ? (await pool.query('SELECT 1 FROM private.galx_plan_subscriptions WHERE subscription_id=$1 LIMIT 1', [eventObject.id])).rowCount === 1
      : false;
    const needsDeveloperPrice = event.type === 'customer.subscription.created' &&
      eventObject?.metadata?.galxPlan === 'nova-developer-v1' && !knownSubscription;
    const developerPriceId = needsDeveloperPrice ? (await developerPrice(stripe)).id : undefined;
    if (['charge.dispute.funds_withdrawn','charge.dispute.funds_reinstated'].includes(event.type)) {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
      const charge = await stripe.charges.retrieve(chargeId);
      event.data.object = Object.assign({}, dispute, { payment_intent: charge.payment_intent, customer: charge.customer });
    }
    // Read current successful refunds, including paginated partial refunds.
    // A pending or failed refund must not remove a customer's credit.
    if (['charge.refunded','refund.updated','refund.created','refund.failed'].includes(event.type)) {
      const object = event.data.object as Stripe.Charge | Stripe.Refund;
      const chargeId = object.object === 'charge' ? object.id : typeof object.charge === 'string' ? object.charge : object.charge?.id;
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        let refunded = 0;
        const refundsSnapshot = [];
        for await (const refund of stripe.refunds.list({ charge: chargeId, limit: 100 })) {
          refundsSnapshot.push({ id: refund.id, amount: refund.amount, status: refund.status });
          if (refund.status === 'succeeded') refunded += refund.amount;
        }
        event.type = 'charge.refunded';
        event.data.object = Object.assign({}, charge, { amount_refunded: refunded, refundsSnapshot });
      }
    }
    const result = await fulfillStripeEvent(pool, event, rawBody, { planAdjustment: await isProPaymentAdjustment(pool,stripe,event), developerPriceId });
    if (result.changedUser) {
      const { WalletRepository } = await import('@/lib/supabase/repositories/WalletRepository');
      WalletRepository.getInstance().invalidateAccount(result.changedUser);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[billing] Webhook failed; delivery will retry', { code: (error as { code?: string }).code || 'fulfillment_failed' });
    return NextResponse.json({ error: 'Unable to record payment. Retry delivery.' }, { status: 503 });
  }
}
