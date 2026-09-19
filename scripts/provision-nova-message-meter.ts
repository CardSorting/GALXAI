/** Provision the approved live Nova completed-message meter and metered Price. */
import Stripe from 'stripe';
import {
  NOVA_DEVELOPER_PRODUCT_ID,
  NOVA_MESSAGE_PRICE_LOOKUP_KEY,
} from '../src/lib/billing/plan-subscription';
import { NOVA_MESSAGE_ECONOMICS } from '../src/lib/billing/message-economics';
import { MESSAGE_METER_RELEASE, assertMessageMeterProvisionable } from '../src/lib/billing/message-meter-release';

const secretKey = process.env.STRIPE_SECRET_KEY || '';
if (!/^(sk|rk)_live_[A-Za-z0-9]+$/.test(secretKey)) throw new Error('A valid live Stripe key is required');

assertMessageMeterProvisionable({
  publicRateApproved: true,
  requestLimitsApproved: true,
  failureBehaviorApproved: true,
  spendControlsApproved: true,
  unitAmountUsd: NOVA_MESSAGE_ECONOMICS.candidateUnitAmountUsd,
});

const stripe = new Stripe(secretKey, { apiVersion: '2026-07-29.dahlia', maxNetworkRetries: 0, timeout: 10000 });
const product = await stripe.products.retrieve(NOVA_DEVELOPER_PRODUCT_ID);
if (!product.livemode || !product.active) throw new Error('Nova Developer Access product is not active live');

const meters = await stripe.billing.meters.list({ limit: 100 });
if (meters.has_more) throw new Error('Meter list is incomplete; refusing ambiguous live provisioning');
let meter = meters.data.find(item => item.event_name === MESSAGE_METER_RELEASE.meterLookupKey);
if (meter && (!meter.livemode || meter.status !== 'active' || meter.default_aggregation.formula !== 'sum' ||
  meter.customer_mapping.type !== 'by_id' || meter.customer_mapping.event_payload_key !== 'stripe_customer_id' ||
  meter.value_settings.event_payload_key !== 'value')) {
  throw new Error('Existing Nova message meter does not match the approved contract');
}
if (!meter) {
  meter = await stripe.billing.meters.create({
    display_name: 'GALX Nova completed messages',
    event_name: MESSAGE_METER_RELEASE.meterLookupKey,
    default_aggregation: { formula: 'sum' },
    customer_mapping: { type: 'by_id', event_payload_key: 'stripe_customer_id' },
    value_settings: { event_payload_key: 'value' },
  }, { idempotencyKey: 'galx-nova-message-meter-v1' });
}

const prices = await stripe.prices.list({ lookup_keys: [NOVA_MESSAGE_PRICE_LOOKUP_KEY], limit: 10 });
if (prices.has_more || prices.data.length > 1) throw new Error('Nova message Price lookup key is ambiguous');
let price = prices.data[0];
if (price && (price.product !== product.id || price.metadata?.galxContractVersion !== 'nova-message-v1' ||
  price.unit_amount !== NOVA_MESSAGE_ECONOMICS.candidateUnitAmountUsd * 100 || price.currency !== 'usd' ||
  price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 ||
  price.recurring.usage_type !== 'metered' || price.recurring.meter !== meter.id)) {
  throw new Error('Existing Nova message Price does not match the approved contract');
}
if (!price) {
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: NOVA_MESSAGE_ECONOMICS.candidateUnitAmountUsd * 100,
    currency: 'usd',
    billing_scheme: 'per_unit',
    recurring: { interval: 'month', usage_type: 'metered', meter: meter.id },
    lookup_key: NOVA_MESSAGE_PRICE_LOOKUP_KEY,
    transfer_lookup_key: true,
    nickname: 'Nova completed message',
    metadata: {
      galxContractVersion: 'nova-message-v1',
      meterLookupKey: MESSAGE_METER_RELEASE.meterLookupKey,
      monthlySpendCapUsd: String(NOVA_MESSAGE_ECONOMICS.monthlySpendCapUsd),
      maxInputTokens: String(NOVA_MESSAGE_ECONOMICS.guardrails.maxInputTokens),
      maxOutputTokens: String(NOVA_MESSAGE_ECONOMICS.guardrails.maxOutputTokens),
    },
  }, { idempotencyKey: 'galx-nova-message-price-v1-2-cents' });
}

if (!price.active || !price.livemode || price.product !== product.id || price.recurring?.meter !== meter.id) {
  throw new Error('Nova message Price readback does not match the approved contract');
}

console.log(JSON.stringify({
  meter: { id: meter.id, eventName: meter.event_name, status: meter.status, livemode: meter.livemode },
  price: { id: price.id, lookupKey: NOVA_MESSAGE_PRICE_LOOKUP_KEY, unitAmountUsd: NOVA_MESSAGE_ECONOMICS.candidateUnitAmountUsd, usageType: price.recurring?.usage_type, meter: price.recurring?.meter },
  contractVersion: NOVA_MESSAGE_ECONOMICS.contractVersion,
  monthlySpendCapUsd: NOVA_MESSAGE_ECONOMICS.monthlySpendCapUsd,
}));
