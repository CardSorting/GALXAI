/** Read-only live verification for the Image Studio billing catalog. */
import Stripe from 'stripe';
import { getPostgresPool } from '../src/lib/db/postgres';
import { IMAGE_PLAN_CATALOG } from '../src/lib/billing/image-plan-catalog';
import { PRO_LOOKUP_KEY, PRO_PRODUCT_ID } from '../src/lib/billing/plan-subscription';
import { PRO_PLAN } from '../src/lib/billing/pro-plan';

const secretKey = process.env.STRIPE_SECRET_KEY || '';
if (!/^(sk|rk)_live_[A-Za-z0-9]+$/.test(secretKey)) throw new Error('A valid live Stripe key is required');
const stripe = new Stripe(secretKey, { apiVersion: '2026-07-29.dahlia', maxNetworkRetries: 0, timeout: 10_000 });
const requestOptions = { timeout: 10_000, maxNetworkRetries: 0 } as const;
const requiredWebhookEvents = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired', 'invoice.paid', 'invoice.payment_failed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'] as const;
const objectId = (value: unknown) => typeof value === 'string' ? value : (value as { id?: string } | null)?.id;

async function readPrice(lookupKey: string) {
  const result = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 2 }, requestOptions);
  if (result.has_more || result.data.length !== 1) throw new Error(`Active lookup key is not unique: ${lookupKey}`);
  return result.data[0];
}

const proProduct = await stripe.products.retrieve(PRO_PRODUCT_ID, {}, requestOptions);
const proPrice = await readPrice(PRO_LOOKUP_KEY);
if (!proProduct.livemode || !proProduct.active || proProduct.metadata.galxPlan !== 'pro-v1' || objectId(proPrice.product) !== PRO_PRODUCT_ID || proPrice.unit_amount !== PRO_PLAN.monthlyPriceUsd * 100 || proPrice.metadata.catalogStatus !== 'active' || proPrice.metadata.checkoutEnabled !== 'true') throw new Error('GALX Pro live contract verification failed.');

const image = [];
const imagePriceIds: string[] = [];
for (const plan of IMAGE_PLAN_CATALOG) {
  const product = await stripe.products.retrieve(plan.stripeProductId, {}, requestOptions);
  const price = await readPrice(plan.stripeLookupKey);
  if (!product.livemode || !product.active || product.name !== plan.name || product.metadata.galxPlan !== plan.planKey || objectId(price.product) !== product.id || price.unit_amount !== plan.monthlyPriceUsd * 100 || price.currency !== 'usd' || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 || price.metadata.galxPlan !== plan.planKey || price.metadata.catalogStatus !== 'active' || price.metadata.checkoutEnabled !== 'true') throw new Error(`${plan.id} live contract verification failed.`);
  image.push({ id: plan.id, monthlyUsd: plan.monthlyPriceUsd, active: true });
  imagePriceIds.push(price.id);
}

const endpoints = await stripe.webhookEndpoints.list({ limit: 100 }, requestOptions);
const webhook = endpoints.data.find(item => item.url === 'https://galx.ai/api/stripe/webhook' && item.status === 'enabled' && item.livemode);
if (endpoints.has_more || !webhook || !(webhook.enabled_events.includes('*') || requiredWebhookEvents.every(event => webhook.enabled_events.includes(event)))) throw new Error('Live billing webhook verification failed.');
const subscriptions = await stripe.subscriptions.list({ status: 'all', limit: 100 }, requestOptions);
if (subscriptions.has_more) throw new Error('Subscription verification is incomplete.');
const activeSubscriptions = subscriptions.data.filter(row => !['canceled', 'incomplete_expired'].includes(row.status));
const tax = await stripe.tax.registrations.list({ status: 'active', limit: 100 }, requestOptions);
const pool = getPostgresPool();
if (!pool) throw new Error('Database unavailable.');
const policy = (await pool.query('SELECT mode,revision,paid_price_ids FROM private.galx_sites_fair_policy WHERE singleton')).rows[0];
await pool.end();
if (!policy || policy.mode !== 'enforce' || policy.paid_price_ids.length !== 4 || !policy.paid_price_ids.includes(proPrice.id) || imagePriceIds.some(id => !policy.paid_price_ids.includes(id))) throw new Error('Production paid-price allowlist verification failed.');
console.log(JSON.stringify({ mode: 'live', catalogStatus: 'active', pro: { monthlyUsd: PRO_PLAN.monthlyPriceUsd, active: true }, imagePlans: image, activeSubscriptions: activeSubscriptions.length, webhookReady: true, fairPolicy: { mode: policy.mode, revision: Number(policy.revision), paidPriceCount: policy.paid_price_ids.length }, activeTaxRegistrations: tax.data.length, automaticTaxEnabled: false }, null, 2));
