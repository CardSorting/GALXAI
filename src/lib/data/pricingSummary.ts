import { PRO_PLAN } from '../billing/pro-plan';

/** Public pricing surfaces: consumer Pro only. Private integration allocations are administered separately. */
export const PRICING_PLANS = [{
  id: PRO_PLAN.id,
  name: PRO_PLAN.name,
  audience: 'For people creating in GALX Images.',
  monthlyPrice: PRO_PLAN.monthlyPriceUsd,
  includedSeats: 1,
  extraSeatPrice: 0,
  computeCredit: null,
}] as const;

export const PRICING_FAQS = [
  { q: 'What does GALX Pro cover?', a: 'GALX Pro is the published consumer plan for creating in GALX Images and follows the published plan terms and fair-use boundaries.' },
  { q: 'Is programmable access a public subscription?', a: 'No. General-purpose developer access is not self-service. GALX may authorize bounded private integrations by decision.' },
  { q: 'How are private integrations managed?', a: 'Private access is explicit, bounded, metered, administered, and revocable. It is not a generally available commercial plan.' },
  { q: 'How do I activate Pro?', a: 'Open Billing, complete the secure Stripe checkout, then return to GALX after payment confirmation. Pro renews monthly and can be managed through Stripe.' },
] as const;
