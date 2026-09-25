/** Pure provider fixtures: no credentials, network, database or payment writes. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type Stripe from 'stripe';
import { readSubscriptionSummary } from '../src/lib/billing/subscription-summary';
import { readImagePlanSummary } from '../src/lib/billing/image-allowance';
import { approvedAllowanceFor, IMAGE_ALLOWANCE_CONFIGURATION, imagePlanAllowanceApproved, type ImageAllowanceConfiguration } from '../src/lib/billing/image-allowance-config';
import { billingPortalConfiguration } from '../src/lib/billing/portal';
import { IMAGE_PLAN_OFFERS } from '../src/lib/data/pricingSummary';
import { parsePlanStatus } from '../src/lib/billing/plan-status';
import { BILLING_WEBHOOK_EVENTS } from '../src/lib/billing/webhookEvents';
import { stripeInvoiceUrl } from '../src/lib/billing/account';

const customer = 'cus_owner', price = 'price_pro';
const end = Date.parse('2026-10-15T12:00:00Z') / 1000;
const approvedImageAllowanceFixture = IMAGE_ALLOWANCE_CONFIGURATION;
const unapprovedCreatorConfiguration = {
  ...IMAGE_ALLOWANCE_CONFIGURATION,
  plans: { ...IMAGE_ALLOWANCE_CONFIGURATION.plans, 'creator-v1': { status: 'UNAPPROVED' as const } },
} satisfies ImageAllowanceConfiguration;
const subscription = (extra: Record<string, unknown> = {}) => ({
  id: 'sub_private', customer, status: 'active', cancel_at_period_end: false, cancel_at: null,
  metadata: { diagnostic: 'PRIVATE_SENTINEL' }, pause_collection: null,
  items: { has_more: false, data: [{ price: { id: price }, current_period_end: end }] }, ...extra,
});
function provider(data: unknown[], more = false) {
  return { subscriptions: { list: async (input: unknown, options: unknown) => {
    assert.deepEqual(input, { customer, status: 'all', limit: 100 });
    assert.deepEqual(options, { timeout: 4000, maxNetworkRetries: 0 });
    return { data, has_more: more };
  } } } as unknown as Stripe;
}

test('subscription display distinguishes active and scheduled cancellation without leaking provider records', async () => {
  const active = await readSubscriptionSummary(provider([subscription()]), customer, [price]);
  assert.deepEqual(active, { state: 'active', periodEnd: '2026-10-15T12:00:00.000Z', endsAt: null });
  const ending = await readSubscriptionSummary(provider([subscription({ cancel_at_period_end: true })]), customer, [price]);
  assert.deepEqual(ending, { ...active, state: 'ending', endsAt: active.periodEnd });
  const custom = await readSubscriptionSummary(provider([subscription({ cancel_at: end - 86400 })]), customer, [price]);
  assert.equal(custom.endsAt, '2026-10-14T12:00:00.000Z');
  assert.doesNotMatch(JSON.stringify([active, ending, custom]), /sub_private|cus_owner|price_pro|PRIVATE_SENTINEL|metadata/);
});

test('payment, pause, canceled and pending states do not become paid access', async () => {
  for (const status of ['past_due', 'unpaid', 'incomplete']) {
    assert.deepEqual(await readSubscriptionSummary(provider([subscription({ status })]), customer, [price]), { state: 'payment_required', periodEnd: null, endsAt: null });
  }
  for (const change of [{ status: 'paused' }, { pause_collection: { behavior: 'void' } }]) {
    assert.equal((await readSubscriptionSummary(provider([subscription(change)]), customer, [price])).state, 'paused');
  }
  assert.equal((await readSubscriptionSummary(provider([subscription({ status: 'trialing' })]), customer, [price])).state, 'processing');
  assert.equal((await readSubscriptionSummary(provider([subscription({ status: 'canceled' })]), customer, [price])).state, 'canceled');
  assert.equal((await readSubscriptionSummary(provider([subscription({ status: 'incomplete_expired' })]), customer, [price])).state, 'canceled');
});

test('ambiguous, foreign, truncated or unavailable provider evidence fails closed', async () => {
  for (const [data, more] of [
    [[subscription()], true], [[subscription(), subscription()], false],
    [[subscription({ customer: 'cus_other' })], false],
    [[subscription({ items: { has_more: true, data: [] } })], false],
    [[subscription({ items: { has_more: false, data: [{ price: { id: price }, current_period_end: NaN }] } })], false],
    [[subscription({ status: 'PRIVATE_SENTINEL' })], false],
  ] as [unknown[], boolean][]) assert.equal((await readSubscriptionSummary(provider(data, more), customer, [price])).state, 'unavailable');
  const failed = { subscriptions: { list: async () => { throw Error('PRIVATE_SENTINEL'); } } } as unknown as Stripe;
  assert.equal((await readSubscriptionSummary(failed, customer, [price])).state, 'unavailable');
  assert.equal((await readSubscriptionSummary(failed, undefined, [price])).state, 'none');
  assert.equal((await readSubscriptionSummary(failed, customer, [])).state, 'unavailable');
  assert.equal((await readSubscriptionSummary(provider([subscription({ items: { has_more: false, data: [{ price: { id: 'price_unrelated' } }] } })]), customer, [price])).state, 'none');
});

const configuration = () => ({ id: 'bpc_private', active: true, metadata: { galxPlan: 'pro-v1' }, features: {
  invoice_history: { enabled: true }, payment_method_update: { enabled: true },
  subscription_cancel: { enabled: true, mode: 'at_period_end' }, subscription_update: { enabled: false },
} });
const portals = (data: unknown[], more = false) => ({ billingPortal: { configurations: { list: async () => ({ data, has_more: more }) } } }) as unknown as Stripe;

test('all billing entry points can use only the unique restricted cancellation portal', async () => {
  assert.equal(await billingPortalConfiguration(portals([configuration()])), 'bpc_private');
  for (const [data, more] of [[[], false], [[configuration(), configuration()], false], [[configuration()], true]] as [unknown[], boolean][]) {
    await assert.rejects(billingPortalConfiguration(portals(data, more)), /temporarily unavailable/);
  }
  for (const field of ['invoice_history', 'payment_method_update', 'subscription_cancel', 'subscription_update'] as const) {
    const config = configuration(); config.features[field].enabled = field === 'subscription_update';
    await assert.rejects(billingPortalConfiguration(portals([config])), /temporarily unavailable/);
  }
  const immediate = configuration(); immediate.features.subscription_cancel.mode = 'immediately';
  await assert.rejects(billingPortalConfiguration(portals([immediate])), /temporarily unavailable/);
});

test('browser contract allowlists display fields and rejects malformed status', () => {
  const status = { access: 'included', checkoutAvailable: false, hasPaymentProfile: false, offers: [
    { id: 'pro', name: 'GALX Pro', audience: 'For the GALX Sites workspace.', monthlyPriceUsd: 10, checkoutAvailable: false, allowance: null },
    ...IMAGE_PLAN_OFFERS.map(plan => ({ id: plan.id, name: plan.name, audience: plan.audience,
      monthlyPriceUsd: plan.monthlyPrice, checkoutAvailable: false, allowance: plan.allowance })),
  ], subscription: { state: 'none', periodEnd: null, endsAt: null },
  imageSubscription: { state: 'none', plan: null, planName: null, allowanceConfigured: false, periodEnd: null, endsAt: null } };
  assert.deepEqual(parsePlanStatus({ ...status, secret: 'PRIVATE_SENTINEL', subscription: { ...status.subscription, customer: 'PRIVATE_SENTINEL' } }), status);
  assert.equal(parsePlanStatus({ ...status, subscription: { ...status.subscription, periodEnd: 'bad date' } }), null);
  assert.equal(parsePlanStatus({ ...status, subscription: { ...status.subscription, state: 'PRIVATE_SENTINEL' } }), null);
  assert.equal(parsePlanStatus({ ...status, checkoutAvailable: 'true' }), null);
  assert.equal(parsePlanStatus({ ...status, offers: [{ ...status.offers[1], id: 'creator' }] }), null);
});

test('image allowance activation uses the canonical approved configuration and fails closed when invalid', async () => {
  for (const [planKey, monthlyUnits] of [['creator-v1', 100], ['studio-v1', 500], ['team-v1', 2_000]] as const) {
    assert.equal(imagePlanAllowanceApproved(IMAGE_ALLOWANCE_CONFIGURATION, planKey), true);
    assert.deepEqual(approvedAllowanceFor(approvedImageAllowanceFixture, planKey), {
      status: 'APPROVED', monthlyUnits, standardOutputUnits: 1, hdOutputUnits: 2,
    });
  }
  assert.equal(imagePlanAllowanceApproved(unapprovedCreatorConfiguration, 'creator-v1'), false);
  assert.equal(imagePlanAllowanceApproved({ ...approvedImageAllowanceFixture, plans: {
    ...approvedImageAllowanceFixture.plans,
    'creator-v1': { status: 'APPROVED', monthlyUnits: 0 },
  } } as unknown as ImageAllowanceConfiguration, 'creator-v1'), false);
  assert.equal(imagePlanAllowanceApproved({ ...approvedImageAllowanceFixture, plans: {
    ...approvedImageAllowanceFixture.plans,
    'creator-v1': { status: 'APPROVED', monthlyUnits: 2_147_483_648 },
  } } as unknown as ImageAllowanceConfiguration, 'creator-v1'), false);
  assert.equal(imagePlanAllowanceApproved({ ...approvedImageAllowanceFixture,
    outputUnits: { standard: 1, hd: 32_768 },
  } as unknown as ImageAllowanceConfiguration, 'creator-v1'), false);
  assert.equal(imagePlanAllowanceApproved(null as unknown as ImageAllowanceConfiguration, 'creator-v1'), false);
});

test('Image billing summary maps internal keys without leaking them and rejects unapproved creation', async () => {
  const expiry = new Date(Date.now() + 60_000);
  const pool = { query: async (sql: string) => sql.includes('FROM private.galx_plan_subscriptions')
    ? { rows: [{ plan_key: 'creator-v1', status: 'active', period_end: expiry, period_is_current: true, cancel_at_period_end: false }] }
    : { rows: [] } } as any;
  const summary = await readImagePlanSummary('owner-fixture', pool, approvedImageAllowanceFixture);
  assert.deepEqual(summary, { state: 'active', plan: 'workshop', planName: 'Workshop',
    periodEnd: expiry.toISOString(), endsAt: null, allowanceConfigured: true });
  assert.doesNotMatch(JSON.stringify(summary), /creator-v1|team-v1|stripe|price_/i);
  assert.equal((await readImagePlanSummary('owner-fixture', pool, unapprovedCreatorConfiguration)).allowanceConfigured, false);

  const expiredPool = { query: async () => ({ rows: [{ plan_key: 'studio-v1', status: 'active', period_end: expiry,
    period_is_current: false, cancel_at_period_end: false }] }) } as any;
  assert.equal((await readImagePlanSummary('owner-fixture', expiredPool)).state, 'unavailable');
});

test('readiness includes lifecycle delivery and invoice links forbid alternate ports and credentials', () => {
  for (const event of ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed']) assert(BILLING_WEBHOOK_EVENTS.includes(event as never));
  assert.equal(new Set(BILLING_WEBHOOK_EVENTS).size, BILLING_WEBHOOK_EVENTS.length);
  for (const url of ['https://invoice.stripe.com:8443/x', 'https://user@invoice.stripe.com/x', 'https://invoice.stripe.com.evil.test/x', 'javascript:alert(1)']) assert.equal(stripeInvoiceUrl(url), null);
  assert.equal(stripeInvoiceUrl('https://invoice.stripe.com/i/fixture'), 'https://invoice.stripe.com/i/fixture');
});
