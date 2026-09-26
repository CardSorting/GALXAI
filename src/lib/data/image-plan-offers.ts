/**
 * Browser-safe Image Studio offer copy. Keep provider identifiers, lookup keys,
 * metadata and activation state in the server-only billing catalog instead.
 */
import { approvedAllowanceFor, IMAGE_ALLOWANCE_CONFIGURATION, type ImagePlanKey } from '../billing/image-allowance-config';

const offerDefinitions = [
  {
    id: 'foundry',
    planKey: 'team-v1',
    name: 'Foundry',
    audience: 'Access the machinery.',
    monthlyPrice: 200,
    status: 'Not yet available',
    features: [
      'Bounded private image creation when an allowance is available',
      'Remix published Star Works privately',
      'Personal library, favorites, remix, and downloads',
    ],
    boundary: 'One account. Human-generated Works remain private and cannot be published to GALX. Account sharing, seats, and shared workspaces are not included.',
  },
] as const;

/** Public allowance data is projected from the same typed source used by checkout and reservation. */
export const PUBLIC_IMAGE_PLAN_OFFERS = offerDefinitions.map(({ planKey, ...offer }) => {
  const allowance = approvedAllowanceFor(IMAGE_ALLOWANCE_CONFIGURATION, planKey as ImagePlanKey);
  return {
    ...offer,
    allowance: allowance ? {
      monthlyUnits: allowance.monthlyUnits,
      standardOutputUnits: allowance.standardOutputUnits,
      hdOutputUnits: allowance.hdOutputUnits,
    } : null,
  };
});

export type PublicImagePlanId = typeof PUBLIC_IMAGE_PLAN_OFFERS[number]['id'];
