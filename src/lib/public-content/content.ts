import { PRO_PLAN } from '@/lib/billing/pro-plan';

/** Authored customer guidance only. No runtime configuration or private document imports. */
export const PLAN_INCLUSIONS = [
  ['Generate', 'High-resolution images across 5 standard aspect ratios'],
  ['Speed', 'Priority GPU inference queues with sub-second dispatch'],
  ['Remix', 'Unlimited 1-click prompt reuse & studio iterations'],
  ['Explore', 'Full-access public stream with lossless raw PNG egress'],
] as const;

export type Guide = {
  path: string;
  title: string;
  description: string;
  category: 'Getting started' | 'Creating and publishing' | 'Plans and billing';
  sections: { id: string; title: string; paragraphs: string[]; steps?: string[]; example?: string }[];
  related: string[];
};

export const GUIDES: Guide[] = [
  {
    path: '/pricing/galx-pro', title: 'What’s included in GALX Pro',
    description: 'Understand the GALX Images Pro plan, priority GPU queues, and developer credits.',
    category: 'Plans and billing',
    sections: [
      { id: 'the-plan', title: 'One monthly plan for high-velocity creation', paragraphs: [`${PRO_PLAN.name} costs $${PRO_PLAN.monthlyPriceUsd} USD per month for one account. It includes priority GPU inference queues, high-resolution generation across 5 standard aspect ratios, unlimited 1-click prompt remixing, and public stream discovery.`, 'Images generated are public by default and published to the live masonry stream. The legacy Sites workspace has been retired due to quota and maintenance complexity.'] },
      { id: 'before-subscribing', title: 'Explore before you subscribe', paragraphs: ['Sign in to open the Image Studio, explore the community stream, and experiment with prompt variations. Your account includes five free welcome images as a one-time allowance. The header shows what remains.', 'Upgrade to GALX Pro for unlimited high-velocity generation and priority dispatch. Signing in does not start a subscription until you confirm in Billing.'] },
      { id: 'included', title: 'From prompt to infinite stream', paragraphs: ['Start with any idea: cinematic lighting, anime characters, isometric pixel art, editorial fashion, or surreal landscapes. Choose your aspect ratio and dispatch to the synthesis pipeline.', 'Your generations appear immediately in your studio library and flow into the community stream. Download lossless raw PNGs whenever you are ready.'] },
      { id: 'other-products', title: 'Developer API access', paragraphs: ['Developer API access is available instantly via the $10 Developer Tier (which includes $10 in usable pay-as-you-go compute credit for Images and Frontier OpenAI Models with Tier 1 throughput) or through the free preview cohort. Pro subscriptions and API usage remain separate.'] },
    ], related: ['/pricing/fair-use', '/pricing/billing-and-cancellation', '/knowledge-base/getting-started'],
  },
  {
    path: '/pricing/fair-use', title: 'Generation and fair use',
    description: 'How high-throughput image generation and queue pacing operate on GALX Pro.',
    category: 'Plans and billing',
    sections: [
      { id: 'revisions', title: 'Unlimited prompt iterations', paragraphs: ['GALX Pro includes unlimited image generations and prompt remixing under fair use. You do not pay a per-turn charge in the studio.', 'Experiment with styling, aspect ratios, and seeds freely. Every image is rendered with optimal diffusion fidelity.'] },
      { id: 'waiting', title: 'Queue pacing and availability', paragraphs: ['Unlimited generations do not promise zero queue latency during peak global traffic bursts. If the GPU pipeline experiences high load, requests are smoothly paced.', 'When queue pacing is active, follow the in-studio indicators. Pacing ensures equitable throughput for all creators without dropping jobs.'] },
      { id: 'scope', title: 'What this applies to', paragraphs: ['These terms apply to visual generation in the GALX Image Studio with GALX Pro. Developer API calls follow separate token/compute metering.', 'The legacy Sites builder is retired; remaining accounts and links redirect to the Image Studio.'] },
    ], related: ['/pricing/galx-pro', '/knowledge-base/revising-your-site', '/knowledge-base/public-beta'],
  },
  {
    path: '/pricing/billing-and-cancellation', title: 'Billing and cancellation',
    description: 'Review monthly pricing, find your plan, and understand access after cancellation.',
    category: 'Plans and billing',
    sections: [
      { id: 'monthly-billing', title: 'Monthly billing', paragraphs: [`${PRO_PLAN.name} is $${PRO_PLAN.monthlyPriceUsd} USD per month and renews monthly. Review the plan in your account before subscribing.`, 'Visual synthesis, remixing, and community stream participation are included under fair use. Developer API compute carries separate usage terms.'] },
      { id: 'manage-plan', title: 'Find your plan', paragraphs: ['Sign in to your GALX account, then open Account and the plan section. This is where you can review your current plan and active subscription controls.', 'If something about your subscription is unclear, contact support before making another purchase. Do not send payment card details or passwords.'] },
      { id: 'cancel', title: 'Cancel anytime', paragraphs: ['You can cancel your subscription at any time. After cancellation, Pro access continues through the remainder of your paid billing period.', 'Your created images and library history remain safely stored in your account.'] },
    ], related: ['/pricing/galx-pro', '/pricing/fair-use', '/faq'],
  },
  {
    path: '/knowledge-base/getting-started', title: 'Synthesize your first image',
    description: 'Turn an idea into a high-resolution visual with GALX Images and the studio cockpit.',
    category: 'Getting started',
    sections: [
      { id: 'start-small', title: 'Start with an imaginative prompt', paragraphs: ['GALX Images transforms natural language prompts into stunning visual art. You can specify art styles, lighting, color palettes, camera lenses, and mood.', 'A great prompt balances subject, setting, and aesthetic texture. Use our homepage prompt chips or type your own concept in the cockpit.'] },
      { id: 'describe', title: 'Choose your aspect ratio', paragraphs: ['Select from 5 standard aspect ratios tailored for modern platforms: 1:1 Square (Instagram/Avatars), 16:9 Landscape (Desktop/Cinematic), 9:16 Portrait (Mobile/Stories), 4:3 Classic, and 3:4 Editorial.', 'Aspect ratios shape the composition natively during the diffusion process, preventing awkward cropping.'], example: 'cyberpunk street market at dusk, neon rain puddles, holographic vendor signs, cinematic 35mm photography, volumetric mist, photorealistic' },
      { id: 'first-version', title: 'Generate and remix', paragraphs: ['Sign in to access your library, or start with your 5 free welcome generations. Press Synthesize to launch the inference pipeline.'], steps: ['Open the Image Studio or use the homepage prompt cockpit.', 'Type your prompt and choose your desired aspect ratio and model.', 'Click Synthesize to submit your request to the GPU queue.', 'Preview the generated image, remix the prompt, or download the lossless binary.'] },
      { id: 'next', title: 'Explore the community stream', paragraphs: ['Every generated image is public by default and appears in the infinite community stream. See what others are creating in real time and remix any prompt with a single click.', 'The former Sites website builder has been sunset in favor of this visual creation platform.'] },
    ], related: ['/knowledge-base/revising-your-site', '/knowledge-base/publishing-your-site', '/pricing/galx-pro'],
  },
  {
    path: '/knowledge-base/revising-your-site', title: 'Remix and iterate on prompts',
    description: 'Refine compositions, iterate styles, and leverage 1-click prompt remixing.',
    category: 'Creating and publishing',
    sections: [
      { id: 'specific-changes', title: 'Iterate and remix', paragraphs: ['Click Remix on any community card or library image to immediately load its prompt, aspect ratio, and model settings into your studio composer.', 'Modify details such as lighting, atmosphere, color grade, or perspective to create fresh variations.'] },
      { id: 'review', title: 'Compare variations in your library', paragraphs: ['All your generations are saved to your private studio library. Compare different prompt iterations, mark Favorites with the heart icon, and track your visual ideas.', 'Downloading provides pristine binary artifacts with zero intrusive watermarks.'] },
      { id: 'included-turns', title: 'High-velocity synthesis', paragraphs: ['GALX Pro includes unlimited generations and prompt remixing under fair use. Queues are optimized for rapid iteration and creative flow.'] },
      { id: 'sites-retirement', title: 'Retirement of the Sites builder', paragraphs: ['The interactive website builder (Sites) was retired in September 2026 due to disproportionate infrastructure quota and technical overhead. All legacy `/sites` URLs gracefully redirect to `/images`.'] },
    ], related: ['/knowledge-base/publishing-your-site', '/pricing/fair-use', '/knowledge-base/getting-started'],
  },
  {
    path: '/knowledge-base/publishing-your-site', title: 'Public stream and community showcase',
    description: 'How public-by-default image generation and the live masonry stream work.',
    category: 'Creating and publishing',
    sections: [
      { id: 'public-default', title: 'Public by default', paragraphs: ['GALX Images operates on an open creative commons ethos: every image synthesized is public by default and enters the live community feed.', 'Other creators can discover your visuals, inspect your prompt recipe, and remix it for further inspiration.'] },
      { id: 'publish', title: 'The Pinterest-style masonry stream', paragraphs: ['The public stream dynamically populates images in a responsive multi-column masonry layout reminiscent of Pinterest.', 'Hover over any image card to inspect the aspect ratio, model, and prompt, or click Remix to immediately adapt the idea in your Image Studio.'] },
      { id: 'updates', title: 'Downloading and sharing', paragraphs: ['Download sanitized, high-resolution PNG binaries directly from the studio or stream card. No extra compression or lossy transcoding is applied.', 'Share direct image links with your audience or import assets into your design workflows.'] },
    ], related: ['/knowledge-base/revising-your-site', '/knowledge-base/public-beta', '/pricing/galx-pro'],
  },
  {
    path: '/knowledge-base/public-beta', title: 'What to expect in the public beta',
    description: 'Explore the GALX Images beta, understand system throughput, and share feedback.',
    category: 'Getting started',
    sections: [
      { id: 'early', title: 'A focused, high-throughput visual platform', paragraphs: ['GALX has transitioned to focus entirely on visual AI generation. We retired the heavy Sites website builder to concentrate 100% of our compute and infrastructure on world-class image diffusion.', 'Expect rapid feature additions, model upgrades, and expanding community stream capabilities.'] },
      { id: 'availability', title: 'Inference speed and queue stability', paragraphs: ['During peak usage bursts, queue pacing maintains system reliability. Free welcome generations and Pro requests are processed smoothly without data loss.', 'If an image generation takes longer than expected, the studio automatically maintains your task state and displays live progress.'] },
      { id: 'feedback', title: 'Share feedback we can act on', paragraphs: ['Tell our team what prompts, aspect ratios, or model controls you want to see next. We welcome suggestions on stream discovery and composer ergonomics.', 'Contact support with your feedback or join the developer preview to build on the raw API.'] },
    ], related: ['/knowledge-base/getting-started', '/pricing/fair-use', '/faq'],
  },
  {
    path: '/knowledge-base/images-and-developer-access', title: 'GALX Images and developer access',
    description: 'Find the right starting point: web Image Studio vs. raw developer API access.',
    category: 'Getting started',
    sections: [
      { id: 'images', title: 'GALX Images web studio', paragraphs: ['The flagship web experience for creators and designers. Synthesize images from natural language, remix community prompts, choose across 5 aspect ratios, and curate your favorites.', 'Start with 5 free welcome images, or subscribe to GALX Pro for high-velocity unlimited creation under fair use.'] },
      { id: 'developers', title: 'Developer API and Developer Tier', paragraphs: ['Developer API access is available instantly through the $10 Developer Tier, providing $10 in usable pay-as-you-go compute credits for programmatic image generation and Frontier OpenAI Models with Tier 1 throughput.', 'Developers can also apply to the free developer preview cohort from the Developer preview page.'] },
      { id: 'sites-status', title: 'Notice: Sites builder retired', paragraphs: ['The previous Sites product has been decommissioned. Sites required unsustainable quota allocations and complex custom runtime setup. All web creation efforts are now unified under GALX Images.'] },
    ], related: ['/pricing/galx-pro', '/knowledge-base/getting-started', '/faq'],
  },
];

export const FAQ_GROUPS = [
  { id: 'getting-started', title: 'Getting started' },
  { id: 'plans-and-billing', title: 'Plans and billing' },
  { id: 'publishing-and-access', title: 'Stream & generation' },
] as const;

export const FAQS = [
  { id: 'explore', group: 'getting-started', question: 'Can I explore before choosing a plan?', answer: `Yes. A verified account includes five free images as a welcome allowance. Explore the Image Studio and community stream freely. GALX Pro is $${PRO_PLAN.monthlyPriceUsd} USD per month for unlimited high-velocity visual generation under fair use.`, guide: '/knowledge-base/getting-started' },
  { id: 'what-can-i-make', group: 'getting-started', question: 'What can I generate with GALX Images?', answer: 'Photorealistic photography, anime art, digital concept art, UI assets, fashion editorials, surreal landscapes, 3D renders, and graphic design in 5 standard aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4).', guide: '/knowledge-base/getting-started' },
  { id: 'public-beta', group: 'getting-started', question: 'Are generated images public?', answer: 'Yes! Every image generated on GALX is public by default and flows into the live community stream. Creators can discover each other’s work and remix prompts with a single click.', guide: '/knowledge-base/publishing-your-site' },
  { id: 'revisions', group: 'plans-and-billing', question: 'Are generations and remixes unlimited with Pro?', answer: 'Yes. GALX Pro includes unlimited generations and 1-click prompt remixes under fair use. Peak traffic may experience queue pacing to ensure equitable throughput.', guide: '/pricing/fair-use' },
  { id: 'plan-price', group: 'plans-and-billing', question: 'How much does GALX Pro cost?', answer: `GALX Pro is $${PRO_PLAN.monthlyPriceUsd} USD per month for one account. It includes priority GPU queue access, high-resolution generation across all 5 aspect ratios, unlimited remixes, and stream discovery. The plan renews monthly.`, guide: '/pricing/galx-pro' },
  { id: 'cancellation', group: 'plans-and-billing', question: 'Can I cancel my subscription?', answer: 'Yes. You can cancel anytime directly from your account billing page. Pro access continues through the end of your prepaid period.', guide: '/pricing/billing-and-cancellation' },
  { id: 'aspect-ratios', group: 'publishing-and-access', question: 'Which aspect ratios are supported?', answer: 'We support 5 native diffusion aspect ratios: 1:1 Square, 16:9 Landscape, 9:16 Portrait (Stories/Reels), 4:3 Classic, and 3:4 Editorial.', guide: '/knowledge-base/getting-started' },
  { id: 'remix-prompt', group: 'publishing-and-access', question: 'How does prompt remixing work?', answer: 'Hover over any image card in the community stream or your library and click Remix. The prompt, model, and aspect ratio will automatically populate in your studio composer, ready for tweaking.', guide: '/knowledge-base/revising-your-site' },
  { id: 'developer-access', group: 'publishing-and-access', question: 'Does GALX Pro include developer API access?', answer: 'No. Developer API access is available instantly through the $10 Developer Tier (pay-as-you-go for images and frontier OpenAI models) or by applying to the free developer preview cohort. Pro studio subscriptions are separate.', guide: '/knowledge-base/images-and-developer-access' },
];

export const HOME_FAQS = ['explore', 'what-can-i-make', 'public-beta', 'aspect-ratios', 'remix-prompt']
  .map(id => FAQS.find(faq => faq.id === id)!);

export function getGuide(path: string) { return GUIDES.find(guide => guide.path === path); }

const knowledgeOrder = ['getting-started', 'revising-your-site', 'publishing-your-site', 'galx-pro', 'fair-use', 'billing-and-cancellation', 'public-beta', 'images-and-developer-access'];
const knowledgeGuides = [...GUIDES].sort((a, b) => knowledgeOrder.indexOf(a.path.split('/').at(-1)!) - knowledgeOrder.indexOf(b.path.split('/').at(-1)!));

export function filterGuides(query: string, category: string) {
  const terms = query.toLocaleLowerCase('en-US').trim().split(/\s+/).filter(Boolean);
  return knowledgeGuides.filter(guide => {
    if (category !== 'All topics' && guide.category !== category) return false;
    const text = [guide.title, guide.description, guide.category, ...guide.sections.flatMap(section =>
      [section.title, ...section.paragraphs, ...(section.steps ?? []), section.example ?? ''])].join(' ').toLocaleLowerCase('en-US');
    return terms.every(term => text.includes(term));
  });
}
