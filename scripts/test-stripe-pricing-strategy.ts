import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { DEVELOPER_ACCESS, PREPAID_DEVELOPER_CHECKOUT_ENABLED, PRO_PLAN } from '../src/lib/billing/pro-plan';
import { createImagePlanCheckout, developerPrice, imagePlanPrice } from '../src/lib/billing/plan-subscription';
import { createAccountCheckout } from '../src/lib/billing/checkout';
import { readTopUpQuote } from '../src/lib/billing/quote';
import { GET as stripeConfig } from '../src/app/api/stripe/config/route';
import { GET as seoRates } from '../src/app/api/seo/rates/route';
import { GET as computePool } from '../src/app/api/compute/pool/route';
import { POST as stripeCheckout } from '../src/app/api/stripe/checkout/route';
import { POST as walletEstimate } from '../src/app/api/wallet/estimate/route';
import { GET as walletUsage } from '../src/app/api/wallet/usage/route';
import { USAGE_PRICING } from '../src/lib/billing/usage-pricing';
import { IMAGE_PLAN_CATALOG } from '../src/lib/billing/image-plan-catalog';
import { IMAGE_ALLOWANCE_CONFIGURATION, type ImageAllowanceConfiguration } from '../src/lib/billing/image-allowance-config';
import { IMAGE_PLAN_OFFERS } from '../src/lib/data/pricingSummary';

assert.equal(PRO_PLAN.monthlyPriceUsd, 10);
assert.equal(PRO_PLAN.interval, 'month');
assert.equal(DEVELOPER_ACCESS.monthlyPriceUsd, 50);
assert.equal(DEVELOPER_ACCESS.interval, 'month');
assert.equal(DEVELOPER_ACCESS.checkoutEnabled, false);
assert.equal(DEVELOPER_ACCESS.automaticActivation, true);
assert.equal(DEVELOPER_ACCESS.usageBilledSeparately, true);
assert.equal(DEVELOPER_ACCESS.includedUsageCreditsUsd, 0);
assert.equal(PREPAID_DEVELOPER_CHECKOUT_ENABLED, false);
assert.equal(USAGE_PRICING.status, 'published');
assert.equal(USAGE_PRICING.ratesPublished, true);
assert.equal(USAGE_PRICING.basis, 'message');
assert.equal(USAGE_PRICING.unit, 'message');
assert.equal(USAGE_PRICING.path, '/pricing/usage');
assert.equal('rates' in USAGE_PRICING, false);
assert.equal('prices' in USAGE_PRICING, false);
assert.deepEqual(IMAGE_PLAN_CATALOG.map(plan => [plan.id, plan.monthlyPriceUsd, plan.stripeLookupKey]), [
  ['creator', 15, 'galx_images_creator_monthly_v1'],
  ['studio', 35, 'galx_images_studio_monthly_v1'],
  ['max', 200, 'galx_images_team_monthly_v1'],
]);
assert(IMAGE_PLAN_CATALOG.every(plan => plan.catalogStatus === 'active' && plan.checkoutEnabled === true));
assert.deepEqual(IMAGE_PLAN_OFFERS.map(plan => [plan.id, plan.monthlyPrice, plan.allowance?.monthlyUnits,
  plan.allowance?.standardOutputUnits, plan.allowance?.hdOutputUnits]), [
  ['workshop', 15, 100, 1, 2], ['studio', 35, 500, 1, 2], ['max', 200, 2_000, 1, 2],
]);
assert.doesNotMatch(JSON.stringify(IMAGE_PLAN_OFFERS), /stripeProductId|stripeLookupKey|planKey|price_/);

const price = { id: 'price_nova_developer', product: 'galx_nova_developer_access_v1', metadata: { galxPlan: 'nova-developer-v1' }, currency: 'usd', unit_amount: 5000,
  recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } } as any;
const priceProvider = { prices: { list: async (input: any) => {
  assert.deepEqual(input, { lookup_keys: [DEVELOPER_ACCESS.lookupKey], active: true, limit: 2 });
  return { data: [price], has_more: false };
} } } as any;
assert.equal((await developerPrice(priceProvider)).id, price.id);

const creator = IMAGE_PLAN_CATALOG.find(plan => plan.id === 'creator')!;
const approvedAllowanceFixture = IMAGE_ALLOWANCE_CONFIGURATION;
const unapprovedCreatorConfiguration = {
  ...IMAGE_ALLOWANCE_CONFIGURATION,
  plans: { ...IMAGE_ALLOWANCE_CONFIGURATION.plans, 'creator-v1': { status: 'UNAPPROVED' as const } },
} satisfies ImageAllowanceConfiguration;
const imagePrice = { id: 'price_creator', product: creator.stripeProductId, metadata: { galxPlan: creator.planKey, galxPublicPlan: creator.publicId, catalogStatus: 'active', checkoutEnabled: 'true' }, currency: 'usd', unit_amount: creator.monthlyPriceUsd * 100,
  recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } } as any;
const imagePriceProvider = { prices: { list: async (input: any) => {
  assert.deepEqual(input, { lookup_keys: [creator.stripeLookupKey], active: true, limit: 2 });
  return { data: [imagePrice], has_more: false };
} }, products: { retrieve: async (id: string, _options: unknown, _requestOptions: unknown) => {
  assert.equal(id, creator.stripeProductId);
  return { id, active: true, name: creator.name,
    metadata: { galxPlan: creator.planKey, galxPublicPlan: creator.publicId, galxSurface: 'images' } };
} } } as any;
let unapprovedStripeCalls = 0;
const unapprovedProvider = new Proxy({}, { get: () => { unapprovedStripeCalls += 1; throw new Error('Stripe must not be called'); } }) as any;
const pool = new Proxy({}, { get: () => { unapprovedStripeCalls += 1; throw new Error('Database must not be called'); } }) as any;
for (const key of ['R2_PRIVATE_IMAGES_BUCKET_NAME','R2_IMAGES_BUCKET_NAME','R2_ASSETS_BUCKET_NAME','R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY']) delete process.env[key];
await assert.rejects(imagePlanPrice(unapprovedProvider, creator.id, unapprovedCreatorConfiguration), error => (error as any).status === 503);
await assert.rejects(createImagePlanCheckout(pool, unapprovedProvider, creator.id,
  { userId: 'owner-fixture', requestId: 'not-reached', origin: 'https://galx.ai' }), error => (error as any).status === 503);
assert.equal(unapprovedStripeCalls, 0);
process.env.R2_PRIVATE_IMAGES_BUCKET_NAME = 'galxai-private-images';
process.env.R2_ASSETS_BUCKET_NAME = 'galxai-assets';
process.env.R2_ACCOUNT_ID = 'fixture-account';
process.env.R2_ACCESS_KEY_ID = 'fixture-access';
process.env.R2_SECRET_ACCESS_KEY = 'fixture-secret';
assert.equal((await imagePlanPrice(imagePriceProvider, creator.id, approvedAllowanceFixture)).id, imagePrice.id);
await assert.rejects(imagePlanPrice({ ...imagePriceProvider, products: { retrieve: async (id: string) => ({
  id, active: true, name: 'GALX Images — Creator',
  metadata: { galxPlan: creator.planKey, galxPublicPlan: creator.publicId, galxSurface: 'images' },
}) } } as any, creator.id, approvedAllowanceFixture));

let providerCalls = 0;
const provider = new Proxy({}, { get: () => { providerCalls += 1; throw new Error('Stripe must not be called'); } }) as any;

await assert.rejects(
  createAccountCheckout(pool, provider, {
    userId: 'user', email: 'user@example.test', amount: 50, requestId: 'request', origin: 'https://galx.ai',
  }),
  error => error instanceof Error && error.message.includes('retired') && (error as any).status === 410,
);
await assert.rejects(readTopUpQuote(pool, 'user', 50), error => error instanceof Error && (error as any).status === 410);
assert.equal(providerCalls, 0);

const response = await stripeConfig();
const body = await response.json();
assert.equal(response.status, 200);
assert.equal(body.consumerPlan.monthlyPriceUsd, 10);
assert.equal('developerAccess' in body, false);
assert.equal('usagePricing' in body, false);
assert.equal('packs' in body, false);

const checkoutResponse = await stripeCheckout(new NextRequest('https://galx.ai/api/stripe/checkout', {
  method: 'POST',
  body: '{}',
  headers: { origin: 'https://galx.ai', 'content-type': 'application/json' },
}));
assert.equal(checkoutResponse.status, 410);
assert(!JSON.stringify(await checkoutResponse.json()).includes('price_'));
assert.equal((await walletEstimate()).status, 410);
assert.equal((await walletUsage()).status, 410);
assert.equal((await seoRates()).status, 410);
assert.equal((await computePool()).status, 410);
assert.doesNotMatch(await (await seoRates()).text(), /input_per_1m|discount|rebate|balance/i);
assert.doesNotMatch(await (await computePool()).text(), /freeGrant|monthlyAllowance|remainingUsd/i);

console.log('Stripe pricing strategy checks passed: Pro remains public, Developer Access checkout is disabled, and legacy purchase routes remain retired.');
