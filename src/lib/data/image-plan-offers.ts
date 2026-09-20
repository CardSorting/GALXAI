/**
 * Browser-safe Image Studio offer copy. Keep provider identifiers, lookup keys,
 * metadata and activation state in the server-only billing catalog instead.
 */
export const PUBLIC_IMAGE_PLAN_OFFERS = [
  {
    id: 'creator',
    name: 'Creator',
    audience: 'A steady solo creative practice.',
    monthlyPrice: 15,
    status: 'Available now',
    features: [
      'Current Image Studio controls',
      'Public or Private mode',
      'Personal library, favorites, remix, and downloads',
    ],
    boundary: 'One account, billed monthly, under the published fair-use terms.',
  },
  {
    id: 'studio',
    name: 'Studio',
    audience: 'A focused workspace for heavier individual use.',
    monthlyPrice: 35,
    status: 'Available now',
    features: [
      'Current Image Studio controls',
      'Public or Private mode',
      'Personal library, favorites, remix, and downloads',
    ],
    boundary: 'One account, billed monthly, under the published fair-use terms.',
  },
  {
    id: 'max',
    name: 'MAX',
    audience: 'Maximum room for one creator’s Image Studio practice.',
    monthlyPrice: 200,
    status: 'Available now',
    features: [
      'Current Image Studio controls for one account',
      'Private mode for owner-scoped drafts',
      'Personal library, favorites, remix, and downloads',
    ],
    boundary: 'One account, billed monthly, under the published fair-use terms. Account sharing, seats, and shared workspaces are not included.',
  },
] as const;

export type PublicImagePlanId = typeof PUBLIC_IMAGE_PLAN_OFFERS[number]['id'];
