import { SEAT_TIERS } from './pricingData';

export const PRICING_PLANS = SEAT_TIERS.map(tier => ({
  id: tier.id,
  name: tier.id === 'developer' ? 'Solo' : tier.id === 'small-business' ? 'Team' : 'Enterprise',
  audience: tier.id === 'developer' ? 'For individual developers.' : tier.id === 'small-business' ? 'For teams of up to 25 people.' : 'For larger organizations.',
  monthlyPrice: tier.basePriceUsd,
  includedSeats: tier.includedSeats,
  extraSeatPrice: tier.perSeatPriceUsd,
  // Paid-plan amounts are published terms, not an account entitlement.
  computeCredit: tier.id === 'developer' ? null : tier.includedMonthlyComputeCredits,
}));

export const PRICING_FAQS = [
  { q: 'How do plan fees and usage fit together?', a: 'The plan fee covers workspace seats. Model usage is billed separately. Where a paid plan includes compute credits, usage beyond those credits is additional.' },
  { q: 'How do I activate a team plan?', a: 'Contact support to confirm the plan, included credits, and billing terms. Creating a workspace does not activate a paid subscription.' },
  { q: 'What about caching and volume pricing?', a: 'Cached-input rates apply to eligible usage reported by the model. Do not assume every repeated prompt is cached. Contact support for volume terms; the rates below do not assume extra discounts.' },
];
