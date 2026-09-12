import { SEAT_TIERS } from './pricingData';
import { PRO_PLAN } from '../billing/pro-plan';

export const PRICING_PLANS: {id:string;name:string;audience:string;monthlyPrice:number;includedSeats:number;extraSeatPrice:number;computeCredit:number|null}[] = SEAT_TIERS.map(tier => ({
  id: tier.id,
  name: tier.id === 'developer' ? 'Solo' : tier.id === 'small-business' ? 'Team' : 'Enterprise',
  audience: tier.id === 'developer' ? 'For individual developers.' : tier.id === 'small-business' ? 'For teams of up to 25 people.' : 'For larger organizations.',
  monthlyPrice: tier.basePriceUsd,
  includedSeats: tier.includedSeats,
  extraSeatPrice: tier.perSeatPriceUsd,
  // Paid-plan amounts are published terms, not an account entitlement.
  computeCredit: tier.id === 'developer' ? null : tier.includedMonthlyComputeCredits,
}));
PRICING_PLANS.splice(1,0,{id:PRO_PLAN.id,name:'Pro',audience:'For creators building with Sites.',monthlyPrice:PRO_PLAN.monthlyPriceUsd,includedSeats:1,extraSeatPrice:0,computeCredit:null});

export const PRICING_FAQS = [
  { q: 'How do plan fees and usage fit together?', a: 'Pro includes Sites creation and publishing with fair usage, without per-update charges. API and image usage are separate. Team and Enterprise have their own agreed seat and compute terms.' },
  { q: 'How do I activate Pro?', a: 'Open Billing, complete secure checkout, then open Sites once your payment is confirmed. Pro renews monthly. You can cancel through Manage subscription and keep access through your paid period.' },
  { q: 'How do I activate a team plan?', a: 'Contact support to confirm the plan, included credits, and billing terms. Creating a workspace does not activate a paid subscription.' },
  { q: 'What about caching and volume pricing?', a: 'Cached-input rates apply to eligible usage reported by the model. Do not assume every repeated prompt is cached. Contact support for volume terms; the rates below do not assume extra discounts.' },
];
