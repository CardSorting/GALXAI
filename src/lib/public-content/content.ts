import { PRO_PLAN } from '@/lib/billing/pro-plan';

/** Authored customer guidance only. Operational details and provider identifiers stay private. */
export const PLAN_INCLUSIONS = [
  ['Create', 'High-resolution images across five supported aspect ratios'],
  ['Explore', 'Browse the public community stream and find ideas to remix'],
  ['Remix', 'Reuse prompts and iterate in the Image Studio'],
  ['Download', 'Download generated images from your library'],
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
        title: 'Developer access is separate',
        paragraphs: [
          'GALX Developer is the separate route for programmable access to GALX Nova. Developer Access is a $50/month recurring API access subscription.',
          'The subscription is an access fee. Usage is billed separately and no usage credits are included. Review supported capabilities and the applicable usage terms before building.',
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
          'These terms describe image creation in GALX Images. Developer access is a separate route with its own supported capabilities and usage terms.',
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
          'Developer API access is separate from the consumer image plan and has separate access and usage terms.',
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
          'Feedback about prompts, discovery, and the Image Studio helps us improve the experience. Developers can subscribe to build with supported Nova capabilities through the API.',
        ],
      },
    ],
    related: ['/knowledge-base/getting-started', '/pricing/fair-use', '/faq'],
  },
  {
    path: '/knowledge-base/images-and-developer-access',
    title: 'GALX Images and Developer access',
    description: 'Choose the right path: create in GALX Images or build with GALX Nova through Developer.',
    category: 'Getting started',
    sections: [
      {
        id: 'images',
        title: 'Create in GALX Images',
        paragraphs: [
          'GALX Images is the consumer experience for describing, creating, exploring, and remixing images. It is the simplest place to start.',
        ],
      },
      {
        id: 'developers',
        title: 'Build with GALX Nova',
        paragraphs: [
          'GALX Nova is our managed intelligence layer for reasoning and generation. You use the capability; GALX handles the underlying execution.',
          'Developer Access is a $50/month recurring membership for API access. Usage is billed separately and no usage credits are included. Review supported capabilities and applicable usage terms before building.',
          'The API exposes supported capabilities documented for developers. The Image Studio and API may not expose identical capabilities.',
        ],
      },
      {
        id: 'model-boundary',
        title: 'What Nova does—and does not—claim',
        paragraphs: [
          'Nova names the managed service. It is not a claim that GALX trained a foundation model, and “managed” does not promise unlimited capacity, a dedicated cluster, human-reviewed responses, enterprise support, or guaranteed outputs.',
          'For integration requirements and supported capabilities, use the Developer documentation.',
        ],
      },
    ],
    related: ['/pricing/galx-pro', '/knowledge-base/getting-started', '/faq'],
  },
];

export const FAQ_GROUPS = [
  { id: 'getting-started', title: 'Getting started' },
  { id: 'about-galx', title: 'GALX and Nova' },
  { id: 'plans-and-billing', title: 'Plans and billing' },
  { id: 'publishing-and-access', title: 'Creation and Developer access' },
] as const;

export const FAQS = [
  {
    id: 'what-is-galx',
    group: 'about-galx',
    question: 'What is GALX?',
    answer: 'GALX lets people create AI images. The intelligence service behind the experience is called Nova, and developers can subscribe for API access.',
    guide: '/knowledge-base/getting-started',
  },
  {
    id: 'what-is-nova',
    group: 'about-galx',
    question: 'What is Nova?',
    answer: 'GALX Nova is our managed intelligence layer for reasoning and generation.',
    guide: '/knowledge-base/images-and-developer-access',
  },
  {
    id: 'what-managed-means',
    group: 'about-galx',
    question: 'What does “managed intelligence” mean?',
    answer: 'You use GALX Nova through the API. GALX operates the service behind that API; you build your application around its supported capabilities.',
    guide: '/knowledge-base/images-and-developer-access',
  },
  {
    id: 'underlying-system',
    group: 'about-galx',
    question: 'How does the underlying system work?',
    answer: 'We keep implementation details internal. We can explain the supported capabilities and integration requirements.',
    guide: '/knowledge-base/images-and-developer-access',
  },
  {
    id: 'trained-models',
    group: 'about-galx',
    question: 'Did GALX train the models?',
    answer: 'Nova is the name of our managed service, not a claim that GALX trained a foundation model.',
    guide: '/knowledge-base/images-and-developer-access',
  },
  {
    id: 'explore',
    group: 'getting-started',
    question: 'Can I explore before choosing a plan?',
    answer: 'Yes. Create in GALX Images, explore the public community stream, and review the published plan terms before subscribing.',
    guide: '/knowledge-base/getting-started',
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
    question: 'How do I build with Nova?',
    answer: 'Subscribe to GALX Nova Developer Access, a $50/month membership for supported reasoning and generation capabilities through the documented API. Usage is billed separately and no usage credits are included.',
    guide: '/knowledge-base/images-and-developer-access',
  },
  {
    id: 'developer-membership-price',
    group: 'publishing-and-access',
    question: 'What am I paying $50/month for?',
    answer: 'The recurring subscription gives you access to GALX Nova through its API. It is an access membership, not a purchase of usage credits. API usage is billed separately.',
    guide: '/knowledge-base/images-and-developer-access',
  },
  {
    id: 'developer-membership-model',
    group: 'publishing-and-access',
    question: 'How does the membership model work?',
    answer: 'Think of Developer Access like membership to a managed workspace. The subscription gives you access to the service; consumption is billed separately. For GALX Nova, the membership is $50/month for API access, with no usage credits included.',
    guide: '/knowledge-base/images-and-developer-access',
  },
  {
    id: 'developer-membership-usage',
    group: 'publishing-and-access',
    question: 'Does the membership include $50 of API usage?',
    answer: 'No. The monthly fee is for API access. It is not converted into credits, applied against usage charges, or treated as a prepaid balance. Developer usage is billed separately at $0.02 per completed message with a default $25 monthly usage cap.',
    guide: '/pricing/usage',
  },
  {
    id: 'developer-usage-rates',
    group: 'publishing-and-access',
    question: 'Where can I see Nova usage rates?',
    answer: 'A separate usage-pricing contract has not been published. Developer Access remains $50/month for API access with no usage credits included; do not infer rates from model metadata, examples, or historical pages.',
    guide: '/pricing/usage',
  },
  {
    id: 'developer-images',
    group: 'publishing-and-access',
    question: 'Do I need Developer Access to create images in GALX?',
    answer: 'No. Developer Access is for integrating the API into an application. Image creation within GALX uses the separate consumer product and its applicable access requirements.',
    guide: '/knowledge-base/images-and-developer-access',
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
  'images-and-developer-access',
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
