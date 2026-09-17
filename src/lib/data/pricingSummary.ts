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
PRICING_PLANS.splice(1,0,{id:PRO_PLAN.id,name:'Pro',audience:'For creators synthesizing with Image Studio.',monthlyPrice:PRO_PLAN.monthlyPriceUsd,includedSeats:1,extraSeatPrice:0,computeCredit:null});

export const PRICING_FAQS = [
  { q: 'How do plan fees and API usage fit together?', a: 'Pro ($10/mo) is a standalone subscription for Image Studio — unlimited high-resolution synthesis and priority GPU queues with fair usage. API compute and developer tokens are metered separately as pay-as-you-go credits. Team and Enterprise plans have their own agreed seat and compute terms.' },
  { q: 'What is the Prepaid Compute Tier system?', a: 'Developer API access uses a one-time deposit model with six tiers ($10–$500). Each deposit is a non-expiring compute balance — no subscriptions, no monthly recurring fees. Higher tiers unlock more concurrency: the $10 Developer Tier starts at 60 RPM / 40k TPM; the $500 Hyperscale Infra tier is unlimited. Tiers $25 and above also receive compute match bonuses of 50%–100% (up to $500 in free compute on a $500 deposit).' },
  { q: 'Do prepaid credits expire?', a: 'No. All purchased compute credits and match bonuses are non-expiring and remain on your wallet balance until consumed by API requests. There are no monthly resets, no burn-or-lose cliffs, and no negative overdrafts — your balance can never go below $0.00.' },
  { q: 'How do I activate Pro?', a: 'Open Billing, complete the secure Stripe checkout, then launch Image Studio once your payment is confirmed. Pro renews monthly. You can cancel through Manage subscription and keep access through your paid period.' },
  { q: 'How do I activate a team plan?', a: 'Contact support to confirm the plan, included credits, and billing terms. Creating a workspace does not activate a paid subscription.' },
  { q: 'What about caching and volume pricing?', a: 'Cached-input rates apply to eligible usage reported by the model provider and are passed through at 75%–90% discount depending on your tier. Do not assume every repeated prompt is cached. Contact support for volume terms; the rates shown do not assume extra enterprise discounts.' },
];
