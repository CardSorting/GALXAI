import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type Stripe from 'stripe';
import { BillingError } from './account';
import { hostedPaymentUrl } from './payment';
import { PRO_PLAN } from './pro-plan';
import { BILLING_PATHS } from './navigation';
import type { FairPolicy } from '../sites/fair-store';

export const PRO_LOOKUP_KEY = 'galx_pro_monthly_v1';
const objectId = (value: any): string | undefined => typeof value === 'string' ? value : value?.id;
const requestOptions = { timeout: 8000, maxNetworkRetries: 0 };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Checkout = { user_id: string; request_id: string; price_id: string; customer_id: string | null; session_id: string | null; checkout_url: string | null; return_path: string | null; state: string; created_at: Date; expires_at: Date };

export async function proPrice(stripe: Stripe, policy: FairPolicy) {
  if (policy.mode !== 'enforce') throw new BillingError('Plan checkout is temporarily unavailable.', 503);
  const prices = await stripe.prices.list({ lookup_keys: [PRO_LOOKUP_KEY], active: true, limit: 2 }, requestOptions);
  const price = prices.data[0];
  if (prices.has_more || prices.data.length !== 1 || !price || !policy.paid_price_ids.includes(price.id) || price.currency !== 'usd' ||
      price.unit_amount !== PRO_PLAN.monthlyPriceUsd * 100 || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 ||
      price.recurring.usage_type !== 'licensed') throw new BillingError('Plan checkout is temporarily unavailable.', 503);
  return price;
}

/** Durable checkout lease works with transaction-pooled PostgreSQL. Stripe calls
 * happen outside transactions; provider idempotency handles uncertain responses. */
export async function createProCheckout(pool: Pool, stripe: Stripe, policy: FairPolicy, input: { userId: string; requestId: string; origin: string }) {
  if (!uuid.test(input.requestId)) throw new BillingError('Refresh billing and try again.');
  const price = await proPrice(stripe, policy);
  const db = await pool.connect(), lease = randomUUID();
  let row: Checkout | undefined;
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='5s'");
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`pro-checkout:${input.userId}`]);
    row = (await db.query(`SELECT * FROM private.galx_plan_checkouts WHERE user_id=$1 AND
      (request_id=$2 OR state IN ('pending','open')) ORDER BY (request_id=$2) DESC LIMIT 1 FOR UPDATE`, [input.userId,input.requestId])).rows[0];
    if (row && !['pending','open'].includes(row.state)) throw new BillingError('This checkout has finished. Refresh your plan status.', 409);
    if (!row) {
      const recent = (await db.query("SELECT count(*) FROM private.galx_plan_checkouts WHERE user_id=$1 AND created_at>now()-interval '10 minutes'", [input.userId])).rows[0];
      if (Number(recent.count) >= 5) throw new BillingError('Too many checkout attempts. Try again in a few minutes.', 429);
      row = (await db.query('INSERT INTO private.galx_plan_checkouts(user_id,request_id,price_id,return_path) VALUES($1,$2,$3,$4) RETURNING *', [input.userId,input.requestId,price.id,BILLING_PATHS.plan])).rows[0] as Checkout;
    }
    const claimed = await db.query(`UPDATE private.galx_plan_checkouts SET lease_token=$3,lease_until=now()+interval '60 seconds'
      WHERE user_id=$1 AND request_id=$2 AND (lease_until IS NULL OR lease_until<=now()) RETURNING request_id`, [input.userId,row.request_id,lease]);
    if (!claimed.rowCount) throw new BillingError('Another payment request is in progress. Try again shortly.', 429);
    await db.query('COMMIT');
    let customer = (await db.query('SELECT stripe_customer_id FROM galx_stripe_customers WHERE user_id=$1', [input.userId])).rows[0]?.stripe_customer_id;
    if (customer && !customer.startsWith('cus_mock_')) {
      const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 }, requestOptions);
      if (subscriptions.data.some(s => !['canceled','incomplete_expired'].includes(s.status) && s.items.data.some(i => policy.paid_price_ids.includes(i.price.id))))
        throw new BillingError('A plan already exists for this account. Use Manage subscription to review it.', 409);
      if (subscriptions.has_more) throw new BillingError('Your payment profile needs review. Contact support.', 503);
    }
    if (row.session_id) {
      const session = await stripe.checkout.sessions.retrieve(row.session_id, {}, requestOptions);
      if (session.status === 'open') return { url: hostedPaymentUrl(session.url,'checkout.stripe.com') };
      await db.query('UPDATE private.galx_plan_checkouts SET state=$3 WHERE user_id=$1 AND request_id=$2', [input.userId,row.request_id,session.status === 'complete' ? 'complete' : 'expired']);
      throw new BillingError(session.status === 'complete' ? 'Payment is being confirmed. Refresh your plan status.' : 'This checkout expired. Start a new checkout.', 409);
    }
    if (row.price_id !== price.id || Date.now() > row.created_at.getTime()+90*60_000)
      throw new BillingError('This payment attempt needs review. Contact support before starting another.', 503);
    const key = createHash('sha256').update(`${input.userId}:${row.request_id}`).digest('hex');
    if (!customer || customer.startsWith('cus_mock_')) {
      const created = await stripe.customers.create({ metadata: { userId: input.userId } }, { ...requestOptions, idempotencyKey: `pro-customer:${key}` });
      // Resolve the canonical customer under the existing top-up lock. A competing
      // creator may leave an unused provider customer, never a second payable owner.
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='5s'");
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`checkout:${input.userId}`]);
      customer = (await db.query('SELECT stripe_customer_id FROM galx_stripe_customers WHERE user_id=$1', [input.userId])).rows[0]?.stripe_customer_id;
      if (!customer || customer.startsWith('cus_mock_')) {
        customer = created.id;
        await db.query(`INSERT INTO galx_stripe_customers(id,user_id,stripe_customer_id) VALUES($1,$2,$3)
          ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=EXCLUDED.stripe_customer_id,updated_at=now()`, [randomUUID(),input.userId,customer]);
      }
      await db.query('COMMIT');
    }
    if (row.customer_id && row.customer_id !== customer) throw new BillingError('Your payment profile needs review. Contact support.', 503);
    await db.query('UPDATE private.galx_plan_checkouts SET customer_id=$3 WHERE user_id=$1 AND request_id=$2', [input.userId,row.request_id,customer]);
    if (row.return_path !== null && row.return_path !== BILLING_PATHS.plan) throw new BillingError('This payment attempt needs review. Contact billing support.', 503);
    const returnPath = row.return_path || BILLING_PATHS.overview;
    const returnHash = row.return_path ? '' : '#plan';
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', customer, client_reference_id: input.userId,
      line_items: [{ price: row.price_id, quantity: 1 }], allow_promotion_codes: false,
      integration_identifier: `galx_pro_${key.slice(0,8).split('').map(c=>String.fromCharCode(97+parseInt(c,16))).join('')}`,
      metadata: { galxPlan: 'pro-v1', userId: input.userId, requestId: row.request_id },
      subscription_data: { metadata: { galxPlan: 'pro-v1', userId: input.userId } },
      success_url: `${input.origin}${returnPath}?plan_checkout=returned${returnHash}`, cancel_url: `${input.origin}${returnPath}?plan_checkout=canceled${returnHash}`,
      expires_at: Math.floor(row.expires_at.getTime()/1000),
    }, { ...requestOptions, idempotencyKey: `pro-checkout:${key}` });
    const url = hostedPaymentUrl(session.url,'checkout.stripe.com');
    await db.query(`UPDATE private.galx_plan_checkouts SET session_id=$3,checkout_url=$4,state=CASE WHEN state='pending' THEN 'open' ELSE state END
      WHERE user_id=$1 AND request_id=$2`, [input.userId,row.request_id,session.id,url]);
    return { url };
  } catch (error) { await db.query('ROLLBACK').catch(()=>{}); throw error; }
  finally {
    if (row) await db.query('UPDATE private.galx_plan_checkouts SET lease_token=NULL,lease_until=NULL WHERE user_id=$1 AND request_id=$2 AND lease_token=$3', [input.userId,row.request_id,lease]).catch(()=>{});
    db.release();
  }
}

/** Called only inside the existing verified, atomic Stripe event transaction.
 * Lifecycle records are operational projections; paid access still reads Stripe. */
export async function fulfillPlanStripeEvent(db: PoolClient, event: Stripe.Event): Promise<boolean> {
  const object = event.data.object as any;
  if (event.type.startsWith('checkout.session.') && object.mode === 'subscription' && object.metadata?.galxPlan === 'pro-v1') {
    const row: Checkout | undefined = (await db.query('SELECT * FROM private.galx_plan_checkouts WHERE user_id=$1 AND request_id=$2 FOR UPDATE', [object.metadata.userId,object.metadata.requestId])).rows[0];
    if (!row || row.customer_id !== objectId(object.customer) || object.client_reference_id !== row.user_id ||
        (row.session_id && row.session_id !== object.id) || object.currency !== 'usd' || object.amount_subtotal !== PRO_PLAN.monthlyPriceUsd*100)
      throw new Error('Subscription checkout ownership or terms mismatch');
    const state = ['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type) ? 'complete' :
      ['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type) ? 'expired' : row.state;
    await db.query(`UPDATE private.galx_plan_checkouts SET session_id=$3,state=CASE WHEN state='complete' THEN state ELSE $4 END WHERE user_id=$1 AND request_id=$2`, [row.user_id,row.request_id,object.id,state]);
    return true;
  }
  if (event.type.startsWith('customer.subscription.')) {
    const known = (await db.query('SELECT user_id FROM private.galx_plan_subscriptions WHERE subscription_id=$1', [object.id])).rows[0];
    if (!known && object.metadata?.galxPlan !== 'pro-v1') return false;
    const customer = objectId(object.customer);
    const owner = (await db.query('SELECT user_id FROM galx_stripe_customers WHERE stripe_customer_id=$1', [customer])).rows[0];
    const item = object.items?.data?.[0];
    if (!owner || (known && known.user_id !== owner.user_id) || object.metadata?.userId !== owner.user_id || !item?.price?.id)
      throw new Error('Subscription ownership mismatch');
    await db.query(`INSERT INTO private.galx_plan_subscriptions(subscription_id,user_id,customer_id,price_id,status,cancel_at_period_end,period_end,event_created)
      VALUES($1,$2,$3,$4,$5,$6,to_timestamp($7),$8) ON CONFLICT(subscription_id) DO UPDATE SET status=EXCLUDED.status,
      cancel_at_period_end=EXCLUDED.cancel_at_period_end,period_end=EXCLUDED.period_end,event_created=EXCLUDED.event_created,updated_at=now()
      WHERE galx_plan_subscriptions.user_id=EXCLUDED.user_id AND galx_plan_subscriptions.status<>'canceled' AND galx_plan_subscriptions.event_created<=EXCLUDED.event_created`,
    [object.id,owner.user_id,customer,item.price.id,object.status,Boolean(object.cancel_at_period_end),item.current_period_end || null,event.created]);
    return true;
  }
  return false;
}

/** Resolve subscription adjustments separately from prepaid wallet deposits. */
export async function isProPaymentAdjustment(pool:Pool,stripe:Stripe,event:Stripe.Event):Promise<boolean>{
  if(!['charge.refunded','charge.dispute.funds_withdrawn','charge.dispute.funds_reinstated'].includes(event.type))return false;
  const object=event.data.object as any,payment=objectId(object.payment_intent);
  if(!payment)return false;
  const payments=await stripe.invoicePayments.list({payment:{type:'payment_intent',payment_intent:payment},limit:100,expand:['data.invoice']},requestOptions);
  if(payments.has_more)throw new Error('Payment invoice evidence incomplete');
  for(const item of payments.data){
    const invoice=item.invoice;
    if(typeof invoice==='string'||('deleted' in invoice&&invoice.deleted))continue;
    const subscription=invoice.parent?.subscription_details;
    if(subscription?.metadata?.galxPlan!=='pro-v1')continue;
    const owner=(await pool.query('SELECT user_id FROM galx_stripe_customers WHERE stripe_customer_id=$1',[objectId(invoice.customer)])).rows[0];
    if(owner&&owner.user_id===subscription.metadata.userId)return true;
  }
  return false;
}
