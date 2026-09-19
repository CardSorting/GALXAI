import { PRO_PLAN } from '../billing/pro-plan';

/** Public pricing surfaces: consumer Pro and the separate Developer subscription. */
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
  { q: 'What does GALX Pro cover?', a: 'GALX Pro is the published consumer plan for creating in GALX Images. It is separate from Developer access and follows the published plan terms and fair-use boundaries.' },
  { q: 'What am I paying $50/month for?', a: 'The recurring subscription gives you access to GALX Nova through its API. It is an access membership, not a purchase of usage credits. API usage is billed separately.' },
  { q: 'How does the membership model work?', a: 'Think of Developer Access like membership to a managed workspace. The subscription gives you access to the service; consumption is billed separately. The membership is $50/month for API access, with no usage credits included.' },
  { q: 'Does the membership include $50 of API usage?', a: 'No. The monthly fee is for API access. It is not converted into credits, applied against usage charges, or treated as a prepaid balance.' },
  { q: 'How do I activate Pro?', a: 'Open Billing, complete the secure Stripe checkout, then return to GALX after payment confirmation. Pro renews monthly and can be managed through Stripe.' },
  { q: 'Are Developer and consumer pricing the same?', a: 'No. GALX Pro is the $10/month consumer image plan. Developer Access is a separate $50/month recurring API access membership. Usage is billed separately and no usage credits are included.' },
] as const;
