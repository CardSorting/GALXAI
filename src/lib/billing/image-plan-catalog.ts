/**
 * Image plan pricing hypotheses.
 *
 * These entries describe the next commercial ladder, but they are deliberately
 * not an entitlement source. The current product can honor the free allowance
 * and GALX Pro contract only; Creator, Studio, and Team remain catalog-staged
 * until their usage, workspace, support, and checkout contracts are shipped.
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
    catalogStatus: 'staged',
    checkoutEnabled: false,
    capabilities: [
      'Current Image Studio controls',
      'Public or Private mode',
      'Owner library and prompt reuse',
    ],
    futureBoundary: 'Higher fair-use headroom requires a published usage policy and entitlement path.',
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
    catalogStatus: 'staged',
    checkoutEnabled: false,
    capabilities: [
      'Current Image Studio controls',
      'Public or Private mode',
      'Owner library, favorites, and downloads',
    ],
    futureBoundary: 'Higher throughput requires measurable capacity and a plan-aware admission policy.',
  },
  {
    id: 'team',
    planKey: 'team-v1',
    name: 'GALX Images — Team',
    audience: 'A small group making work together.',
    monthlyPriceUsd: 75,
    currency: 'USD',
    interval: 'month',
    stripeProductId: 'galx_images_team_v1',
    stripeLookupKey: 'galx_images_team_monthly_v1',
    catalogStatus: 'staged',
    checkoutEnabled: false,
    capabilities: [
      'Current Image Studio controls per account',
      'Private mode for owner-scoped drafts',
      'Team workspace and role controls are planned',
    ],
    futureBoundary: 'Shared libraries, seats, roles, and workspace billing are not available yet.',
  },
] as const;

export type ImagePlanId = typeof IMAGE_PLAN_CATALOG[number]['id'];
export type ImagePlanKey = typeof IMAGE_PLAN_CATALOG[number]['planKey'];
