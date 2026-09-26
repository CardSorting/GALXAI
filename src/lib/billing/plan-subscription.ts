import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type Stripe from 'stripe';
import { BillingError } from './account';
import { requireTestSubscriptionCheckout } from './commercial-launch';
import { hostedPaymentUrl } from './payment';
import { DEVELOPER_ACCESS, PRO_PLAN } from './pro-plan';
import { USAGE_PRICING } from './usage-pricing';
import { BILLING_PATHS } from './navigation';
import type { FairPolicy } from '../sites/fair-store';
import { IMAGE_PLAN_BY_ID, IMAGE_PLAN_CATALOG, type ImagePlanId, type ImagePlanKey } from './image-plan-catalog';
import { imagePlanAllowanceApproved, IMAGE_ALLOWANCE_CONFIGURATION, type ImageAllowanceConfiguration } from './image-allowance-config';
import { GalxUnifiedR2StorageManager } from '../../core/storage/GalxUnifiedR2StorageManager';

export const PRO_LOOKUP_KEY = 'galx_pro_monthly_v1';
export const PRO_PRODUCT_ID = 'galx_pro_v1';
export const NOVA_DEVELOPER_LOOKUP_KEY = DEVELOPER_ACCESS.lookupKey;
export const NOVA_DEVELOPER_PLAN_KEY = DEVELOPER_ACCESS.planKey;
export const NOVA_DEVELOPER_PRODUCT_ID = 'galx_nova_developer_access_v1';
export const NOVA_MESSAGE_PRICE_LOOKUP_KEY = 'galx_nova_message_monthly_v1';
const objectId = (value: any): string | undefined => typeof value === 'string' ? value : value?.id;
const requestOptions = { timeout: 8000, maxNetworkRetries: 0 };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Checkout = { user_id: string; request_id: string; price_id: string; plan_key: string | null; customer_id: string | null; session_id: string | null; checkout_url: string | null; return_path: string | null; state: string; created_at: Date; expires_at: Date };

export const IMAGE_PLAN_KEYS = IMAGE_PLAN_CATALOG.map(plan => plan.planKey) as readonly ImagePlanKey[];
export const CONSUMER_PLAN_KEYS = ['pro-v1', ...IMAGE_PLAN_KEYS] as const;
const isConsumerPlanKey = (value: unknown): value is typeof CONSUMER_PLAN_KEYS[number] =>
  typeof value === 'string' && (CONSUMER_PLAN_KEYS as readonly string[]).includes(value);
const isSupportedPlanKey = (value: unknown): value is typeof CONSUMER_PLAN_KEYS[number] | typeof NOVA_DEVELOPER_PLAN_KEY =>
  isConsumerPlanKey(value) || value === NOVA_DEVELOPER_PLAN_KEY;
const imagePlanForKey = (key: unknown) => typeof key === 'string' && (IMAGE_PLAN_KEYS as readonly string[]).includes(key)
  ? IMAGE_PLAN_CATALOG.find(plan => plan.planKey === key) : undefined;
const expectedMonthlyAmount = (key: unknown) => key === 'pro-v1' ? PRO_PLAN.monthlyPriceUsd * 100 :
  key === NOVA_DEVELOPER_PLAN_KEY ? DEVELOPER_ACCESS.monthlyPriceUsd * 100 : imagePlanForKey(key)?.monthlyPriceUsd ? imagePlanForKey(key)!.monthlyPriceUsd * 100 : null;

export async function proPrice(stripe: Stripe, policy: FairPolicy) {
  if (policy.mode !== 'enforce') throw new BillingError('Plan checkout is temporarily unavailable.', 503);
  const prices = await stripe.prices.list({ lookup_keys: [PRO_LOOKUP_KEY], active: true, limit: 2 }, requestOptions);
  const price = prices.data[0];
  if (prices.has_more || prices.data.length !== 1 || !price || !policy.paid_price_ids.includes(price.id) ||
      objectId(price.product) !== PRO_PRODUCT_ID || price.metadata?.galxPlan !== 'pro-v1' || price.currency !== 'usd' ||
      price.unit_amount !== PRO_PLAN.monthlyPriceUsd * 100 || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 ||
      price.recurring.usage_type !== 'licensed') throw new BillingError('Plan checkout is temporarily unavailable.', 503);
  return price;
}

/** Validate an active image tier before creating a Checkout Session. The public
 * plan ID is mapped to one server-owned lookup key; callers cannot supply a
 * Stripe Price ID or arbitrary amount. */
export async function imagePlanPrice(
  stripe: Stripe,
  planId: ImagePlanId,
  allowanceConfiguration: ImageAllowanceConfiguration = IMAGE_ALLOWANCE_CONFIGURATION,
) {
  const plan = IMAGE_PLAN_BY_ID[planId];
  if (!plan || !plan.checkoutEnabled || plan.catalogStatus !== 'active' ||
      !imagePlanAllowanceApproved(allowanceConfiguration, plan.planKey)) {
    throw new BillingError('That plan is temporarily unavailable.', 503);
  }
  // Do not accept payment for private creation until the authoritative
  // server-side storage path is configured. This check runs before Stripe I/O.
  if (!GalxUnifiedR2StorageManager.getInstance().isPrivateImageStorageConfigured()) {
    throw new BillingError('Private creation checkout is temporarily unavailable.', 503);
  }
  const [prices, product] = await Promise.all([
    stripe.prices.list({ lookup_keys: [plan.stripeLookupKey], active: true, limit: 2 }, requestOptions),
    stripe.products.retrieve(plan.stripeProductId, {}, requestOptions),
  ]);
  const price = prices.data[0];
  if (prices.has_more || prices.data.length !== 1 || !price || !product.active || product.name !== plan.name ||
      product.metadata?.galxPlan !== plan.planKey || product.metadata?.galxPublicPlan !== plan.publicId || product.metadata?.galxSurface !== 'images' ||
      objectId(price.product) !== plan.stripeProductId || price.metadata?.galxPlan !== plan.planKey ||
      price.metadata?.galxPublicPlan !== plan.publicId ||
      price.metadata?.catalogStatus !== 'active' || price.metadata?.checkoutEnabled !== 'true' ||
      price.currency !== 'usd' || price.unit_amount !== plan.monthlyPriceUsd * 100 ||
      price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 || price.recurring.usage_type !== 'licensed') {
    throw new BillingError('That plan is temporarily unavailable.', 503);
  }
  return price;
}

export async function developerPrice(stripe: Stripe) {
  const prices = await stripe.prices.list({ lookup_keys: [NOVA_DEVELOPER_LOOKUP_KEY], active: true, limit: 2 }, requestOptions);
  const price = prices.data[0];
  if (prices.has_more || prices.data.length !== 1 || !price || objectId(price.product) !== NOVA_DEVELOPER_PRODUCT_ID ||
      price.metadata?.galxPlan !== NOVA_DEVELOPER_PLAN_KEY || price.currency !== 'usd' ||
      price.unit_amount !== DEVELOPER_ACCESS.monthlyPriceUsd * 100 || price.recurring?.interval !== 'month' ||
      price.recurring.interval_count !== 1 || price.recurring.usage_type !== 'licensed') {
    throw new BillingError('Developer checkout is temporarily unavailable. Please try again shortly.', 503);
  }
  return price;
}

type SubscriptionCheckoutDefinition = {
  planKey: string;
  price: Stripe.Price;
  returnPath: string;
  legacyReturnPath?: string;
  legacyReturnHash?: string;
  returnParam: 'plan_checkout' | 'developer_checkout';
  integrationPrefix: string;
  idempotencyPrefix: string;
  customerIdempotencyPrefix: string;
  checkoutLockPrefix: string;
  keySeedPrefix: string;
  checkoutNotice?: string;
  checkoutMetadata?: Record<string, string>;
  additionalPrices?: Stripe.Price[];
  isExistingSubscription: (subscription: Stripe.Subscription) => boolean;
};

/** Durable checkout lease works with transaction-pooled PostgreSQL. Stripe calls
 * happen outside transactions; provider idempotency handles uncertain responses.
 * Pro and Developer use this same subscription writer and private checkout table. */
async function createSubscriptionCheckout(
  pool: Pool,
  stripe: Stripe,
  definition: SubscriptionCheckoutDefinition,
  input: { userId: string; requestId: string; origin: string },
) {
  if (!uuid.test(input.requestId)) throw new BillingError('Refresh billing and try again.');
  const db = await pool.connect(), lease = randomUUID();
  let row: Checkout | undefined;
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='5s'");
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`${definition.checkoutLockPrefix}:${input.userId}`]);
    row = (await db.query(`SELECT * FROM private.galx_plan_checkouts WHERE user_id=$1 AND
      (request_id=$2 OR state IN ('pending','open')) ORDER BY (request_id=$2) DESC LIMIT 1 FOR UPDATE`, [input.userId,input.requestId])).rows[0];
    if (row && !['pending','open'].includes(row.state)) throw new BillingError('This checkout has finished. Refresh your plan status.', 409);
    if (row && row.price_id !== definition.price.id) throw new BillingError('Another subscription checkout is already in progress. Finish it or try again shortly.', 409);
    if (!row) {
      const recent = (await db.query("SELECT count(*) FROM private.galx_plan_checkouts WHERE user_id=$1 AND created_at>now()-interval '10 minutes'", [input.userId])).rows[0];
      if (Number(recent.count) >= 5) throw new BillingError('Too many checkout attempts. Try again in a few minutes.', 429);
      row = (await db.query('INSERT INTO private.galx_plan_checkouts(user_id,request_id,price_id,plan_key,return_path) VALUES($1,$2,$3,$4,$5) RETURNING *', [input.userId,input.requestId,definition.price.id,definition.planKey,definition.returnPath])).rows[0] as Checkout;
    }
    const claimed = await db.query(`UPDATE private.galx_plan_checkouts SET lease_token=$3,lease_until=now()+interval '60 seconds'
      WHERE user_id=$1 AND request_id=$2 AND (lease_until IS NULL OR lease_until<=now()) RETURNING request_id`, [input.userId,row.request_id,lease]);
    if (!claimed.rowCount) throw new BillingError('Another payment request is in progress. Try again shortly.', 429);
    await db.query('COMMIT');
    let customer = (await db.query('SELECT stripe_customer_id FROM galx_stripe_customers WHERE user_id=$1', [input.userId])).rows[0]?.stripe_customer_id;
    if (customer && !customer.startsWith('cus_mock_')) {
      const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 }, requestOptions);
      if (subscriptions.data.some(s => !['canceled','incomplete_expired'].includes(s.status) && definition.isExistingSubscription(s)))
        throw new BillingError('A subscription already exists for this account. Use Manage subscription to review it.', 409);
      if (subscriptions.has_more) throw new BillingError('Your payment profile needs review. Contact support.', 503);
    }
    if (row.session_id) {
      const session = await stripe.checkout.sessions.retrieve(row.session_id, {}, requestOptions);
      if (session.status === 'open') return { url: hostedPaymentUrl(session.url,'checkout.stripe.com') };
      await db.query('UPDATE private.galx_plan_checkouts SET state=$3 WHERE user_id=$1 AND request_id=$2', [input.userId,row.request_id,session.status === 'complete' ? 'complete' : 'expired']);
      throw new BillingError(session.status === 'complete' ? 'Payment is being confirmed. Refresh your plan status.' : 'This checkout expired. Start a new checkout.', 409);
    }
    if (row.price_id !== definition.price.id || Date.now() > row.created_at.getTime()+90*60_000)
      throw new BillingError('This payment attempt needs review. Contact support before starting another.', 503);
    const key = createHash('sha256').update(`${definition.keySeedPrefix}:${input.userId}:${row.request_id}`).digest('hex');
    if (!customer || customer.startsWith('cus_mock_')) {
      const created = await stripe.customers.create({ metadata: { userId: input.userId } }, { ...requestOptions, idempotencyKey: `${definition.customerIdempotencyPrefix}:${key}` });
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
    if (row.return_path !== null && row.return_path !== definition.returnPath) throw new BillingError('This payment attempt needs review. Contact billing support.', 503);
    const returnPath = row.return_path || definition.legacyReturnPath || definition.returnPath;
    const returnHash = row.return_path ? '' : definition.legacyReturnHash || '';
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', customer, client_reference_id: input.userId,
      automatic_tax: { enabled: true }, billing_address_collection: 'required', customer_update: { address: 'auto' },
      line_items: [{ price: row.price_id, quantity: 1 }, ...(definition.additionalPrices || []).map(price => ({ price: price.id, quantity: 1 }))], allow_promotion_codes: false,
      ...(definition.checkoutNotice ? { custom_text: { submit: { message: definition.checkoutNotice } } } : {}),
      integration_identifier: `${definition.integrationPrefix}_${key.slice(0,8).split('').map(c=>String.fromCharCode(97+parseInt(c,16))).join('')}`,
      metadata: { galxPlan: definition.planKey, userId: input.userId, requestId: row.request_id, ...definition.checkoutMetadata },
      subscription_data: { metadata: { galxPlan: definition.planKey, userId: input.userId, ...definition.checkoutMetadata } },
      success_url: `${input.origin}${returnPath}?${definition.returnParam}=returned${returnHash}`, cancel_url: `${input.origin}${returnPath}?${definition.returnParam}=canceled${returnHash}`,
      expires_at: Math.floor(row.expires_at.getTime()/1000),
    }, { ...requestOptions, idempotencyKey: `${definition.idempotencyPrefix}:${key}` });
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

/** Historical subscription reconciliation remains supported; new Sites sales are closed. */
export async function createProCheckout(pool: Pool, stripe: Stripe, policy: FairPolicy, input: { userId: string; requestId: string; origin: string }) {
  throw new BillingError('New Sites subscriptions are closed.', 410);
}

/** Checkout for the active Image Studio catalog tiers. The same subscription
 * writer is used so payment ownership and lifecycle reconciliation stay
 * identical across Pro and the image plans. */
export async function createImagePlanCheckout(
  pool: Pool,
  stripe: Stripe,
  planId: ImagePlanId,
  input: { userId: string; requestId: string; origin: string },
) {
  const plan = IMAGE_PLAN_BY_ID[planId];
  if (!plan) throw new BillingError('That plan is not available.', 400);
  if (!plan.checkoutEnabled) throw new BillingError('This purchase option has been retired.', 410);
  const price = await imagePlanPrice(stripe, planId);
  requireTestSubscriptionCheckout(price.livemode);
  const imageProducts = new Set<string>([...IMAGE_PLAN_CATALOG.map(item => item.stripeProductId), 'galx_images_team_v1']);
  return createSubscriptionCheckout(pool, stripe, {
    planKey: plan.planKey,
    price,
    returnPath: BILLING_PATHS.plan,
    returnParam: 'plan_checkout',
    integrationPrefix: `galx_images_${plan.id}`,
    idempotencyPrefix: `images-${plan.id}-checkout`,
    customerIdempotencyPrefix: 'plan-customer',
    checkoutLockPrefix: 'consumer-plan-checkout',
    keySeedPrefix: `images-${plan.id}`,
    checkoutNotice: `${plan.name} is a recurring Image Studio subscription at $${plan.monthlyPriceUsd}/month for one account.`,
    isExistingSubscription: subscription => subscription.items.data.some(item => imageProducts.has(objectId(item.price.product) || '')),
  }, input);
}

/** Nova Developer Access subscription checkout. No wallet or usage credit is created. */
export async function createDeveloperCheckout(pool: Pool, stripe: Stripe, input: { userId: string; requestId: string; origin: string }) {
  if (!DEVELOPER_ACCESS.checkoutEnabled) throw new BillingError('Self-service developer access is no longer available.', 410);
  const price = await developerPrice(stripe);
  const usagePrice = await developerUsagePrice(stripe);
  return createSubscriptionCheckout(pool, stripe, {
    planKey: NOVA_DEVELOPER_PLAN_KEY, price,
    returnPath: BILLING_PATHS.plan, returnParam: 'developer_checkout', integrationPrefix: 'galx_nova_developer',
    idempotencyPrefix: 'nova-developer-checkout', customerIdempotencyPrefix: 'subscription-customer',
    checkoutLockPrefix: 'nova-developer-checkout', keySeedPrefix: 'nova-developer',
    checkoutNotice: 'This is a recurring API access subscription at $50/month. Usage is billed separately. No usage credits are included.',
    checkoutMetadata: {
      usagePricingStatus: USAGE_PRICING.status,
      includedUsageCreditsUsd: String(DEVELOPER_ACCESS.includedUsageCreditsUsd),
    },
    additionalPrices: [usagePrice],
    // A rotated/archived Nova Price is still the same access membership. Match
    // the durable Product identity so an account cannot open a second Nova
    // subscription merely because its first Price was retired.
    isExistingSubscription: subscription => subscription.items.data.some(item =>
      item.price.id === price.id || objectId(item.price.product) === NOVA_DEVELOPER_PRODUCT_ID),
  }, input);
}

export async function developerUsagePrice(stripe: Stripe) {
  const prices = await stripe.prices.list({ lookup_keys: [NOVA_MESSAGE_PRICE_LOOKUP_KEY], active: true, limit: 2 }, requestOptions);
  const price = prices.data[0];
  if (prices.has_more || prices.data.length !== 1 || !price || objectId(price.product) !== NOVA_DEVELOPER_PRODUCT_ID ||
      price.metadata?.galxContractVersion !== 'nova-message-v1' || price.currency !== 'usd' ||
      price.unit_amount !== USAGE_PRICING.unitAmountUsd * 100 || price.recurring?.interval !== 'month' ||
      price.recurring.interval_count !== 1 || price.recurring.usage_type !== 'metered' || !price.recurring.meter) {
    throw new BillingError('Developer usage billing is temporarily unavailable. Please try again shortly.', 503);
  }
  return price;
}

/** Called only inside the existing verified, atomic Stripe event transaction.
 * Lifecycle records are operational projections; paid access still reads Stripe. */
export async function fulfillPlanStripeEvent(db: PoolClient, event: Stripe.Event, context: { developerPriceId?: string } = {}): Promise<boolean> {
  const object = event.data.object as any;
  const planKey = object.metadata?.galxPlan;
  if (event.type.startsWith('checkout.session.') && object.mode === 'subscription' && isSupportedPlanKey(planKey)) {
    const row: Checkout | undefined = (await db.query('SELECT * FROM private.galx_plan_checkouts WHERE user_id=$1 AND request_id=$2 FOR UPDATE', [object.metadata.userId,object.metadata.requestId])).rows[0];
    const developerCheckout = planKey === NOVA_DEVELOPER_PLAN_KEY;
    const expectedAmount = expectedMonthlyAmount(planKey);
    // The checkout row was created only after the current Price passed the
    // server-side contract check. Keep that durable identity authoritative for
    // webhook replay; an archived successor Price must not block reconciliation
    // of this already-created subscription attempt.
    if (!row || row.customer_id !== objectId(object.customer) || object.client_reference_id !== row.user_id ||
        (row.session_id && row.session_id !== object.id) ||
        (row.plan_key && row.plan_key !== planKey) ||
        (developerCheckout && context.developerPriceId && row.price_id !== context.developerPriceId) ||
        object.currency !== 'usd' || expectedAmount === null || object.amount_subtotal !== expectedAmount)
      throw new Error('Subscription checkout ownership or terms mismatch');
    // A completed Checkout Session is not proof of payment by itself. Keep
    // the durable attempt open until Stripe reports the paid state; delayed
    // methods may arrive through async_payment_succeeded later.
    const paid = ['paid', 'no_payment_required'].includes(object.payment_status);
    const state = ['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type) && paid ? 'complete' :
      ['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type) ? 'expired' : row.state;
    await db.query(`UPDATE private.galx_plan_checkouts SET session_id=$3,state=CASE WHEN state='complete' THEN state ELSE $4 END WHERE user_id=$1 AND request_id=$2`, [row.user_id,row.request_id,object.id,state]);
    return true;
  }
  if (event.type.startsWith('customer.subscription.')) {
    const known = (await db.query('SELECT user_id,customer_id,price_id,plan_key FROM private.galx_plan_subscriptions WHERE subscription_id=$1', [object.id])).rows[0];
    const metadataPlan = isSupportedPlanKey(planKey) ? planKey : undefined;
    if (!known && !metadataPlan) return false;
    const customer = objectId(object.customer);
    const item = object.items?.data?.[0];
    const eventUserId = typeof object.metadata?.userId === 'string' ? object.metadata.userId : known?.user_id;
    // Consumer subscriptions must originate from a server-created checkout
    // attempt. Signed provider metadata alone is not an access or projection
    // authority: requiring the durable row prevents an externally-created
    // subscription with copied metadata from becoming a local plan record.
    let checkout: Pick<Checkout, 'user_id' | 'customer_id' | 'price_id' | 'plan_key'> | undefined;
    if (!known && isConsumerPlanKey(metadataPlan)) {
      if (!eventUserId || !customer || !item?.price?.id) throw new Error('Subscription checkout ownership mismatch');
      checkout = (await db.query(`SELECT user_id,customer_id,price_id,plan_key
        FROM private.galx_plan_checkouts
        WHERE user_id=$1 AND customer_id=$2 AND price_id=$3 AND plan_key=$4 AND state IN ('open','complete')
        ORDER BY created_at DESC LIMIT 1`, [eventUserId, customer, item.price.id, metadataPlan])).rows[0];
      if (!checkout) throw new Error('Subscription checkout ownership mismatch');
    }
    const subscriptionPlan = known?.plan_key || metadataPlan;
    if (!subscriptionPlan || (known && metadataPlan && known.plan_key !== metadataPlan)) throw new Error('Subscription plan ownership mismatch');
    const owner = (await db.query('SELECT user_id FROM galx_stripe_customers WHERE stripe_customer_id=$1', [customer])).rows[0];
    const expectedDeveloperPriceId = known?.price_id || context.developerPriceId;
    if (!owner || (checkout && (checkout.user_id !== owner.user_id || checkout.customer_id !== customer || checkout.price_id !== item?.price?.id || checkout.plan_key !== subscriptionPlan)) ||
        (known && (known.user_id !== owner.user_id || known.customer_id !== customer || known.price_id !== item?.price?.id)) ||
        eventUserId !== owner.user_id || !item?.price?.id ||
        (subscriptionPlan === NOVA_DEVELOPER_PLAN_KEY && (!expectedDeveloperPriceId || item.price.id !== expectedDeveloperPriceId)))
      throw new Error('Subscription ownership mismatch');
    await db.query(`INSERT INTO private.galx_plan_subscriptions(subscription_id,user_id,customer_id,price_id,plan_key,status,cancel_at_period_end,period_end,event_created)
      VALUES($1,$2,$3,$4,$5,$6,$7,to_timestamp($8),$9) ON CONFLICT(subscription_id) DO UPDATE SET plan_key=EXCLUDED.plan_key,status=EXCLUDED.status,
      cancel_at_period_end=EXCLUDED.cancel_at_period_end,period_end=EXCLUDED.period_end,event_created=EXCLUDED.event_created,updated_at=now()
      WHERE galx_plan_subscriptions.user_id=EXCLUDED.user_id AND galx_plan_subscriptions.plan_key=EXCLUDED.plan_key AND
        galx_plan_subscriptions.price_id=EXCLUDED.price_id AND galx_plan_subscriptions.status<>'canceled' AND galx_plan_subscriptions.event_created<=EXCLUDED.event_created`,
    [object.id,owner.user_id,customer,item.price.id,subscriptionPlan,object.status,Boolean(object.cancel_at_period_end),item.current_period_end || null,event.created]);
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
