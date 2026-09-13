import { PRO_PLAN } from '@/lib/billing/pro-plan';

/** Authored customer guidance only. No runtime configuration or private document imports. */
export const PLAN_INCLUSIONS = [
  ['Create', 'Sites for your ideas, projects, and early product concepts'],
  ['Refine', 'Unlimited revisions and conversation turns, under fair use. No per-change charge.'],
  ['Revisit', 'Saved versions to return to as your idea evolves'],
  ['Publish', 'Publishing and a public GALX address included'],
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
    description: 'Understand the Sites plan, what you can explore first, and which products are priced separately.',
    category: 'Plans and billing',
    sections: [
      { id: 'the-plan', title: 'One monthly plan for Sites', paragraphs: [`${PRO_PLAN.name} costs $${PRO_PLAN.monthlyPriceUsd} USD per month for one account. It includes creating Sites, saved versions, publishing, and a public GALX address.`, 'Revisions and conversation turns are unlimited under fair use, with no charge for each change. Sites is in an extremely early public beta, so availability may vary.'] },
      { id: 'before-subscribing', title: 'Explore before you subscribe', paragraphs: ['Sign in to open Sites, look around the workspace, and write down your idea. There is no charge just to explore. Creating a Site requires GALX Pro.', 'The plan action takes you to your account, where you can review your plan before subscribing. Signing in does not start a subscription.'] },
      { id: 'included', title: 'From first version to public link', paragraphs: ['Start with a landing page, portfolio, event page, or simple early product idea. Describe what you want, review a first version, and keep refining.', 'Your draft stays private until you choose to publish. Publishing includes a public GALX address, so you do not need to buy a domain or arrange separate hosting to share your Site.'] },
      { id: 'other-products', title: 'Images and developer access', paragraphs: ['Image creation is priced separately from Sites. Open Images and your account to review the available options before creating.', 'The developer API is a private preview with individual approval. A subscription, account, or credit purchase does not grant developer API access.'] },
    ], related: ['/pricing/fair-use', '/pricing/billing-and-cancellation', '/knowledge-base/getting-started'],
  },
  {
    path: '/pricing/fair-use', title: 'Revisions and fair use',
    description: 'How unlimited revisions and conversation turns work during the Sites public beta.',
    category: 'Plans and billing',
    sections: [
      { id: 'revisions', title: 'Keep shaping your idea', paragraphs: ['GALX Pro includes unlimited Sites revisions and conversation turns under fair use. You do not pay a separate charge for each change.', 'Ask for clearer copy, a different layout, or a new direction. You can review saved versions as your idea develops.'] },
      { id: 'waiting', title: 'When you need to wait', paragraphs: ['Unlimited revisions do not promise uninterrupted availability. During this very early beta, you may occasionally need to wait before continuing.', 'If Sites asks you to wait, follow the guidance shown in the workspace and return when it says you can continue. A delay does not mean you should submit the same change repeatedly.'] },
      { id: 'scope', title: 'What this applies to', paragraphs: ['These terms describe revisions and conversation turns in Sites with GALX Pro. Image creation is priced separately, and developer API access requires individual approval.', 'Start with a small project you can review and improve. The product is still taking shape, and beta availability may vary.'] },
    ], related: ['/pricing/galx-pro', '/knowledge-base/revising-your-site', '/knowledge-base/public-beta'],
  },
  {
    path: '/pricing/billing-and-cancellation', title: 'Billing and cancellation',
    description: 'Review monthly pricing, find your plan, and understand access after cancellation.',
    category: 'Plans and billing',
    sections: [
      { id: 'monthly-billing', title: 'Monthly billing', paragraphs: [`${PRO_PLAN.name} is $${PRO_PLAN.monthlyPriceUsd} USD per month and renews monthly. Review the plan in your account before subscribing.`, 'Sites revisions and conversation turns are included under fair use. Image creation has separate pricing.'] },
      { id: 'manage-plan', title: 'Find your plan', paragraphs: ['Sign in to the account you use for Sites, then open Account and the plan section. This is where you can review your current plan and the available subscription controls.', 'If something about your plan is unclear, contact support before making another purchase. Do not send payment card details or passwords.'] },
      { id: 'cancel', title: 'Cancel anytime', paragraphs: ['You can cancel your subscription at any time. After cancellation, access continues through the period you have already paid for.', 'Review your account for the status of your subscription. Contact support if you need help finding or managing your plan.'] },
    ], related: ['/pricing/galx-pro', '/pricing/fair-use', '/faq'],
  },
  {
    path: '/knowledge-base/getting-started', title: 'Create your first Site',
    description: 'Turn a small idea into a first version you can preview, revise, and share.',
    category: 'Getting started',
    sections: [
      { id: 'start-small', title: 'Choose a small idea', paragraphs: ['Sites helps you make a landing page, portfolio, event page, or simple page for an early product idea. No coding is needed. Start with one audience and one thing you want visitors to do.', 'A first version gives you something concrete to react to. It does not have to contain everything your project might eventually become.'] },
      { id: 'describe', title: 'Describe what you want', paragraphs: ['Tell Sites who the page is for, what it should say, and the main action visitors should take. Add the details you already know; you can revise the rest later.'], example: 'Make a landing page for my weekend pottery class. Include a short introduction, what beginners will learn, and a section with the date and location. Keep the tone welcoming.' },
      { id: 'first-version', title: 'Make your first version', paragraphs: ['You can explore the workspace and write down an idea before choosing a plan. Sign-in and GALX Pro are required to create a Site.'], steps: ['Open Sites and sign in to your account.', 'Describe your idea, or adapt a starting idea from the homepage.', 'Review your plan if you have not subscribed, then create your first version.', 'Preview the result and decide what to change next.'] },
      { id: 'next', title: 'Review before sharing', paragraphs: ['Read the copy, check important details, and ask for changes. Your draft stays private until you choose to publish.', 'When you are ready, publish and share your public GALX address. You can keep revising and publish another update later.'] },
    ], related: ['/knowledge-base/revising-your-site', '/knowledge-base/publishing-your-site', '/pricing/galx-pro'],
  },
  {
    path: '/knowledge-base/revising-your-site', title: 'Revise and revisit your Site',
    description: 'Ask for useful changes, review saved versions, and keep control of what you publish.',
    category: 'Creating and publishing',
    sections: [
      { id: 'specific-changes', title: 'Ask for a specific change', paragraphs: ['Use your Sites conversation to explain what should change and what you want to keep. A focused request makes the next version easier to review.'], example: 'Keep the layout and colors. Shorten the introduction to two sentences and make the main button say “See the workshop dates”.' },
      { id: 'review', title: 'Review the result', paragraphs: ['Preview the revised page before making another request. Check the part you asked to change, then read the surrounding content to make sure it still works together.', 'You can explore another direction or return to an earlier saved version as your idea evolves.'] },
      { id: 'included-turns', title: 'Revisions are included', paragraphs: ['GALX Pro includes unlimited revisions and conversation turns under fair use, with no per-change charge. During this very early beta, you may occasionally need to wait before continuing.'] },
      { id: 'publish-update', title: 'Publish when the update is ready', paragraphs: ['Editing a draft does not immediately change your public Site. After reviewing your changes, choose to publish an update to make the new version public.'] },
    ], related: ['/knowledge-base/publishing-your-site', '/pricing/fair-use', '/knowledge-base/getting-started'],
  },
  {
    path: '/knowledge-base/publishing-your-site', title: 'Publish and share your Site',
    description: 'Move from a private draft to a public GALX address, then publish updates when you are ready.',
    category: 'Creating and publishing',
    sections: [
      { id: 'private-draft', title: 'Your draft starts private', paragraphs: ['Creating or revising a Site does not publish it. Your draft stays private until you choose to publish.', 'Before publishing, check your copy, contact details, dates, and links. Include only information you intend to make public.'] },
      { id: 'publish', title: 'Publish a version you have reviewed', paragraphs: ['Publishing and a public GALX address are included with Sites in GALX Pro. You do not need to buy a domain or arrange separate hosting to share your page.'], steps: ['Open your Site and preview the version you want to share.', 'Choose to publish and follow the steps in the workspace.', 'Once publication succeeds, open the public GALX address and review the page.', 'Share the link with the people whose feedback matters.'] },
      { id: 'updates', title: 'Keep improving after publication', paragraphs: ['You can continue refining your Site after you publish. The public page changes when you publish an update, so you can review revisions before sharing them.', 'If publication does not complete, follow the message in the workspace. Do not assume a draft or an unfinished publication is available to visitors.'] },
    ], related: ['/knowledge-base/revising-your-site', '/knowledge-base/public-beta', '/pricing/galx-pro'],
  },
  {
    path: '/knowledge-base/public-beta', title: 'What to expect in the public beta',
    description: 'Start with a small project, understand the early experience, and share useful feedback.',
    category: 'Getting started',
    sections: [
      { id: 'early', title: 'An extremely early public beta', paragraphs: ['Sites is available early so people can try real ideas and help shape what comes next. Expect rough edges and a product that is still developing.', 'A landing page, portfolio, event page, or simple early product concept is a useful place to start. Review the result carefully before sharing it.'] },
      { id: 'availability', title: 'Leave room for interruptions', paragraphs: ['Availability may vary, and you may occasionally need to wait before continuing. Unlimited revisions and conversation turns remain subject to fair use.', 'If something does not work as expected, read the message in the workspace and check the result before trying again.'] },
      { id: 'feedback', title: 'Share feedback we can act on', paragraphs: ['Tell support what you were trying to do, what you expected, and what happened instead. Include the visible message if it helps explain the problem.', 'Keep passwords, payment details, and other sensitive information out of your feedback. Your observations help us understand where the experience needs to improve.'] },
    ], related: ['/knowledge-base/getting-started', '/pricing/fair-use', '/faq'],
  },
  {
    path: '/knowledge-base/images-and-developer-access', title: 'Sites, Images, and developer access',
    description: 'Find the right starting point and understand the separate access and pricing for each product.',
    category: 'Getting started',
    sections: [
      { id: 'sites', title: 'Sites for your next idea', paragraphs: ['Use Sites to describe an idea, make a first version, keep refining it, and publish a page at a public GALX address. Sign in to explore; creating requires GALX Pro.'] },
      { id: 'images', title: 'Images for visual creation', paragraphs: ['Use Images to create images from prompts, keep your work in your library, mark Favorites, and download your images. Sign in to enter the workspace.', 'Image creation is priced separately from Sites. Review the available options and your account before creating.'] },
      { id: 'developers', title: 'Developer API private preview', paragraphs: ['Developer API access is reviewed individually. Visit Developer preview to introduce your project and request access.', 'Creating an account, subscribing to GALX Pro, or purchasing credits does not grant developer API access. Sites and Images do not require developer-preview approval.'] },
    ], related: ['/pricing/galx-pro', '/knowledge-base/getting-started', '/faq'],
  },
];

export const FAQ_GROUPS = [
  { id: 'getting-started', title: 'Getting started' },
  { id: 'plans-and-billing', title: 'Plans and billing' },
  { id: 'publishing-and-access', title: 'Publishing and access' },
] as const;

export const FAQS = [
  { id: 'explore', group: 'getting-started', question: 'Can I explore before choosing a plan?', answer: `Yes. Sign in to open Sites, explore the workspace, and write down your idea before choosing a plan. To create a Site, get GALX Pro for $${PRO_PLAN.monthlyPriceUsd} USD per month. There is no charge just to look around.`, guide: '/knowledge-base/getting-started' },
  { id: 'what-can-i-make', group: 'getting-started', question: 'What can I make in this early preview?', answer: 'A landing page, a portfolio, an event page, or a simple page for an early product idea. No coding needed. Start with something small that you can share, learn from, and keep improving.', guide: '/knowledge-base/getting-started' },
  { id: 'public-beta', group: 'getting-started', question: 'What does “extremely early public beta” mean?', answer: 'We’re sharing Sites early because we believe a real first version teaches you more than an idea left in your notes. Expect rough edges and a product that is still taking shape. Try a small idea, tell us where you get stuck, and help us understand what is worth building next.', guide: '/knowledge-base/public-beta' },
  { id: 'revisions', group: 'plans-and-billing', question: 'Are revisions and conversation turns unlimited?', answer: 'Yes. GALX Pro includes unlimited revisions and conversation turns under fair use, with no charge for each change. During this very early beta, you may occasionally need to wait before continuing.', guide: '/pricing/fair-use' },
  { id: 'plan-price', group: 'plans-and-billing', question: 'How much does GALX Pro cost?', answer: `GALX Pro is $${PRO_PLAN.monthlyPriceUsd} USD per month for one account. Sites includes creation, revisions under fair use, saved versions, publishing, and a public GALX address. The plan renews monthly.`, guide: '/pricing/galx-pro' },
  { id: 'cancellation', group: 'plans-and-billing', question: 'Can I cancel my subscription?', answer: 'Yes. You can cancel anytime. Access continues through the period you have already paid for. Sign in and open your account to review your plan.', guide: '/pricing/billing-and-cancellation' },
  { id: 'images', group: 'plans-and-billing', question: 'Is image creation included in the Sites plan?', answer: 'Image creation is priced separately. Open Images and your account to review the available options before creating.', guide: '/knowledge-base/images-and-developer-access' },
  { id: 'domain', group: 'publishing-and-access', question: 'Do I need to buy a domain?', answer: 'No. Publishing includes a public GALX address for your Site. You can send people a link without buying a domain or arranging separate hosting.', guide: '/knowledge-base/publishing-your-site' },
  { id: 'private-drafts', group: 'publishing-and-access', question: 'Do my changes go public straight away?', answer: 'No. Your draft stays private until you choose to publish. After that, you can keep refining it and return to earlier versions. Your public Site changes when you publish an update.', guide: '/knowledge-base/publishing-your-site' },
  { id: 'developer-access', group: 'publishing-and-access', question: 'Does GALX Pro include developer API access?', answer: 'No. Developer API access is a private preview with individual approval. Creating an account, subscribing, or purchasing credits does not grant access. You can request access from the Developer preview page.', guide: '/knowledge-base/images-and-developer-access' },
];

export const HOME_FAQS = ['explore', 'what-can-i-make', 'revisions', 'domain', 'private-drafts', 'public-beta']
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
