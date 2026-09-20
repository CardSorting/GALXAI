import { PRO_PLAN } from '../billing/pro-plan';
import { IMAGE_PLAN_CATALOG } from '../billing/image-plan-catalog';

/**
 * Public image pricing is intentionally a two-step ladder today. The product
 * has a bounded welcome allowance and one active recurring consumer price;
 * the next prices are shown as staged hypotheses until their matching
 * entitlement and checkout contracts exist.
 */
export const FREE_IMAGE_OFFER = {
  id: 'free',
  name: 'Start free',
  audience: 'Try the Image Studio before subscribing.',
  price: 0,
  allowance: '5 image outputs once per verified account',
} as const;

/**
 * Product-shaped roadmap concepts mirrored into the Stripe catalog as inactive
 * Products and Prices. They are not purchasable until the corresponding
 * capacity, support, checkout, and entitlement contracts exist.
 */
export const FUTURE_PLAN_CONCEPTS = IMAGE_PLAN_CATALOG.map(plan => ({
  id: plan.id,
  name: plan.name.replace('GALX Images — ', ''),
  audience: plan.audience,
  monthlyPrice: plan.monthlyPriceUsd,
  status: 'Staged in Stripe · not available',
  features: plan.capabilities,
  futureBoundary: plan.futureBoundary,
})) as ReadonlyArray<{
  id: typeof IMAGE_PLAN_CATALOG[number]['id'];
  name: string;
  audience: string;
  monthlyPrice: number;
  status: string;
  features: readonly string[];
  futureBoundary: string;
}>;

export const PRICING_PLANS = [{
  id: PRO_PLAN.id,
  name: PRO_PLAN.name,
  audience: 'For people creating in GALX Images.',
  monthlyPrice: PRO_PLAN.monthlyPriceUsd,
  includedSeats: 1,
  extraSeatPrice: 0,
  computeCredit: null,
}] as const;

export const IMAGE_PLAN_FEATURES = [
  'Create 1–4 images per request',
  'Choose 1:1, 3:2, 4:3, 16:9, or 9:16',
  'Standard and HD detail options',
  'Save to your library, favorite, remix, and download',
  'Public or private sharing controls, with creations public by default',
] as const;

export const PRICING_FAQS = [
  { q: 'What can I try for free?', a: 'Verified accounts receive a one-time allowance of five image outputs. Your prompt stays editable when the allowance is used, and your saved work remains available.' },
  { q: 'What does GALX Pro cover?', a: 'GALX Pro is the active consumer subscription for ongoing image creation in the Image Studio under published fair-use terms. It includes the same supported creation controls, library, remix, favorites, and downloads.' },
  { q: 'How are image outputs counted?', a: 'Each generated image counts as one output. A request for four images uses four outputs, so you can choose the batch size that fits your idea.' },
  { q: 'Can I keep a creation private?', a: 'Yes. Signed-in creators can choose Private mode before generating. Private creations stay in the owner library and are excluded from Explore and the community stream; you can publish one later.' },
  { q: 'Are video or uploaded-image editing included?', a: 'No. GALX currently publishes image creation only. We do not advertise video or uploaded-image editing until those capabilities are supported end to end.' },
  { q: 'What are the additional tiers on this page?', a: 'Creator, Studio, and Team are priced roadmap hypotheses staged as inactive Stripe catalog entries. They are not purchasable, do not have checkout or entitlements, and do not change today’s account access.' },
  { q: 'Is programmable access a public subscription?', a: 'No. General-purpose developer access is not self-service. GALX may authorize bounded private integrations by decision.' },
  { q: 'How are private integrations managed?', a: 'Private access is explicit, bounded, metered, administered, and revocable. It is not a generally available commercial plan.' },
  { q: 'How do I activate Pro?', a: 'Open Billing, complete the secure Stripe checkout, then return to GALX after payment confirmation. Pro renews monthly and can be managed through Stripe.' },
] as const;
