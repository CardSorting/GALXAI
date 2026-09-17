import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type Stripe from 'stripe';
import { fulfillPlanStripeEvent } from './plan-subscription';
import { PreviewReadSync } from '../supabase/repositories/PreviewReadSync';

type Session = { session_id: string; user_id: string; customer_id: string | null; amount_usd: string; total_credited_usd: string; payment_intent_id: string | null; metadata: Record<string, any> };
const id = (value: unknown): string | undefined => typeof value === 'string' ? value : value && typeof value === 'object' && 'id' in value ? String(value.id) : undefined;
const cents = (value: string | number) => Math.round(Number(value) * 100);

async function ledger(db: PoolClient, session: Session, amount: number, deposit: number, type: 'deposit' | 'refund' | 'adjustment', reference: string) {
  await db.query(`INSERT INTO galx_wallets (user_id,balance_usd,introductory_grant_usd) VALUES ($1,0,0) ON CONFLICT (user_id) DO NOTHING`, [session.user_id]);
  const wallet = (await db.query(`UPDATE galx_wallets SET balance_usd=GREATEST(0,balance_usd-payment_debt_usd+$2),
    payment_debt_usd=GREATEST(0,-(balance_usd-payment_debt_usd+$2)),
    deposited_total_usd=GREATEST(0,deposited_total_usd+$3),promotional_match_usd=GREATEST(0,promotional_match_usd+$2-$3),
    proof_of_deposit_verified=true,verified_at=COALESCE(verified_at,now()),updated_at=now()
    WHERE user_id=$1 RETURNING id,balance_usd,payment_debt_usd`, [session.user_id, amount, deposit])).rows[0];
  const tierLabel: string = (session.metadata as any)?.tierLabel || 'Compute Credit';
  const tierRpm: number | undefined = (session.metadata as any)?.tierRpm;
  const depositDesc =
    type === 'deposit'
      ? `${tierLabel}${tierRpm ? ` | ${tierRpm >= 10000 ? 'Unlimited' : tierRpm + ' RPM'}` : ''} — prepaid API credit`
      : type === 'refund'
      ? amount > 0 ? 'Refund failed; credit restored' : 'Payment refund'
      : 'Payment dispute adjustment';
  await db.query(`INSERT INTO galx_wallet_transactions (wallet_id,user_id,transaction_type,amount_usd,balance_after_usd,description,metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`, [wallet.id, session.user_id, type, amount, wallet.balance_usd, depositDesc,
    JSON.stringify({ payment_ref: session.payment_intent_id, checkout_session: session.session_id, event_id: reference, payment_debt_usd: wallet.payment_debt_usd, tierKey: (session.metadata as any)?.tierKey, tierRpm, fulfillmentVersion: 2 })]);
}

async function sessionForPayment(db: PoolClient, payment: string): Promise<Session | undefined> {
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`payment:${payment}`]);
  const result = await db.query(`SELECT * FROM galx_stripe_checkout_sessions WHERE payment_intent_id=$1 FOR UPDATE`, [payment]);
  if (result.rows.length > 1) throw new Error('Ambiguous payment records require reconciliation');
  return result.rows[0];
}

/** All financial effects and the event receipt commit together. Throwing requests
 * a Stripe retry; a database outage must never fall back to process-local money. */
export async function fulfillStripeEvent(pool: Pool, event: Stripe.Event, rawBody: string, context: { planAdjustment?: boolean } = {}) {
  const db = await pool.connect();
  let changedUser: string | undefined;
  let handled = false;
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='5s'");
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`event:${event.id}`]);
    const receipt = (await db.query('SELECT status FROM galx_stripe_events WHERE event_id=$1', [event.id])).rows[0];
    const receiptId = receipt?.status === 'failed' ? `${event.id}:recovered:v2` : event.id;
    if ((receipt && receipt.status !== 'failed') || (receipt && (await db.query('SELECT 1 FROM galx_stripe_events WHERE event_id=$1', [receiptId])).rowCount)) {
      await db.query('COMMIT'); return { duplicate: true };
    }
    const object = event.data.object as any;
    handled = context.planAdjustment === true || await fulfillPlanStripeEvent(db,event);
    if (!handled && event.type.startsWith('checkout.session.')) {
      const payment = id(object.payment_intent);
      if (payment) await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`payment:${payment}`]);
      const session: Session | undefined = (await db.query('SELECT * FROM galx_stripe_checkout_sessions WHERE session_id=$1 FOR UPDATE', [object.id])).rows[0];
      if (!session) {
        // The provider can deliver before the initiating HTTP response commits.
        if (object.metadata?.userId || object.client_reference_id) throw new Error('Checkout record not yet available');
      } else {
        handled = true;
        if (object.client_reference_id !== session.user_id || id(object.customer) !== session.customer_id || object.currency !== 'usd' || object.amount_total !== cents(session.amount_usd)) throw new Error('Checkout does not match stored payment terms');
        if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && object.mode === 'payment' && object.payment_status === 'paid') {
          if (!payment) throw new Error('Paid checkout has no payment intent');
          if (session.payment_intent_id && session.payment_intent_id !== payment) throw new Error('Checkout payment changed');
          session.payment_intent_id = payment;
          const previous = await db.query(`SELECT user_id,amount_usd,metadata FROM galx_wallet_transactions WHERE transaction_type IN ('deposit','auto_reload') AND (metadata->>'payment_ref'=$1 OR metadata->>'paymentRef'=$1)`, [payment]);
          if (previous.rows.some(row => row.user_id !== session.user_id)) throw new Error('Payment belongs to another account');
          if (previous.rows.some(row => row.metadata.checkout_session && row.metadata.checkout_session !== session.session_id)) throw new Error('Payment already fulfilled another checkout');
          if (!session.metadata.fulfilledAt && !previous.rowCount) {
            await ledger(db, session, Number(session.total_credited_usd), Number(session.amount_usd), 'deposit', event.id);
            const userEmail = session.metadata?.email || object.customer_details?.email || 'developer@galx.ai';
            await db.query(`INSERT INTO private.developer_access_requests
              (user_id, email, use_case, expected_traffic, status, reviewed_at, reviewed_by, expires_at)
              VALUES ($1, $2, $3, 'over_1000_daily', 'approved', now(), 'stripe-fulfillment', NULL)
              ON CONFLICT (user_id) DO UPDATE SET
                status = 'approved',
                reviewed_at = now(),
                reviewed_by = 'stripe-fulfillment',
                expires_at = NULL,
                revision = COALESCE(private.developer_access_requests.revision, 1) + 1`,
              [session.user_id, userEmail,
               `Compute tier purchased via checkout: ${(session.metadata as any)?.tierKey ?? 'developer_10'} — ${(session.metadata as any)?.tierLabel ?? 'Developer Tier'}`]);
            try { PreviewReadSync.for(db).invalidate(session.user_id); } catch {}
            changedUser = session.user_id;
          }
          await db.query(`UPDATE galx_stripe_checkout_sessions SET status='complete',payment_status='paid',payment_intent_id=$2,
            metadata=metadata || $3::jsonb,updated_at=now() WHERE session_id=$1`, [session.session_id, payment, JSON.stringify({ fulfilledAt: session.metadata.fulfilledAt || new Date().toISOString(),
              settledCreditUsd: previous.rowCount ? previous.rows.reduce((sum, row) => sum + Number(row.amount_usd), 0) : Number(session.total_credited_usd), paymentFailure: false })]);
        } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
          await db.query(`UPDATE galx_stripe_checkout_sessions SET status=$2,metadata=metadata || $3::jsonb,updated_at=now()
            WHERE session_id=$1 AND payment_status<>'paid'`, [session.session_id, event.type.endsWith('expired') ? 'expired' : 'canceled', JSON.stringify({ paymentFailure: event.type.endsWith('failed') })]);
        }
      }
    } else if (['invoice.paid','invoice.payment_succeeded','invoice.payment_failed','invoice.marked_uncollectible','invoice.voided','invoice.finalized'].includes(event.type)) {
      const customer = id(object.customer);
      const owner = (await db.query('SELECT user_id FROM galx_stripe_customers WHERE stripe_customer_id=$1', [customer])).rows[0];
      if (!owner && object.metadata?.userId) throw new Error('Invoice customer not yet available');
      if (owner && object.currency === 'usd') {
        handled = true;
        await db.query(`INSERT INTO galx_stripe_invoices (id,user_id,stripe_invoice_id,amount_due_usd,amount_paid_usd,status,hosted_invoice_url,invoice_pdf_url,period_start,period_end,metadata)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,to_timestamp($9),to_timestamp($10),$11)
          ON CONFLICT (stripe_invoice_id) DO UPDATE SET amount_due_usd=EXCLUDED.amount_due_usd,amount_paid_usd=EXCLUDED.amount_paid_usd,
          status=EXCLUDED.status,hosted_invoice_url=EXCLUDED.hosted_invoice_url,invoice_pdf_url=EXCLUDED.invoice_pdf_url,metadata=EXCLUDED.metadata
          WHERE galx_stripe_invoices.user_id=EXCLUDED.user_id AND
            COALESCE((galx_stripe_invoices.metadata->>'eventCreated')::bigint,0) <= $12
            AND (galx_stripe_invoices.status NOT IN ('paid','void') OR EXCLUDED.status=galx_stripe_invoices.status)`,
          [randomUUID(), owner.user_id, object.id, (object.amount_due || 0)/100, (object.amount_paid || 0)/100, object.status || 'open', object.hosted_invoice_url, object.invoice_pdf,
            object.period_start || null, object.period_end || null, JSON.stringify({ eventCreated: event.created }), event.created]);
      }
    } else if (!handled && (event.type === 'charge.refunded' || ['charge.dispute.funds_withdrawn','charge.dispute.funds_reinstated'].includes(event.type))) {
      const payment = id(object.payment_intent);
      if (!payment) throw new Error('Adjustment missing payment intent');
      const session = await sessionForPayment(db, payment);
      if (!session) {
        const customer = id(object.customer);
        const owned = customer && (await db.query('SELECT 1 FROM galx_stripe_customers WHERE stripe_customer_id=$1', [customer])).rowCount;
        if (object.metadata?.userId || owned) throw new Error('Payment has not been fulfilled yet');
      } else {
        handled = true;
        if (object.currency !== 'usd') throw new Error('Adjustment currency mismatch');
        if (id(object.customer) && id(object.customer) !== session.customer_id) throw new Error('Adjustment customer mismatch');
        const terms = { ...session.metadata };
        const paid = cents(session.amount_usd);
        if (!terms.fulfilledAt) {
          // Existing paid sessions can predate atomic fulfillment. Reconstruct
          // their actual credited and refunded totals from the immutable ledger.
          const prior = await db.query(`SELECT transaction_type,amount_usd,metadata FROM galx_wallet_transactions
            WHERE user_id=$1 AND (metadata->>'payment_ref'=$2 OR metadata->>'paymentRef'=$2)`, [session.user_id, payment]);
          const deposits = prior.rows.filter(row => ['deposit','auto_reload'].includes(row.transaction_type));
          if (!deposits.length) throw new Error('Payment has not been fulfilled yet');
          terms.settledCreditUsd = deposits.reduce((sum, row) => sum + Number(row.amount_usd), 0);
          const refunds = prior.rows.filter(row => row.transaction_type === 'refund');
          terms.refundedCents = Math.min(paid, refunds.reduce((sum, row) => sum + cents(row.metadata.refund_amount_usd ?? row.metadata.refundAmount ?? 0), 0));
          terms.reversedCents = terms.refundedCents;
          terms.fulfilledAt = new Date().toISOString();
        }
        if (event.type === 'charge.refunded') {
          if (!Number.isSafeInteger(object.amount_refunded) || object.amount_refunded < 0 || object.amount_refunded > paid) throw new Error('Invalid refund amount');
          if (Array.isArray(object.refundsSnapshot)) {
            const refunds = { ...terms.refunds };
            for (const refund of object.refundsSnapshot) {
              if (!refund.id || !Number.isSafeInteger(refund.amount) || refund.amount < 0 || refund.amount > paid) throw new Error('Invalid refund record');
              const prior = refunds[refund.id];
              // A bank can return a refund after it appeared successful. Failed
              // or canceled refunds are terminal, even if older snapshots arrive later.
              if (prior && ['failed','canceled'].includes(prior.status)) continue;
              if (prior?.status === 'succeeded' && ['pending','requires_action'].includes(refund.status)) continue;
              refunds[refund.id] = { amount: refund.amount, status: refund.status };
            }
            terms.refunds = refunds;
            terms.refundedCents = Object.values(refunds).reduce<number>((sum, refund: any) => sum + (refund.status === 'succeeded' ? refund.amount : 0), 0);
            if (terms.refundedCents > paid) throw new Error('Refunds exceed payment');
          } else terms.refundedCents = Math.max(terms.refundedCents || 0, object.amount_refunded);
        } else {
          if (!Number.isSafeInteger(object.amount) || object.amount < 0 || object.amount > paid) throw new Error('Invalid dispute amount');
          const disputes = { ...terms.disputes };
          const previous = disputes[object.id];
          // Reinstatement wins even when events arrive in reverse order.
          disputes[object.id] = { amount: object.amount, restored: previous?.restored || event.type.endsWith('funds_reinstated') };
          terms.disputes = disputes;
        }
        const held = Object.values(terms.disputes || {}).reduce<number>((sum, dispute: any) => sum + (dispute.restored ? 0 : dispute.amount), 0);
        // A partial refund plus a dispute of the remaining charge can exhaust
        // the payment. Cap the total; reinstatement must not restore refunds.
        const reversed = Math.min(paid, (terms.refundedCents || 0) + held);
        const priorReversed = terms.reversedCents || 0;
        const totalMicro = Math.round(Number(terms.settledCreditUsd ?? session.total_credited_usd) * 1_000_000);
        const creditDelta = (Math.round(totalMicro * reversed / paid) - Math.round(totalMicro * priorReversed / paid)) / 1_000_000;
        if (creditDelta !== 0) {
          await ledger(db, session, -creditDelta, -(reversed - priorReversed)/100, event.type === 'charge.refunded' ? 'refund' : 'adjustment', event.id);
          changedUser = session.user_id;
        }
        terms.reversedCents = reversed;
        await db.query('UPDATE galx_stripe_checkout_sessions SET metadata=$2,updated_at=now() WHERE session_id=$1', [session.session_id, JSON.stringify(terms)]);
      }
    }
    await db.query(`INSERT INTO galx_stripe_events (event_id,event_type,status,payload_hash) VALUES ($1,$2,$3,$4)`, [receiptId, event.type, handled ? 'processed' : 'ignored', createHash('sha256').update(rawBody).digest('hex')]);
    await db.query('COMMIT');
    return { duplicate: false, changedUser };
  } catch (error) { await db.query('ROLLBACK').catch(() => {}); throw error; }
  finally { db.release(); }
}
