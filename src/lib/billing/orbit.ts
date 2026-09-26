import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type Stripe from 'stripe';
import { BillingError } from './account';
import { hostedPaymentUrl } from './payment';
import { requireTestSubscriptionCheckout } from './commercial-launch';

const options = { timeout: 8000, maxNetworkRetries: 0 };
const id = (value: unknown): string | undefined => typeof value === 'string' ? value :
  value && typeof value === 'object' && 'id' in value ? String(value.id) : undefined;

export interface OrbitRecord {
  subscription_id: string; checkout_id: string; user_id: string; actor_id: string;
  customer_id: string; price_id: string; livemode: boolean; revoked: boolean;
}
interface Offer { actor_id: string; stripe_price_id: string | null; enabled: boolean; livemode: boolean; handle: string; display_name: string }
interface Attempt { id: string; user_id: string; actor_id: string; price_id: string; customer_id: string | null;
  session_id: string | null; checkout_url: string | null; livemode: boolean; state: string; expires_at: Date }

export async function orbitOffer(pool: Pool, handle: string): Promise<Offer | null> {
  return (await pool.query<Offer>(`SELECT o.actor_id,o.stripe_price_id,o.enabled,o.livemode,i.handle,i.display_name
    FROM private.galx_orbit_offers o JOIN private.galx_star_public_identities i USING(actor_id)
    JOIN private.galx_star_profiles s USING(actor_id) JOIN private.galx_account_profiles p ON p.id=s.account_profile_id
    WHERE i.handle=$1 AND s.is_discoverable AND p.status='active'`, [handle])).rows[0] || null;
}

export async function orbitPrice(stripe: Stripe, offer: Offer) {
  if (!offer.stripe_price_id) throw new BillingError('Orbit is not available for this Star yet.', 503);
  const price = await stripe.prices.retrieve(offer.stripe_price_id, { expand: ['product'] }, options);
  const product = price.product;
  if (!price.active || price.livemode !== offer.livemode || price.currency !== 'usd' || price.unit_amount !== 1000 ||
      price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 || price.recurring.usage_type !== 'licensed' ||
      typeof product === 'string' || product.deleted || !product.active || product.metadata.galxRelationship !== 'orbit-v1' ||
      product.metadata.starActor !== offer.actor_id || product.name !== `Orbit ${offer.display_name}`) {
    throw new BillingError('Orbit is temporarily unavailable. Try again later.', 503);
  }
  return price;
}

export async function createOrbitCheckout(pool: Pool, stripe: Stripe, input: { userId: string; handle: string; origin: string }) {
  const offer = await orbitOffer(pool, input.handle);
  if (!offer?.enabled) throw new BillingError('Orbit is not available for this Star yet.', 503);
  requireTestSubscriptionCheckout(offer.livemode);
  await orbitPrice(stripe, offer);
  const work = await pool.query('SELECT 1 FROM private.galx_orbit_works WHERE actor_id=$1 LIMIT 1', [offer.actor_id]);
  if (!work.rowCount) throw new BillingError('Patron works are not available yet.', 503);
  const db = await pool.connect();
  const leaseToken = randomUUID();
  let attempt: Attempt | undefined;
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='2s'");
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`orbit:${input.userId}:${offer.actor_id}:${offer.livemode}`]);
    const existing = await db.query(`SELECT 1 FROM private.galx_orbit_subscriptions WHERE user_id=$1 AND actor_id=$2 AND livemode=$3
      AND status NOT IN ('canceled','incomplete_expired') LIMIT 1`, [input.userId,offer.actor_id,offer.livemode]);
    if (existing.rowCount) throw new BillingError('You already have an Orbit with this Star. Manage it in your account.', 409);
    await db.query(`INSERT INTO private.galx_orbit_checkouts(id,user_id,actor_id,price_id,livemode)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [randomUUID(),input.userId,offer.actor_id,offer.stripe_price_id,offer.livemode]);
    const claimed = await db.query<Attempt>(`UPDATE private.galx_orbit_checkouts SET lease_until=now()+interval '90 seconds',lease_token=$4
      WHERE user_id=$1 AND actor_id=$2 AND livemode=$3 AND state IN ('pending','open')
      AND (lease_until IS NULL OR lease_until<now()) RETURNING *`, [input.userId,offer.actor_id,offer.livemode,leaseToken]);
    attempt = claimed.rows[0];
    if (!attempt) throw new BillingError('Your Orbit checkout is being prepared. Try again shortly.', 409);
    await db.query('COMMIT');
    if (attempt.session_id) {
      const session = await stripe.checkout.sessions.retrieve(attempt.session_id, {}, options);
      if (session.status === 'expired') {
        await db.query("UPDATE private.galx_orbit_checkouts SET state='expired' WHERE id=$1", [attempt.id]);
        throw new BillingError('The previous checkout expired. Try again to start a new one.', 409);
      }
      if (session.status !== 'open') throw new BillingError('Your payment is being confirmed. Refresh your Orbit status.', 409);
      return { url: hostedPaymentUrl(session.url, 'checkout.stripe.com') };
    }
    // Never reuse an aged uncertain request after Stripe's idempotency retention.
    if (new Date(attempt.expires_at).getTime() < Date.now()+60_000) throw new BillingError('This checkout needs review. Contact support before retrying.', 409);
    let customer = attempt.customer_id;
    if (!customer) {
      // Orbit has a mode-isolated customer identity; test payments cannot replace a live billing profile.
      const created = await stripe.customers.create({ metadata: { userId: input.userId, relationship: 'orbit-v1' } },
        { ...options, idempotencyKey: `orbit-customer:${createHash('sha256').update(`${input.userId}:${offer.livemode}`).digest('hex')}` });
      customer = created.id;
      await db.query('UPDATE private.galx_orbit_checkouts SET customer_id=$2 WHERE id=$1', [attempt.id,customer]);
    }
    for await (const sub of stripe.subscriptions.list({ customer, status: 'all', limit: 100 }, options)) {
      if (sub.metadata.starActor === offer.actor_id && !['canceled','incomplete_expired'].includes(sub.status)) {
        throw new BillingError('An Orbit is already being confirmed. Refresh your account before purchasing again.', 409);
      }
    }
    const metadata = { galxRelationship: 'orbit-v1', orbitCheckout: attempt.id, starActor: offer.actor_id };
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', customer,
      automatic_tax: { enabled: true }, billing_address_collection: 'required', customer_update: { address: 'auto' },
      line_items: [{ price: attempt.price_id, quantity: 1 }], client_reference_id: input.userId,
      metadata, subscription_data: { metadata }, allow_promotion_codes: false,
      integration_identifier: `galx_orbit_${attempt.id.replace(/-/g,'').slice(0,8).split('').map(c=>String.fromCharCode(97+parseInt(c,16))).join('')}`,
      success_url: `${input.origin}/profile/${offer.handle}?orbit=returned`,
      cancel_url: `${input.origin}/profile/${offer.handle}?orbit=canceled`,
      expires_at: Math.floor(new Date(attempt.expires_at).getTime()/1000),
      custom_text: { submit: { message: `Orbit ${offer.display_name}: $10 USD each month for digital patron works. No generation or commissions. Cancel future renewals in your GALX account.` } },
    }, { ...options, idempotencyKey: `orbit-checkout:${attempt.id}` });
    const url = hostedPaymentUrl(session.url,'checkout.stripe.com');
    await db.query(`UPDATE private.galx_orbit_checkouts SET session_id=$2,checkout_url=$3,
      state=CASE WHEN state='pending' THEN 'open' ELSE state END WHERE id=$1`, [attempt.id,session.id,url]);
    return { url };
  } catch (error) { await db.query('ROLLBACK').catch(()=>{}); throw error; }
  finally {
    if (attempt) await db.query('UPDATE private.galx_orbit_checkouts SET lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2',[attempt.id,leaseToken]).catch(()=>{});
    db.release();
  }
}

/** Bound provider identity to the server-created attempt, not user-supplied metadata. */
export function matchesOrbitSubscription(sub: Stripe.Subscription, row: OrbitRecord): boolean {
  const item = sub.items.data[0];
  return sub.id === row.subscription_id && id(sub.customer) === row.customer_id && sub.livemode === row.livemode &&
    sub.metadata.galxRelationship === 'orbit-v1' && sub.metadata.orbitCheckout === row.checkout_id &&
    sub.metadata.starActor === row.actor_id && sub.items.data.length === 1 && item?.quantity === 1 &&
    item.price.id === row.price_id && item.price.currency === 'usd' && item.price.unit_amount === 1000 &&
    item.price.recurring?.interval === 'month' && item.price.recurring.interval_count === 1;
}

/** Current payment evidence is read on every protected request, before any artifact cache.
 * A webhook snapshot, success URL, test payment, trial, or editable metadata is never sufficient. */
export async function readOrbitAccess(stripe: Stripe, row: OrbitRecord, now = Date.now()) {
  const sub = await stripe.subscriptions.retrieve(row.subscription_id, { expand: ['latest_invoice'] }, options);
  if (!matchesOrbitSubscription(sub,row)) throw new BillingError('Orbit status could not be confirmed.',503);
  const invoice = sub.latest_invoice;
  let paidThrough: string | null = null;
  let active = false;
  if (!row.revoked && sub.status === 'active' && !sub.pause_collection && typeof invoice !== 'string' && invoice &&
      invoice.status === 'paid' && invoice.livemode === row.livemode && invoice.currency === 'usd' &&
      invoice.subtotal === 1000 && invoice.amount_paid >= invoice.total && invoice.total >= 1000 &&
      id(invoice.customer) === row.customer_id && id(invoice.parent?.subscription_details?.subscription) === sub.id) {
    const lines = [];
    for await (const line of stripe.invoices.listLineItems(invoice.id, { limit: 100 }, options)) lines.push(line);
    const recurring = lines.filter(line => line.pricing?.price_details?.price === row.price_id &&
      id(line.parent?.subscription_item_details?.subscription) === sub.id && !line.parent?.subscription_item_details?.proration);
    if (recurring.length === 1 && recurring[0].period.end * 1000 > now && recurring[0].period.start * 1000 <= now) {
      let settled = 0;
      for await (const payment of stripe.invoicePayments.list({ invoice: invoice.id, status: 'paid', limit: 100 }, options)) {
        const intentId = id(payment.payment.payment_intent);
        if (!intentId) continue;
        const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] }, options);
        const charge = intent.latest_charge;
        if (intent.status === 'succeeded' && intent.livemode === row.livemode && id(intent.customer) === row.customer_id &&
            charge && typeof charge !== 'string' && charge.paid && !charge.disputed && charge.amount_refunded === 0) settled += payment.amount_paid || 0;
      }
      active = settled >= invoice.total;
      if (active) paidThrough = new Date(recurring[0].period.end*1000).toISOString();
    }
  }
  return { active, paidThrough, cancelAtPeriodEnd: sub.cancel_at_period_end,
    state: active ? (sub.cancel_at_period_end ? 'ending' : 'active') :
      ['canceled','incomplete_expired'].includes(sub.status) ? 'canceled' : sub.status === 'past_due' || sub.status === 'unpaid' ? 'payment_required' : 'processing' };
}

export async function orbitRecords(pool: Pool, userId: string, livemode: boolean, actorId?: string): Promise<OrbitRecord[]> {
  return (await pool.query<OrbitRecord>(`SELECT subscription_id,checkout_id,user_id,actor_id,customer_id,price_id,livemode,revoked
    FROM private.galx_orbit_subscriptions WHERE user_id=$1 AND livemode=$2 ${actorId ? 'AND actor_id=$3' : ''}
    ORDER BY updated_at DESC LIMIT 100`, actorId ? [userId,livemode,actorId] : [userId,livemode])).rows;
}

/** Lifecycle events only reconcile Orbit. They cannot enter the generation-plan or wallet writers. */
export async function fulfillOrbitEvent(pool: Pool, stripe: Stripe, event: Stripe.Event): Promise<boolean> {
  const object = event.data.object as unknown as { id: string; metadata?: Record<string,string>; subscription?: unknown;
    parent?: { subscription_details?: { subscription?: unknown } }; customer?: unknown; status?: string; livemode?: boolean };
  let subscriptionId: string | undefined;
  if (event.type.startsWith('customer.subscription.')) subscriptionId = object.id;
  else if (event.type.startsWith('invoice.')) subscriptionId = id(object.parent?.subscription_details?.subscription);
  else if (event.type.startsWith('checkout.session.')) {
    if (object.metadata?.galxRelationship !== 'orbit-v1') return false;
    const checkout = (await pool.query<Attempt>('SELECT * FROM private.galx_orbit_checkouts WHERE id=$1',[object.metadata.orbitCheckout])).rows[0];
    if (!checkout || checkout.customer_id !== id(object.customer) || checkout.livemode !== event.livemode ||
        (checkout.session_id && checkout.session_id !== object.id)) throw new Error('Orbit checkout mismatch');
    subscriptionId = id(object.subscription);
    await pool.query(`UPDATE private.galx_orbit_checkouts SET session_id=$2,state=CASE WHEN state='complete' THEN state
      WHEN $3='checkout.session.expired' THEN 'expired' ELSE state END WHERE id=$1`,[checkout.id,object.id,event.type]);
    if (!subscriptionId) return true;
  }
  if (!subscriptionId) return false;
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {}, options);
  const known = (await pool.query<OrbitRecord>('SELECT * FROM private.galx_orbit_subscriptions WHERE subscription_id=$1',[sub.id])).rows[0];
  if (!known && sub.metadata.galxRelationship !== 'orbit-v1') return false;
  const attempt = (await pool.query<Attempt>('SELECT * FROM private.galx_orbit_checkouts WHERE id=$1',[sub.metadata.orbitCheckout])).rows[0];
  if (!attempt || !attempt.customer_id || attempt.livemode !== event.livemode) throw new Error('Orbit attempt unavailable');
  const row: OrbitRecord = { subscription_id: sub.id, checkout_id: attempt.id, user_id: attempt.user_id,
    actor_id: attempt.actor_id,customer_id: attempt.customer_id,price_id: attempt.price_id,livemode: attempt.livemode,revoked:known?.revoked || false };
  if (!matchesOrbitSubscription(sub,row)) throw new Error('Orbit subscription mismatch');
  await pool.query(`INSERT INTO private.galx_orbit_subscriptions(subscription_id,checkout_id,user_id,actor_id,customer_id,price_id,livemode,status,cancel_at_period_end)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(subscription_id) DO UPDATE
    SET status=EXCLUDED.status,cancel_at_period_end=EXCLUDED.cancel_at_period_end,updated_at=now()`,
    [sub.id,row.checkout_id,row.user_id,row.actor_id,row.customer_id,row.price_id,row.livemode,sub.status,sub.cancel_at_period_end]);
  await pool.query("UPDATE private.galx_orbit_checkouts SET state='complete' WHERE id=$1",[attempt.id]);
  return true;
}

export async function cancelOrbit(stripe: Stripe, row: OrbitRecord) {
  const sub = await stripe.subscriptions.retrieve(row.subscription_id, {}, options);
  if (!matchesOrbitSubscription(sub,row)) throw new BillingError('Orbit status could not be confirmed.',503);
  if (!['canceled','incomplete_expired'].includes(sub.status) && !sub.cancel_at_period_end) {
    await stripe.subscriptions.update(sub.id,{ cancel_at_period_end: true },{ ...options,idempotencyKey:`orbit-cancel:${sub.id}` });
  }
  return { canceled: true };
}
