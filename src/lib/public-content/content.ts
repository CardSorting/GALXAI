import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { FREE_IMAGE_OFFER, IMAGE_PLAN_FEATURES } from '@/lib/data/pricingSummary';

/** Authored customer guidance only. Operational details and provider identifiers stay private. */
export const PLAN_INCLUSIONS = [
  ['Create', IMAGE_PLAN_FEATURES[0]],
  ['Compose', IMAGE_PLAN_FEATURES[1]],
  ['Detail', IMAGE_PLAN_FEATURES[2]],
  ['Keep iterating', 'Save to your library, favorite, remix, and download'],
  ['Share', 'Public sharing controls with creations public by default'],
] as const;

export const FREE_PLAN_INCLUSIONS = [
  ['Allowance', FREE_IMAGE_OFFER.allowance],
  ['Create', IMAGE_PLAN_FEATURES[0]],
  ['Compose', IMAGE_PLAN_FEATURES[1]],
  ['Explore', 'Browse public creations and discover prompts to remix'],
] as const;

export type Guide = {
  path: string;
  title: string;
  description: string;
  category: 'Getting started' | 'Creating and publishing' | 'Plans and billing';
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
    title: 'What’s included in GALX Pro',
    description: 'Understand the GALX Pro image-creation plan, its published monthly terms, and fair-use boundaries.',
    category: 'Plans and billing',
    sections: [
      {
        id: 'the-plan',
        title: 'One plan for image creation',
        paragraphs: [
          PRO_PLAN.name + ' costs $' + PRO_PLAN.monthlyPriceUsd + ' USD per month for one account. It supports image creation, community discovery, prompt reuse, and access to your image library.',
          'Generated images are public by default and may appear in the community stream. Review the published plan terms before subscribing.',
        ],
      },
      {
        id: 'free-start',
        title: 'Try it before subscribing',
        paragraphs: [
          FREE_IMAGE_OFFER.allowance.charAt(0).toUpperCase() + FREE_IMAGE_OFFER.allowance.slice(1) + '. The allowance is designed to let you experience the full creation loop before choosing a recurring plan.',
          'A request for four images uses four outputs. The Image Studio keeps the batch size visible so the allowance is easy to understand.',
        ],
      },
      {
        id: 'before-subscribing',
        title: 'Explore before you decide',
        paragraphs: [
          'Open GALX Images to create, explore the community stream, and try prompt variations. Sign in when you are ready to save work to your account.',
          'A subscription starts only after you confirm the plan in the account billing flow.',
        ],
      },
      {
        id: 'included',
        title: 'From prompt to image',
        paragraphs: [
          'Describe an image, choose a supported aspect ratio, create it, and keep iterating in the Image Studio. You can revisit creations in your library and download them when ready.',
          'The public stream is a place to discover ideas and reuse prompts—not a guarantee that every image or capability is available through the Developer API.',
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
          'GALX Pro supports ongoing image creation and prompt iteration in the Image Studio under fair use. Use the published plan terms as the source of truth for your account.',
          'Fair use describes how the image experience is operated. It does not promise unlimited capacity, guaranteed availability, or a particular response time.',
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
          'These terms describe image creation in GALX Images. Selected private integrations are administered separately and do not change the consumer image contract.',
        ],
      },
    ],
    related: ['/pricing/galx-pro', '/knowledge-base/getting-started', '/knowledge-base/public-beta'],
  },
  {
    path: '/pricing/billing-and-cancellation',
    title: 'Billing and cancellation',
    description: 'Review the published GALX Pro billing cadence and how to manage your subscription.',
    category: 'Plans and billing',
    sections: [
      {
        id: 'monthly-billing',
        title: 'Monthly billing',
        paragraphs: [
          PRO_PLAN.name + ' is $' + PRO_PLAN.monthlyPriceUsd + ' USD per month and renews monthly. Review the plan in your account before subscribing.',
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
          'Use the account billing controls to cancel. Your account will show the applicable end of access for the current paid period.',
          'Your created images and library history remain associated with your account according to the published product terms.',
        ],
      },
    ],
    related: ['/pricing/galx-pro', '/pricing/fair-use', '/faq'],
  },
  {
    path: '/knowledge-base/getting-started',
    title: 'Create your first image',
    description: 'Turn an idea into an image with GALX Images and the Image Studio.',
    category: 'Getting started',
    sections: [
      {
        id: 'start-small',
        title: 'Bring an idea',
        paragraphs: [
          'GALX is where people create. Start with a subject, a setting, or a feeling, then add details that matter to you.',
          'You do not need an infrastructure plan to begin. Describe the image you want to create and let the studio handle the rest.',
        ],
        example: 'A quiet alpine lake at first light, paper-cut collage style, cool blues, warm window-like highlights',
      },
      {
        id: 'describe',
        title: 'Choose an aspect ratio',
        paragraphs: [
          'Choose from the supported aspect ratios: 1:1, 3:2, 9:16, 16:9, and 4:3. The ratio helps the composition fit the way you want to use the image.',
        ],
      },
      {
        id: 'first-version',
        title: 'Create and iterate',
        paragraphs: ['Sign in when you want to save work to your library. Then keep refining the prompt until the image feels right.'],
        steps: [
          'Open GALX Images or use the homepage prompt field.',
          'Describe the image you want to create and choose an aspect ratio.',
          'Create the image.',
          'Review it, reuse the prompt, or download it from your library.',
        ],
      },
      {
        id: 'next',
        title: 'Explore what others make',
        paragraphs: [
          'Explore images created on GALX to find your next idea. Creations are public by default and may appear in the community stream.',
        ],
      },
    ],
    related: ['/knowledge-base/remixing-creations', '/knowledge-base/public-creations', '/pricing/galx-pro'],
  },
  {
    path: '/knowledge-base/remixing-creations',
    title: 'Remix and iterate on prompts',
    description: 'Reuse a prompt from a creation and make the next version your own.',
    category: 'Creating and publishing',
    sections: [
      {
        id: 'specific-changes',
        title: 'Start from an idea',
        paragraphs: [
          'Choose Remix on a community creation or library image to bring its prompt into the Image Studio. Adjust the subject, composition, lighting, mood, or style.',
          'GALX carries forward the supported creation settings needed for the studio flow. It does not expose internal execution details.',
        ],
      },
      {
        id: 'review',
        title: 'Compare your variations',
        paragraphs: [
          'Review new images in your library, keep the versions you like, and download a creation when it is ready to leave the studio.',
        ],
      },
      {
        id: 'included-turns',
        title: 'Keep creating within the published terms',
        paragraphs: [
          'The image experience is subject to the published plan terms and fair-use boundaries. No plan description here promises unlimited capacity or a guaranteed response time.',
        ],
      },
    ],
    related: ['/knowledge-base/public-creations', '/pricing/fair-use', '/knowledge-base/getting-started'],
  },
  {
    path: '/knowledge-base/public-creations',
    title: 'Public creations and community discovery',
    description: 'Understand what public by default means for creations shared through GALX.',
    category: 'Creating and publishing',
    sections: [
      {
        id: 'public-default',
        title: 'Public by default',
        paragraphs: [
          'Creations made in GALX Images are public by default and may enter the community stream. This is part of the product experience, not a statement about how the underlying service operates.',
          'Review the current product controls and terms before creating anything that should not be shared publicly.',
        ],
      },
      {
        id: 'publish',
        title: 'Explore the community stream',
        paragraphs: [
          'Browse real public creations in a responsive gallery. Search prompts, filter by aspect ratio or style, and remix an idea into your own studio session.',
        ],
      },
      {
        id: 'updates',
        title: 'Download and share',
        paragraphs: [
          'Download a creation from the studio or a public stream card. Share the resulting image link when you want others to see the work.',
        ],
      },
    ],
    related: ['/knowledge-base/remixing-creations', '/knowledge-base/public-beta', '/pricing/galx-pro'],
  },
  {
    path: '/knowledge-base/public-beta',
    title: 'What to expect from GALX Images',
    description: 'A plain-language guide to creating, exploring, and sharing in GALX Images.',
    category: 'Getting started',
    sections: [
      {
        id: 'early',
        title: 'A focused image experience',
        paragraphs: [
          'GALX puts the creation experience first: describe an image, create it, and explore what others are making.',
          'The service behind the experience is GALX Nova, our managed intelligence layer for reasoning and generation.',
        ],
      },
      {
        id: 'availability',
        title: 'When a request needs another try',
        paragraphs: [
          'Availability and completion time can vary. Follow the status in the studio and retry when the product asks you to. Public copy does not promise a particular speed or capacity.',
        ],
      },
      {
        id: 'feedback',
        title: 'Tell us what you want to make',
        paragraphs: [
          'Feedback about prompts, discovery, and the Image Studio helps us improve the experience. Selected integrations may be authorized to use supported Nova capabilities.',
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
    answer: 'GALX lets people create AI images. The intelligence service behind the experience is called Nova, and selected private integrations may be authorized by decision.',
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
    answer: 'Yes. Create in GALX Images, explore the public community stream, and review the published plan terms before subscribing.',
    guide: '/knowledge-base/getting-started',
  },
  {
    id: 'free-allowance',
    group: 'plans-and-billing',
    question: 'What can I try for free?',
    answer: 'Verified accounts receive a one-time allowance of five image outputs. A four-image request uses four outputs, so the Image Studio keeps the balance easy to understand.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'what-can-i-make',
    group: 'getting-started',
    question: 'What can I create with GALX Images?',
    answer: 'Describe the image you want to make, then choose from the supported aspect ratios: 1:1, 3:2, 9:16, 16:9, and 4:3.',
    guide: '/knowledge-base/getting-started',
  },
  {
    id: 'public-beta',
    group: 'getting-started',
    question: 'Are generated images public?',
    answer: 'Creations made in GALX Images are public by default and may appear in the community stream. Review the current product controls and terms before creating anything that should not be shared publicly.',
    guide: '/knowledge-base/public-creations',
  },
  {
    id: 'revisions',
    group: 'plans-and-billing',
    question: 'Can I keep iterating on an image?',
    answer: 'Yes. Reuse a prompt and continue creating within the published plan terms and fair-use boundaries. No plan description promises unlimited capacity or a guaranteed response time.',
    guide: '/pricing/fair-use',
  },
  {
    id: 'plan-price',
    group: 'plans-and-billing',
    question: 'How much does GALX Pro cost?',
    answer: 'GALX Pro is $' + PRO_PLAN.monthlyPriceUsd + ' USD per month for one account. Review the plan and fair-use terms before subscribing.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'unsupported-plan-features',
    group: 'plans-and-billing',
    question: 'Does GALX currently offer video or private generation modes?',
    answer: 'No. GALX currently publishes image creation only. Video, Fast or Relax modes, uploaded-image editing, Stealth and separate concurrency tiers are not advertised as current consumer capabilities.',
    guide: '/pricing/galx-pro',
  },
  {
    id: 'cancellation',
    group: 'plans-and-billing',
    question: 'Can I cancel my subscription?',
    answer: 'Use the account billing controls to cancel. Your account will show the applicable end of access for the current paid period.',
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
    answer: 'Choose Remix on a public creation or an image in your library to bring its prompt into the Image Studio, then change it to fit your idea.',
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
    question: 'Do I need private integration access to create images in GALX?',
    answer: 'No. Image creation within GALX uses the consumer product and its applicable access requirements.',
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
