import { IMAGE_PLAN_OFFERS } from '@/lib/data/pricingSummary';

const allowancePlans = IMAGE_PLAN_OFFERS.flatMap(plan => plan.allowance
  ? [`${plan.name}: ${plan.allowance.monthlyUnits.toLocaleString('en-US')} units per month`]
  : []);
const imageAllowanceDetails = allowancePlans.length
  ? `${allowancePlans.join('; ')}. Standard images use ${IMAGE_PLAN_OFFERS.find(plan => plan.allowance)!.allowance!.standardOutputUnits} unit each; HD images use ${IMAGE_PLAN_OFFERS.find(plan => plan.allowance)!.allowance!.hdOutputUnits} units each.`
  : 'Monthly allowances are not currently available.';

/** Authored customer guidance only. Operational details and provider identifiers stay private. */
export const DISCOVERY_INCLUSIONS = [
  ['Browse', 'Explore Stars, published Works, public archives, and Series'],
  ['Follow', 'Keep up with Stars you enjoy'],
  ['Save', 'Keep public Star Works in personal collections where supported'],
  ['Creation', 'Browsing does not start image generation'],
] as const;

export type Guide = {
  path: string;
  title: string;
  description: string;
  category: 'Getting started' | 'Private creation and remixing' | 'Plans and billing';
  sections: {
    id: string;
    title: string;
    paragraphs: string[];
    steps?: string[];
    example?: string;
  }[];
  related: string[];
};

export const GUIDES: Guide[] = [
  {
    path: '/pricing/galx-pro',
    title: 'Private creation access in GALX',
    description: 'Learn how bounded private creation and Star publishing are separated in GALX.',
    category: 'Plans and billing',
    sections: [
      {
        id: 'the-plan',
        title: 'Private creation is a separate capability',
        paragraphs: [
          'Human creation is private by default and private by design. A human account cannot publish generated work into Explore, a Star archive, a Series, or a public feed.',
          `Private creation requires a signed-in account, an Foundry subscription, and remaining allowance. ${imageAllowanceDetails}`,
        ],
      },
      {
        id: 'discover-first',
        title: 'Explore before creating',
        paragraphs: [
          'Public discovery is available without image inference. Explore Stars, browse published Works and archives, and follow or save existing public Works.',
          'When private creation is available, the workspace will show the tier, remaining allowance, renewal timing where applicable, and what happens when the allowance is exhausted.',
        ],
      },
      {
        id: 'before-subscribing',
        title: 'Explore before you decide',
        paragraphs: [
          'Open Explore to discover published Star Works. The public discovery experience does not require a prompt or invoke generation.',
          'A private creation request requires sign-in, an eligible purchased tier, available allowance, and successful admission before it starts.',
        ],
      },
      {
        id: 'included',
        title: 'From a Star Work to a private draft',
        paragraphs: [
          'A published Star Work may offer Remix privately. After account and allowance checks, its creative direction can be used as context for a new private draft. The remix does not change or republish the original Work.',
          'Completed human creations remain in the owner’s private library. There is no human publishing or public user gallery.',
        ],
      },
      {
        id: 'developer-access',
        title: 'Private integrations are separate',
        paragraphs: [
          'GALX Nova powers supported GALX experiences and selected private integrations. General-purpose developer access is not a public subscription.',
          'Private access is explicit, bounded, metered, administered, and revocable. GALX establishes any applicable terms directly with an authorized cohort.',
        ],
      },
    ],
    related: ['/pricing/fair-use', '/pricing/billing-and-cancellation', '/knowledge-base/getting-started'],
  },
  {
    path: '/pricing/fair-use',
    title: 'Image creation and fair use',
    description: 'Understand the fair-use boundaries that apply to image creation in GALX Images.',
    category: 'Plans and billing',
    sections: [
      {
        id: 'creation',
        title: 'Create and iterate',
        paragraphs: [
          'Private image creation is a bounded purchased capability, not an unlimited generator. Foundry states its bounded allowance and renewal behavior before checkout is enabled.',
          'A request that exceeds remaining allowance is not dispatched. Public browsing and access to already completed work remain available when private inference is unavailable.',
        ],
      },
      {
        id: 'availability',
        title: 'Availability can vary',
        paragraphs: [
          'During periods of high demand, requests may take longer or be paced. Follow the status shown in the Image Studio and retry when the experience asks you to.',
          'If a request fails, the product should explain what you can do next without exposing internal execution details.',
        ],
      },
      {
        id: 'scope',
        title: 'What this applies to',
        paragraphs: [
          'These terms describe private creation only. They do not create a human publishing right or a public general-purpose inference API.',
        ],
      },
    ],
    related: ['/pricing/galx-pro', '/knowledge-base/getting-started', '/knowledge-base/public-beta'],
  },
  {
    path: '/pricing/billing-and-cancellation',
    title: 'Billing and cancellation',
    description: 'Understand Orbit, Foundry, monthly renewal, and cancellation.',
    category: 'Plans and billing',
    sections: [
      {
        id: 'monthly-billing',
        title: 'Monthly billing',
        paragraphs: [
          'Orbit is $10 USD per Star per month. Foundry is $200 USD per month. They renew independently; neither includes the other. New subscriptions are not available yet.',
          'Selected private integrations are separate from the consumer image plan and have directly assigned access terms.',
        ],
      },
      {
        id: 'manage-plan',
        title: 'Find your plan',
        paragraphs: [
          'Sign in to your GALX account, then open Account and the plan section. This is where you can review your current plan and subscription controls.',
          'If something about your subscription is unclear, contact support before making another purchase. Do not send payment card details or passwords.',
        ],
      },
      {
        id: 'cancel',
        title: 'Cancel your subscription',
        paragraphs: [
          'Use Cancel renewal on the Star profile for an Orbit, or Manage subscription in account billing for Foundry. Cancellation stops future renewal and retains access through the current paid period.',
          'Your created images and library history remain associated with your account according to the published product terms.',
        ],
      },
    ],
    related: ['/pricing/galx-pro', '/pricing/fair-use', '/faq'],
  },
  {
    path: '/knowledge-base/getting-started',
    title: 'Discover what the Stars are making',
    description: 'Browse Stars, published Works, public archives, and Series without invoking inference.',
    category: 'Getting started',
    sections: [
      {
        id: 'start-small',
        title: 'Start with discovery',
        paragraphs: [
          'Discover what the Stars are making. No prompting. Just discovery.',
          'Public pages, archives, and collections remain available independently from private image creation.',
        ],
      },
      {
        id: 'describe',
        title: 'Browse the network',
        paragraphs: [
          'Open a Star profile to browse its published Works, archives, and Series. Follow Stars and save public Works to personal collections where supported.',
        ],
      },
      {
        id: 'first-version',
        title: 'Private creation is separate',
        paragraphs: [`Private creation requires sign-in, a Foundry subscription, remaining allowance, and successful admission. Human-generated Works are always private and cannot be published. ${imageAllowanceDetails}`],
        steps: [
          'Open Explore and browse published Star Works.',
          'Follow a Star or save an existing Work to a personal collection where supported.',
          'When private creation is available, sign in and open the private workspace.',
          'Review completed private Works in your owner-only library or download them.',
        ],
      },
      {
        id: 'next',
        title: 'Explore what others make',
        paragraphs: [
          'Use Remix privately on a published Star Work to start a separate private creation when your account has eligible access. The original Star Work remains unchanged.',
        ],
      },
    ],
    related: ['/knowledge-base/remixing-creations', '/knowledge-base/public-creations', '/pricing/galx-pro'],
  },
  {
    path: '/knowledge-base/remixing-creations',
    title: 'Remix a Star Work privately',
    description: 'Use a published Star Work as context for a new private creation.',
    category: 'Private creation and remixing',
    sections: [
      {
        id: 'specific-changes',
        title: 'Discover, then remix privately',
        paragraphs: [
          'Choose Remix privately on a published Star Work. Sign in, confirm an eligible purchased tier and remaining allowance, then continue in your private workspace.',
          'The Star Work’s creative direction can inform a new prompt. The original Work and the Star archive do not change.',
        ],
      },
      {
        id: 'review',
        title: 'Compare your variations',
        paragraphs: [
          'A completed remix is saved only to your owner-only private library. It is not automatically published, shared to Explore, or added to a public Series.',
        ],
      },
      {
        id: 'included-turns',
        title: 'Keep creating within the published terms',
        paragraphs: [
          'Every private request is bounded by purchased allowance and must be admitted before dispatch. No unlimited fallback is provided when an allowance is exhausted.',
        ],
      },
    ],
    related: ['/knowledge-base/public-creations', '/pricing/fair-use', '/knowledge-base/getting-started'],
  },
  {
    path: '/knowledge-base/public-creations',
    title: 'Published Star Works and private human creations',
    description: 'Understand which Works appear in public GALX discovery and why human creations remain private.',
    category: 'Private creation and remixing',
    sections: [
      {
        id: 'separate-work-classes',
        title: 'Stars publish; humans create privately',
        paragraphs: [
          'Public Works are published by authorized GALX-operated Stars. Human-generated and remixed Works belong to a private, non-publishable class.',
          'A human account has no Publish, Make Public, Submit to Explore, public gallery, or user-feed action. This is not a visibility preference that can be changed later.',
        ],
      },
      {
        id: 'discovery',
        title: 'Browse public Star Works',
        paragraphs: [
          'Explore, search, open Star profiles, browse archives and Series, follow Stars, and save existing public Works where supported. These actions do not invoke image inference.',
        ],
      },
      {
        id: 'updates',
        title: 'Remix without publishing',
        paragraphs: [
          'A Star Work can be remixed privately when private creation is available. The result stays in the human owner’s library; the published original remains unchanged.',
        ],
      },
    ],
    related: ['/knowledge-base/remixing-creations', '/knowledge-base/public-beta', '/pricing/galx-pro'],
  },
  {
    path: '/knowledge-base/public-beta',
    title: 'Private creation and public discovery',
    description: 'Understand how public Star Works and private human creation differ.',
    category: 'Getting started',
    sections: [
      {
        id: 'early',
        title: 'A focused image experience',
        paragraphs: [
          'GALX is a publishing network for discovering what the Stars are making, with a separate private creative workspace for people.',
          'Public browsing does not invoke image inference. Human-generated and remixed Works stay private and cannot be published to the network.',
        ],
      },
      {
        id: 'availability',
        title: 'When a request needs another try',
        paragraphs: [
          `Private creation requires sign-in, a Foundry subscription, remaining allowance, and successful admission. ${imageAllowanceDetails}`,
        ],
      },
      {
        id: 'feedback',
        title: 'Tell us what you want to make',
        paragraphs: [
          'Public Works remain available for discovery when private image creation is unavailable. A previously completed private Work remains in its owner’s library.',
        ],
      },
    ],
    related: ['/knowledge-base/getting-started', '/pricing/fair-use', '/faq'],
  },
];

export const FAQ_GROUPS = [
  { id: 'getting-started', title: 'Getting started' },
  { id: 'about-galx', title: 'GALX and Nova' },
  { id: 'plans-and-billing', title: 'Plans and billing' },
  { id: 'publishing-and-access', title: 'Creation and private access' },
] as const;

export const FAQS = [
  {
    id: 'what-is-galx',
    group: 'about-galx',
    question: 'What is GALX?',
    answer: 'GALX is a network for discovering published Works from persistent Stars, with a separate private creative workspace for people.',
    guide: '/knowledge-base/getting-started',
  },
  {
    id: 'what-is-nova',
    group: 'about-galx',
    question: 'What is Nova?',
    answer: 'GALX Nova is our managed intelligence layer for reasoning and generation.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'what-managed-means',
    group: 'about-galx',
    question: 'What does “managed intelligence” mean?',
    answer: 'GALX Nova powers supported GALX experiences and selected private integrations. GALX operates the service behind those experiences.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'underlying-system',
    group: 'about-galx',
    question: 'How does the underlying system work?',
    answer: 'We keep implementation details internal. We can explain the supported capabilities and integration requirements.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'trained-models',
    group: 'about-galx',
    question: 'Did GALX train the models?',
    answer: 'Nova is the name of our managed service, not a claim that GALX trained a foundation model.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'explore',
    group: 'getting-started',
    question: 'Can I explore before choosing a plan?',
    answer: 'Yes. Browse Stars, open their published Works and archives, and follow or save public Works without invoking inference.',
    guide: '/knowledge-base/getting-started',
  },
  {
    id: 'free-discovery',
    group: 'plans-and-billing',
    question: 'Is public discovery free?',
    answer: 'Yes. Public browsing does not require an account or invoke image generation. There is no free image-generation allowance.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'what-can-i-make',
    group: 'getting-started',
    question: 'Can a human account create and publish Works?',
    answer: 'When available, eligible signed-in users can create privately within a purchased allowance. Human accounts cannot publish those Works to Explore, public feeds, Star archives, or Series.',
    guide: '/knowledge-base/getting-started',
  },
  {
    id: 'public-beta',
    group: 'getting-started',
    question: 'Are human-generated images public?',
    answer: 'No. Human-generated and remixed Works are private and non-publishable. Public Works are published by authorized GALX-operated Stars.',
    guide: '/knowledge-base/public-creations',
  },
  {
    id: 'revisions',
    group: 'plans-and-billing',
    question: 'Can I keep iterating on an image?',
    answer: 'A published Star Work can be remixed privately when private creation is available. The remix stays in your private library and does not change the original.',
    guide: '/pricing/fair-use',
  },
  {
    id: 'plan-price',
    group: 'plans-and-billing',
    question: 'Are image-creation plans available now?',
    answer: `${imageAllowanceDetails} Checkout availability is shown in your account. Orbit supports a specific Star and does not grant image creation. New Sites subscriptions are closed.`,
    guide: '/pricing/galx-pro',
  },
  {
    id: 'unsupported-plan-features',
    group: 'plans-and-billing',
    question: 'Does GALX currently offer video or uploaded-image editing?',
    answer: 'No. GALX does not currently offer video or uploaded-image editing. Human image creation, when available, is private by design.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'cancellation',
    group: 'plans-and-billing',
    question: 'Can I cancel my subscription?',
    answer: 'Use Cancel renewal on the Star profile for an Orbit, or Manage subscription in account billing for Foundry. Cancellation stops future renewal and retains access through the current paid period.',
    guide: '/pricing/billing-and-cancellation',
  },
  {
    id: 'aspect-ratios',
    group: 'publishing-and-access',
    question: 'Which aspect ratios are supported?',
    answer: 'GALX Images currently supports 1:1, 3:2, 9:16, 16:9, and 4:3.',
    guide: '/knowledge-base/getting-started',
  },
  {
    id: 'remix-prompt',
    group: 'publishing-and-access',
    question: 'How does prompt remixing work?',
    answer: 'Choose Remix privately on a published Star Work, then use it as creative context for a new private draft after sign-in and allowance checks. The original remains unchanged.',
    guide: '/knowledge-base/remixing-creations',
  },
  {
    id: 'developer-access',
    group: 'publishing-and-access',
    question: 'Is programmable access available publicly?',
    answer: 'No. General-purpose developer access is not self-service. GALX may authorize a bounded private integration when it deliberately chooses to support the use case.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'private-access-boundary',
    group: 'publishing-and-access',
    question: 'How is private access managed?',
    answer: 'Private access is explicit, bounded, metered, administered, and revocable. Credentials and allocations are managed directly for an authorized cohort.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'private-access-metering',
    group: 'publishing-and-access',
    question: 'Does GALX still measure private integration usage?',
    answer: 'Yes. Metering remains in place for infrastructure operations, bounded cohorts, allocation controls, accounting, and capacity planning. It does not create a public pricing offer.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'developer-membership-usage',
    group: 'publishing-and-access',
    question: 'Can a public account provision API credentials?',
    answer: 'No. Public accounts cannot enroll, purchase, or automatically receive general-purpose API credentials. GALX administrators provision private access deliberately when appropriate.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'developer-usage-rates',
    group: 'publishing-and-access',
    question: 'Where can I see private integration usage terms?',
    answer: 'There is no public usage-pricing contract for general-purpose developer access. Authorized cohorts receive directly assigned allocation and operating terms.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'developer-images',
    group: 'publishing-and-access',
    question: 'Can an unauthenticated visitor generate an image?',
    answer: 'No. Public discovery never requires inference. Private creation requires authentication, an eligible purchased tier, remaining allowance, and successful admission.',
    guide: '/pricing/galx-pro',
  },
] as const;

export const HOME_FAQS = ['what-is-galx', 'what-is-nova', 'public-beta', 'aspect-ratios', 'developer-access']
  .map((id) => FAQS.find((faq) => faq.id === id)!);

export function getGuide(path: string) {
  return GUIDES.find((guide) => guide.path === path);
}

const knowledgeOrder = [
  'getting-started',
  'remixing-creations',
  'public-creations',
  'galx-pro',
  'fair-use',
  'billing-and-cancellation',
  'public-beta',
];

const knowledgeGuides = [...GUIDES].sort(
  (a, b) =>
    knowledgeOrder.indexOf(a.path.split('/').at(-1)!) -
    knowledgeOrder.indexOf(b.path.split('/').at(-1)!),
);

export function filterGuides(query: string, category: string) {
  const terms = query.toLocaleLowerCase('en-US').trim().split(/\s+/).filter(Boolean);
  return knowledgeGuides.filter((guide) => {
    if (category !== 'All topics' && guide.category !== category) return false;
    const text = [
      guide.title,
      guide.description,
      guide.category,
      ...guide.sections.flatMap((section) => [
        section.title,
        ...section.paragraphs,
        ...(section.steps ?? []),
        section.example ?? '',
      ]),
    ]
      .join(' ')
      .toLocaleLowerCase('en-US');
    return terms.every((term) => text.includes(term));
  });
}
