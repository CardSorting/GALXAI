/**
 * The public Image Studio catalog. Stripe remains the billing authority; this
 * file is the small, reviewable contract used to validate the provider price
 * before a Checkout Session is created. Keep descriptions limited to behavior
 * that the current service actually enforces.
 */
export const IMAGE_PLAN_CATALOG = [
  {
    id: 'creator',
    planKey: 'creator-v1',
    name: 'GALX Images — Creator',
    audience: 'A steady solo creative practice.',
    monthlyPriceUsd: 15,
    currency: 'USD',
    interval: 'month',
    stripeProductId: 'galx_images_creator_v1',
    stripeLookupKey: 'galx_images_creator_monthly_v1',
    catalogStatus: 'active',
    checkoutEnabled: true,
    capabilities: [
      'Current Image Studio controls',
      'Public or Private mode',
      'Personal library, favorites, remix, and downloads',
    ],
    boundary: 'One account, billed monthly, under the published fair-use terms.',
  },
  {
    id: 'studio',
    planKey: 'studio-v1',
    name: 'GALX Images — Studio',
    audience: 'A focused workspace for heavier individual use.',
    monthlyPriceUsd: 35,
    currency: 'USD',
    interval: 'month',
    stripeProductId: 'galx_images_studio_v1',
    stripeLookupKey: 'galx_images_studio_monthly_v1',
    catalogStatus: 'active',
    checkoutEnabled: true,
    capabilities: [
      'Current Image Studio controls',
      'Public or Private mode',
      'Owner library, favorites, and downloads',
    ],
    boundary: 'One account, billed monthly, under the published fair-use terms.',
  },
  {
    // Keep the private plan key stable so existing checkout/webhook records
    // continue to reconcile while the customer-facing name becomes MAX.
    id: 'max',
    planKey: 'team-v1',
    name: 'GALX Images — MAX',
    audience: 'Maximum room for one creator’s Image Studio practice.',
    monthlyPriceUsd: 200,
    currency: 'USD',
    interval: 'month',
    stripeProductId: 'galx_images_team_v1',
    stripeLookupKey: 'galx_images_team_monthly_v1',
    catalogStatus: 'active',
    checkoutEnabled: true,
    capabilities: [
      'Current Image Studio controls for one account',
      'Private mode for owner-scoped drafts',
      'Personal library, favorites, remix, and downloads',
    ],
    boundary: 'One account, billed monthly, under the published fair-use terms. Account sharing, seats, and shared workspaces are not included.',
  },
] as const;

export type ImagePlanId = typeof IMAGE_PLAN_CATALOG[number]['id'];
export type ImagePlanKey = typeof IMAGE_PLAN_CATALOG[number]['planKey'];

export const IMAGE_PLAN_BY_ID = Object.fromEntries(
  IMAGE_PLAN_CATALOG.map(plan => [plan.id, plan]),
) as Record<ImagePlanId, (typeof IMAGE_PLAN_CATALOG)[number]>;

export const IMAGE_PLAN_BY_KEY = Object.fromEntries(
  IMAGE_PLAN_CATALOG.map(plan => [plan.planKey, plan]),
) as Record<ImagePlanKey, (typeof IMAGE_PLAN_CATALOG)[number]>;
