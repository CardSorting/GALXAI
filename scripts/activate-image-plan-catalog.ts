/**
 * Private production activation for the Image Studio catalog.
 *
 * This command is deliberately separate from staging. It activates only the
 * reviewed Products and recurring Prices, reconciles the existing GALX Pro
 * lookup key to the published $10 Sites contract when there are no live Pro
 * subscriptions, and keeps the Sites fair-use price allowlist Pro-only. It never
 * creates customers, subscriptions, invoices, payments, tax registrations, or
 * application entitlements.
 */
import Stripe from 'stripe';
import { getPostgresPool } from '../src/lib/db/postgres';
import { IMAGE_PLAN_CATALOG } from '../src/lib/billing/image-plan-catalog';
import { PRO_LOOKUP_KEY, PRO_PRODUCT_ID } from '../src/lib/billing/plan-subscription';
import { PRO_PLAN } from '../src/lib/billing/pro-plan';

const secretKey = process.env.STRIPE_SECRET_KEY || '';
throw new Error('This legacy activation workflow is retired. Orbit and Foundry require explicit tax-readiness approval before live launch.');
if (!/^(sk|rk)_live_[A-Za-z0-9]+$/.test(secretKey)) throw new Error('A valid live Stripe key is required');
if (!process.argv.includes('--activate')) throw new Error('Activation is explicit. Re-run with --activate.');

const stripe = new Stripe(secretKey, { apiVersion: '2026-07-29.dahlia', maxNetworkRetries: 0, timeout: 10_000 });
const requestOptions = { timeout: 10_000, maxNetworkRetries: 0 } as const;
// This version records the MAX rename and price rotation. Stripe Price amounts
// are immutable, so the old Team amount is replaced by a new Price under the
// same private lookup key after an active-subscription safety check.
const version = '2026-09-20-max-rename-v1';
const requiredWebhookEvents = [
  'checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed', 'checkout.session.expired',
  'invoice.paid', 'invoice.payment_failed',
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
] as const;
const objectId = (value: unknown) => typeof value === 'string' ? value : (value as { id?: string } | null)?.id;
const activeStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete']);

const imageMetadata = (plan: typeof IMAGE_PLAN_CATALOG[number]) => ({
  galxPlan: plan.planKey,
  galxPublicPlan: plan.publicId,
  galxSurface: 'images',
  catalogStatus: 'active',
  checkoutEnabled: 'true',
  privateMode: 'owner-scoped',
  pricingVersion: version,
});

async function verifyWebhook() {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 }, requestOptions);
  if (endpoints.has_more) throw new Error('Webhook inventory is truncated; activation stopped.');
  const endpoint = endpoints.data.find(item => item.url === 'https://galx.ai/api/stripe/webhook' && item.status === 'enabled' && item.livemode);
  if (!endpoint || !(endpoint.enabled_events.includes('*') || requiredWebhookEvents.every(event => endpoint.enabled_events.includes(event)))) {
    throw new Error('The live GALX billing webhook is not ready for subscription activation.');
  }
}

async function activeSubscriptionsForPrices(priceIds: Set<string>) {
  const subscriptions = await stripe.subscriptions.list({ status: 'all', limit: 100 }, requestOptions);
  if (subscriptions.has_more) throw new Error('Subscription inventory is truncated; activation stopped.');
  return subscriptions.data.filter(subscription => activeStatuses.has(subscription.status) &&
    subscription.items.data.some(item => priceIds.has(item.price.id)));
}

async function activateImagePlan(plan: typeof IMAGE_PLAN_CATALOG[number]) {
  const product = await stripe.products.retrieve(plan.stripeProductId, {}, requestOptions);
  const legacyName = plan.id === 'creator' ? 'GALX Images — Creator' : plan.id === 'max' ? 'GALX Images — Team' : null;
  if (!product.livemode || ![plan.name, legacyName].includes(product.name) || product.metadata.galxPlan !== plan.planKey) {
    throw new Error(`The ${plan.id} Product does not match the reviewed catalog contract.`);
  }
  const metadata = imageMetadata(plan);
  const updatedProduct = await stripe.products.update(product.id, {
    active: true,
    name: plan.name,
    metadata: { ...product.metadata, ...metadata },
    description: `${plan.audience} Image Studio subscription for one account. Account sharing, seats, and shared workspaces are not included.`,
  }, requestOptions);

  const [activeLookup, inactiveLookup] = await Promise.all([
    stripe.prices.list({ lookup_keys: [plan.stripeLookupKey], active: true, limit: 10 }, requestOptions),
    stripe.prices.list({ lookup_keys: [plan.stripeLookupKey], active: false, limit: 10 }, requestOptions),
  ]);
  const matches = [...activeLookup.data, ...inactiveLookup.data];
  if (activeLookup.has_more || inactiveLookup.has_more || matches.length !== 1) throw new Error(`The ${plan.id} lookup key is ambiguous.`);
  const current = matches[0];
  const productPrices = await stripe.prices.list({ product: updatedProduct.id, active: true, limit: 100 }, requestOptions);
  if (productPrices.has_more) throw new Error(`The ${plan.id} Product price inventory is truncated.`);
  const amount = plan.monthlyPriceUsd * 100;
  const isContractPrice = (price: Stripe.Price) => price.livemode && objectId(price.product) === updatedProduct.id &&
    price.unit_amount === amount && price.currency === 'usd' && price.recurring?.interval === 'month' &&
    price.recurring.interval_count === 1 && price.recurring.usage_type === 'licensed' && price.metadata.galxPlan === plan.planKey;
  const exact = isContractPrice(current) ? current : null;
  const staleActive = productPrices.data.filter(price => price.id !== exact?.id && price.metadata.galxPlan === plan.planKey);
  if (staleActive.length) {
    const subscriptions = await activeSubscriptionsForPrices(new Set(staleActive.map(price => price.id)));
    if (subscriptions.length) throw new Error(`An active ${plan.id} subscription uses a superseded catalog price; rotation stopped.`);
  }

  let activated: Stripe.Price;
  if (exact && staleActive.length === 0) {
    activated = await stripe.prices.update(exact.id, {
      active: true,
      lookup_key: plan.stripeLookupKey,
      transfer_lookup_key: true,
      metadata: { ...exact.metadata, ...metadata },
      nickname: `${plan.publicId} monthly`,
    }, requestOptions);
  } else {
    // Stripe Price amounts are immutable. Transfer the stable lookup key to a
    // replacement Price, then archive the superseded amount after readback.
    activated = await stripe.prices.create({
      product: updatedProduct.id,
      unit_amount: amount,
      currency: 'usd',
      recurring: { interval: 'month' },
      lookup_key: plan.stripeLookupKey,
      transfer_lookup_key: true,
      active: false,
      nickname: `${plan.publicId} monthly`,
      metadata,
    }, { ...requestOptions, idempotencyKey: `galx-images-${plan.id}-price-${version}` });
    activated = await stripe.prices.update(activated.id, {
      active: true,
      metadata,
      nickname: `${plan.publicId} monthly`,
    }, requestOptions);
  }
  if (!activated.active || objectId(activated.product) !== updatedProduct.id || activated.unit_amount !== amount ||
      activated.metadata.catalogStatus !== 'active' || activated.metadata.checkoutEnabled !== 'true') throw new Error(`Stripe readback failed for ${plan.id}.`);
  for (const extra of staleActive) await stripe.prices.update(extra.id, { active: false }, requestOptions);
  return activated;
}

async function reconcilePro() {
  const product = await stripe.products.retrieve(PRO_PRODUCT_ID, {}, requestOptions);
  if (!product.livemode || product.name !== PRO_PLAN.name || product.metadata.galxPlan !== 'pro-v1') throw new Error('The GALX Pro Product does not match the published contract.');
  const proMetadata = { galxPlan: 'pro-v1', galxSurface: 'sites', catalogStatus: 'active', checkoutEnabled: 'true', pricingVersion: version };
  await stripe.products.update(product.id, { active: true, metadata: { ...product.metadata, ...proMetadata }, description: 'GALX Pro for one account, with Sites workspace access under published plan terms.' }, requestOptions);

  const [activeLookup, inactiveLookup] = await Promise.all([
    stripe.prices.list({ lookup_keys: [PRO_LOOKUP_KEY], active: true, limit: 10 }, requestOptions),
    stripe.prices.list({ lookup_keys: [PRO_LOOKUP_KEY], active: false, limit: 10 }, requestOptions),
  ]);
  if (activeLookup.has_more || inactiveLookup.has_more || activeLookup.data.length > 1 || inactiveLookup.data.length > 1) throw new Error('The GALX Pro lookup key is ambiguous.');
  const current = activeLookup.data[0];
  const target = [...activeLookup.data, ...inactiveLookup.data].find(price => price.product === product.id && price.unit_amount === PRO_PLAN.monthlyPriceUsd * 100 && price.currency === 'usd' && price.recurring?.interval === 'month');
  const conflictingIds = new Set([...activeLookup.data, ...(current ? [current] : [])].map(price => price.id));
  const existing = await activeSubscriptionsForPrices(conflictingIds);
  if (existing.length) throw new Error('An active GALX Pro subscription uses the old catalog price; reconciliation stopped.');

  let price: Stripe.Price;
  if (target && target.active && target.unit_amount === PRO_PLAN.monthlyPriceUsd * 100 && target.metadata.galxPlan === 'pro-v1') {
    price = await stripe.prices.update(target.id, { lookup_key: PRO_LOOKUP_KEY, transfer_lookup_key: true, metadata: { ...target.metadata, ...proMetadata }, nickname: 'Pro monthly' }, requestOptions);
  } else if (target && !target.active) {
    price = await stripe.prices.update(target.id, { active: true, lookup_key: PRO_LOOKUP_KEY, transfer_lookup_key: true, metadata: { ...target.metadata, ...proMetadata }, nickname: 'Pro monthly' }, requestOptions);
  } else {
    price = await stripe.prices.create({ product: product.id, unit_amount: PRO_PLAN.monthlyPriceUsd * 100, currency: 'usd', recurring: { interval: 'month' }, lookup_key: PRO_LOOKUP_KEY, transfer_lookup_key: true, active: false, nickname: 'Pro monthly', metadata: proMetadata }, { ...requestOptions, idempotencyKey: 'galx-pro-price-v10-reconcile-20260920' });
    price = await stripe.prices.update(price.id, { active: true, metadata: proMetadata, nickname: 'Pro monthly' }, requestOptions);
  }
  if (!price.active || price.unit_amount !== PRO_PLAN.monthlyPriceUsd * 100 || price.currency !== 'usd' || price.product !== product.id || price.metadata.galxPlan !== 'pro-v1') throw new Error('GALX Pro Price readback failed.');

  const productPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 }, requestOptions);
  if (productPrices.has_more) throw new Error('GALX Pro Product price inventory is truncated.');
  for (const extra of productPrices.data) {
    if (extra.id !== price.id && extra.metadata.galxPlan === 'pro-v1') await stripe.prices.update(extra.id, { active: false }, requestOptions);
  }
  return { price, reconciledPreviousAmount: current?.unit_amount === 2000 };
}

async function updateFairPolicy(priceIds: string[]) {
  const pool = getPostgresPool();
  if (!pool) throw new Error('Database unavailable for policy activation.');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='10s'");
    const column = await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema='private' AND table_name='galx_plan_checkouts' AND column_name='plan_key'");
    if (!column.rowCount) throw new Error('The plan-aware billing migration is not applied.');
    const policy = (await db.query('SELECT mode,limits,paid_price_ids FROM private.galx_sites_fair_policy WHERE singleton FOR UPDATE')).rows[0];
    if (!policy || policy.mode !== 'enforce' || !policy.limits) throw new Error('The production fair-use policy is not enforceable.');
    const existing = Array.isArray(policy.paid_price_ids) ? policy.paid_price_ids : [];
    const changed = existing.length !== priceIds.length || existing.some((id: string, index: number) => id !== priceIds[index]);
    if (changed) {
      await db.query('UPDATE private.galx_sites_fair_policy SET paid_price_ids=$1,revision=revision+1,updated_at=now() WHERE singleton', [priceIds]);
      await db.query('UPDATE private.galx_sites_fair_pools SET revision=revision+1,snapshot=NULL,refresh_token=NULL,refresh_until=NULL');
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    db.release();
    await pool.end();
  }
}

await verifyWebhook();
const pro = await reconcilePro();
const imagePrices = [];
for (const plan of IMAGE_PLAN_CATALOG) imagePrices.push(await activateImagePlan(plan));
await updateFairPolicy([pro.price.id]);
const portals = await stripe.billingPortal.configurations.list({ active: true, limit: 100 }, requestOptions);
const portal = portals.data.find(item => item.metadata?.galxPlan === 'pro-v1');
if (portals.has_more || !portal || !portal.features.subscription_cancel.enabled || portal.features.subscription_cancel.mode !== 'at_period_end' || portal.features.subscription_update.enabled) throw new Error('The restricted billing portal is not ready.');
const tax = await stripe.tax.registrations.list({ status: 'active', limit: 100 }, requestOptions);
console.log(JSON.stringify({
  mode: 'live', catalogStatus: 'active', webhookReady: true,
  plansActivated: ['pro', ...IMAGE_PLAN_CATALOG.map(plan => plan.publicId)],
  proPriceReconciledToPublishedAmount: pro.reconciledPreviousAmount,
  billingPortalReady: true,
  activeTaxRegistrations: tax.data.length,
  automaticTaxEnabled: false,
  customersCreated: 0, subscriptionsCreated: 0, invoicesCreated: 0, paymentsCreated: 0, entitlementsCreated: 0,
}, null, 2));
