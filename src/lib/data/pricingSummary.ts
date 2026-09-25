import { PUBLIC_IMAGE_PLAN_OFFERS } from './image-plan-offers';

/** Public discovery does not invoke or promise any image inference. */
export const PUBLIC_DISCOVERY_OFFER = {
  id: 'discovery',
  name: 'Explore GALX',
  audience: 'Browse Stars, published Works, archives, and Series.',
  price: 0,
} as const;

export const IMAGE_PLAN_OFFERS = PUBLIC_IMAGE_PLAN_OFFERS;

const publishedImageAllowances = IMAGE_PLAN_OFFERS.flatMap(plan => plan.allowance
  ? [`${plan.name}: ${plan.allowance.monthlyUnits.toLocaleString('en-US')} units per month`]
  : []);
const imageWeights = IMAGE_PLAN_OFFERS.find(plan => plan.allowance)?.allowance;
const allowanceTerms = publishedImageAllowances.length
  ? `${publishedImageAllowances.join('; ')}. Standard images use ${imageWeights!.standardOutputUnits} unit each; HD images use ${imageWeights!.hdOutputUnits} units each.`
  : 'Monthly allowances are not currently available.';

export const PRICING_FAQS = [
  { q: 'Can I explore GALX without creating an account?', a: 'Yes. Explore, browse Stars and their published Works, and open Series and archives without invoking image generation.' },
  { q: 'Can I create images privately?', a: `Yes. Sign in with an eligible purchased image tier and enough remaining allowance. ${allowanceTerms}` },
  { q: 'What happens when an allowance is used?', a: 'A request that would exceed the available allowance is not started. Browsing and access to existing Works remain available.' },
  { q: 'Can people publish their generated images?', a: 'No. Human accounts can create privately but cannot publish generated Works to Explore, Star archives, Series, or public feeds.' },
  { q: 'How does Remix privately work?', a: 'A published Star Work can be used as creative context for a new private draft. Remixing does not change or republish the original Work.' },
  { q: 'What allowance comes with Workshop, Studio, and MAX?', a: `${allowanceTerms} Checkout availability is shown in your account. GALX Pro is a separate Sites plan and does not include image creation.` },
  { q: 'Does GALX offer unlimited image generation or public API access?', a: 'No. GALX does not offer unlimited or anonymous image generation, or a public general-purpose inference API.' },
  { q: 'Are video or uploaded-image editing included?', a: 'No. GALX currently supports the image capabilities shown in the private workspace when that access is available.' },
] as const;
