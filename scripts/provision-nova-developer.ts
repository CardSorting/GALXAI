/** Private operator provisioning. Creates only the Nova Developer Access
 * product and recurring access Price; it never creates customers, payments,
 * subscriptions, usage balances or API keys. */
import Stripe from 'stripe';
import { DEVELOPER_ACCESS } from '../src/lib/billing/pro-plan';
import { NOVA_DEVELOPER_LOOKUP_KEY, NOVA_DEVELOPER_PRODUCT_ID } from '../src/lib/billing/plan-subscription';
import { USAGE_PRICING } from '../src/lib/billing/usage-pricing';

const secretKey = process.env.STRIPE_SECRET_KEY || '';
if (!/^(sk|rk)_live_[A-Za-z0-9]+$/.test(secretKey)) throw new Error('A valid live Stripe key is required');

const stripe = new Stripe(secretKey, { apiVersion: '2026-07-29.dahlia', maxNetworkRetries: 0, timeout: 10000 });
const requiredWebhookEvents = [
  'checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed', 'checkout.session.expired',
  'invoice.paid', 'invoice.payment_failed',
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
  'charge.refunded',
];
const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
if (webhookEndpoints.has_more || !webhookEndpoints.data.some(endpoint =>
  endpoint.url === 'https://galx.ai/api/stripe/webhook' && endpoint.status === 'enabled' && endpoint.livemode &&
  requiredWebhookEvents.every(event => endpoint.enabled_events.includes('*') || endpoint.enabled_events.includes(event as any)))) {
  throw new Error('Required production Stripe webhook is not ready; no Nova objects were provisioned');
}
const portalConfigurations = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
const portalMatches = portalConfigurations.data.filter(configuration => configuration.metadata?.galxPlan === 'pro-v1');
if (portalConfigurations.has_more || portalMatches.length !== 1 || !portalMatches[0].features.subscription_cancel.enabled ||
  portalMatches[0].features.subscription_cancel.mode !== 'at_period_end' || !portalMatches[0].features.payment_method_update.enabled ||
  !portalMatches[0].features.invoice_history.enabled || portalMatches[0].features.subscription_update.enabled) {
  throw new Error('Existing subscription management portal is not ready; no Nova objects were provisioned');
}
const productId = NOVA_DEVELOPER_PRODUCT_ID;
const priceAmount = DEVELOPER_ACCESS.monthlyPriceUsd * 100;

let product: Stripe.Product;
try {
  product = await stripe.products.retrieve(productId);
} catch (error) {
  if ((error as { statusCode?: number }).statusCode !== 404) throw error;
  product = await stripe.products.create({
    id: productId,
    name: DEVELOPER_ACCESS.name,
    description: 'Recurring API access to GALX Nova. Usage is intended to be billed per message; no usage credits are included.',
    metadata: {
      galxPlan: DEVELOPER_ACCESS.planKey,
      usagePricingStatus: USAGE_PRICING.status,
      usageBasis: USAGE_PRICING.basis,
      includedUsageCreditsUsd: String(DEVELOPER_ACCESS.includedUsageCreditsUsd),
    },
  }, { idempotencyKey: 'galx-nova-developer-product-v1' });
}
if (!product.active || product.name !== DEVELOPER_ACCESS.name || product.metadata.galxPlan !== DEVELOPER_ACCESS.planKey) {
  throw new Error('Existing Nova Developer Access product needs review');
}

product = await stripe.products.update(product.id, {
  metadata: {
    ...product.metadata,
    usagePricingStatus: USAGE_PRICING.status,
    usageBasis: USAGE_PRICING.basis,
    includedUsageCreditsUsd: String(DEVELOPER_ACCESS.includedUsageCreditsUsd),
  },
});

const prices = await stripe.prices.list({ lookup_keys: [NOVA_DEVELOPER_LOOKUP_KEY], limit: 10 });
if (prices.has_more || prices.data.length > 1) throw new Error('Nova Developer Access lookup key has ambiguous Stripe Prices');
let price = prices.data[0];
if (price && (price.product !== product.id || price.metadata.galxPlan !== DEVELOPER_ACCESS.planKey || price.unit_amount !== priceAmount || price.currency !== 'usd' ||
  price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 || price.recurring.usage_type !== 'licensed')) {
  throw new Error('Existing Nova Developer Access Price does not match the approved contract');
}
if (!price) {
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: priceAmount,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: NOVA_DEVELOPER_LOOKUP_KEY,
    transfer_lookup_key: true,
    metadata: {
      galxPlan: DEVELOPER_ACCESS.planKey,
      usagePricingStatus: USAGE_PRICING.status,
      usageBasis: USAGE_PRICING.basis,
      includedUsageCreditsUsd: String(DEVELOPER_ACCESS.includedUsageCreditsUsd),
    },
  }, { idempotencyKey: 'galx-nova-developer-price-v1-50-month' });
}
if (!price.active || !price.livemode || price.product !== product.id || price.metadata.galxPlan !== DEVELOPER_ACCESS.planKey || price.unit_amount !== priceAmount || price.currency !== 'usd' ||
  price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 || price.recurring.usage_type !== 'licensed') {
  throw new Error('Nova Developer Access Price readback does not match the approved contract');
}

console.log(JSON.stringify({
  product: product.id,
  price: price.id,
  lookupKey: NOVA_DEVELOPER_LOOKUP_KEY,
  monthlyUsd: DEVELOPER_ACCESS.monthlyPriceUsd,
  recurring: true,
  usageCreditsIncludedUsd: 0,
  usageBilledSeparately: true,
  customersCreated: 0,
  subscriptionsCreated: 0,
  paymentsCreated: 0,
}));
