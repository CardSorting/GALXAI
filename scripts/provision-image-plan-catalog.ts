/**
 * Private operator provisioning for the Image Studio catalog.
 *
 * This command creates or verifies only the reviewed Products and recurring
 * Prices. Newly created entries remain inactive; production activation is a
 * separate explicit command. It never creates customers, subscriptions,
 * invoices, payments, tax records, or entitlements.
 */
import Stripe from 'stripe';
import { IMAGE_PLAN_CATALOG } from '../src/lib/billing/image-plan-catalog';

const secretKey = process.env.STRIPE_SECRET_KEY || '';
if (!/^(sk|rk)_live_[A-Za-z0-9]+$/.test(secretKey)) {
  throw new Error('A valid live Stripe key is required');
}

const stripe = new Stripe(secretKey, {
  apiVersion: '2026-07-29.dahlia',
  maxNetworkRetries: 0,
  timeout: 10_000,
});

const requestOptions = { timeout: 10_000, maxNetworkRetries: 0 } as const;
const version = '2026-09-20-max-rename-v1';
const metadata = (plan: typeof IMAGE_PLAN_CATALOG[number]) => ({
  galxPlan: plan.planKey,
  galxSurface: 'images',
  catalogStatus: plan.catalogStatus,
  checkoutEnabled: String(plan.checkoutEnabled),
  privateMode: 'owner-scoped',
  pricingVersion: version,
});

const isNotFound = (error: unknown) => (error as { statusCode?: number })?.statusCode === 404;

const provision = async (plan: typeof IMAGE_PLAN_CATALOG[number]) => {
  let product: Stripe.Product;
  try {
    product = await stripe.products.retrieve(plan.stripeProductId, {}, requestOptions);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    product = await stripe.products.create({
      id: plan.stripeProductId,
      name: plan.name,
      description: `${plan.audience} Image Studio subscription for one account.`,
      active: false,
      metadata: metadata(plan),
    }, { ...requestOptions, idempotencyKey: `galx-images-${plan.id}-product-${version}` });
  }

  const legacyName = plan.id === 'max' ? 'GALX Images — Team' : null;
  if (product.id !== plan.stripeProductId || ![plan.name, legacyName].includes(product.name) ||
      product.metadata.galxPlan !== plan.planKey || product.metadata.catalogStatus !== plan.catalogStatus) {
    throw new Error(`Existing ${plan.id} product does not match the approved image catalog contract`);
  }
  product = await stripe.products.update(product.id, { metadata: { ...product.metadata, ...metadata(plan) } }, requestOptions);

  const [activePrices, inactivePrices] = await Promise.all([
    stripe.prices.list({ lookup_keys: [plan.stripeLookupKey], active: true, limit: 10 }, requestOptions),
    stripe.prices.list({ lookup_keys: [plan.stripeLookupKey], active: false, limit: 10 }, requestOptions),
  ]);
  const matches = [...activePrices.data, ...inactivePrices.data];
  if (activePrices.has_more || inactivePrices.has_more || matches.length > 1) {
    throw new Error(`Image plan ${plan.id} has an ambiguous Stripe lookup key`);
  }

  const amount = plan.monthlyPriceUsd * 100;
  let price = matches[0];
  if (price && (price.product !== product.id || price.unit_amount !== amount || price.currency !== 'usd' ||
      price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 ||
      price.recurring.usage_type !== 'licensed' || price.metadata.galxPlan !== plan.planKey ||
      price.metadata.catalogStatus !== plan.catalogStatus)) {
    if (plan.id === 'max' && price.unit_amount === 7500) {
      throw new Error('MAX still has the retired $75 Price; run npm run stripe:activate:image-plans -- --activate to rotate it safely');
    }
    throw new Error(`Existing ${plan.id} Price does not match the approved billing contract`);
  }
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'usd',
      recurring: { interval: 'month' },
      lookup_key: plan.stripeLookupKey,
      transfer_lookup_key: true,
      active: false,
      nickname: `${plan.id} monthly`,
      metadata: metadata(plan),
    }, { ...requestOptions, idempotencyKey: `galx-images-${plan.id}-price-${version}` });
  }
  if (!price.livemode || price.product !== product.id || price.unit_amount !== amount ||
      price.currency !== 'usd' || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 ||
      price.recurring.usage_type !== 'licensed' || price.metadata.galxPlan !== plan.planKey ||
      price.metadata.catalogStatus !== plan.catalogStatus) {
    throw new Error(`Stripe readback for ${plan.id} Price does not match the approved billing contract`);
  }

  return {
    id: plan.id,
    planKey: plan.planKey,
    product: product.id,
    price: price.id,
    lookupKey: plan.stripeLookupKey,
    monthlyUsd: plan.monthlyPriceUsd,
    active: price.active,
    checkoutEnabled: plan.checkoutEnabled,
  };
};

const results = [];
for (const plan of IMAGE_PLAN_CATALOG) results.push(await provision(plan));

console.log(JSON.stringify({
  mode: 'live',
  catalogStatus: 'active',
  productsCreatedOrVerified: results.length,
  pricesCreatedOrVerified: results.length,
  customersCreated: 0,
  subscriptionsCreated: 0,
  paymentsCreated: 0,
  entitlementsCreated: 0,
  results,
}, null, 2));
