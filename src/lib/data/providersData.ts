/**
 * AI Model Provider Hub Dataset for pSEO and AEO
 */

export interface ProviderPortalItem {
  slug: string;
  providerName: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  fleetSummary: string;
  discountPct: number;
  featuredModels: {
    id: string;
    name: string;
    role: string;
    context: string;
    inputPrice: string;
    outputPrice: string;
    discount: string;
  }[];
  quickstartSnippet: {
    language: string;
    code: string;
  };
  keyAdvantages: string[];
  faqs: { q: string; a: string }[];
}

export const PROVIDERS_DATA: ProviderPortalItem[] = [
  {
    slug: 'openai',
    providerName: 'GALX Managed Gateway',
    badge: 'Sustainable Intelligence',
    title: 'GALX Managed Intelligence Portal — Sustainable Frontier Access',
    headline: 'Build What You Want. GALX Handles the Intelligence Layer.',
    description:
      'Access curated frontier models (GALX Nova & GALX Nova-image) through a single unified OpenAI wire-compatible API gateway with sustainable developer rates, automated prompt caching, and zero code refactoring.',
    fleetSummary:
      'Curated reasoning engine GALX Nova and high-fidelity visual synthesis studio GALX Nova-image.',
    discountPct: 40,
    featuredModels: [
      {
        id: 'galx-nova',
        name: 'GALX Nova',
        role: 'Sustainable Intelligence & Reasoning',
        context: '1,050,000 Tokens',
        inputPrice: '$0.20/1M',
        outputPrice: '$1.20/1M',
        discount: 'Optimal $/Perf',
      },
      {
        id: 'galx-nova-image',
        name: 'GALX Nova-image',
        role: 'Creative Visual Synthesis',
        context: '128K Tokens',
        inputPrice: '$0.060/1M',
        outputPrice: 'Visual output',
        discount: '-25% Off',
      },
    ],
    quickstartSnippet: {
      language: 'python',
      code: `from openai import OpenAI

# Direct OpenAI Wire-Compatibility with GALX Nova
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="galx-nova",
    messages=[{"role": "user", "content": "Execute high-tier architectural analysis"}]
)

print(response.choices[0].message.content)`,
    },
    keyAdvantages: [
      'Sustainable developer rates with zero gateway markups',
      'Zero annual Provisioned Throughput Unit (PTU) or seat license lock-in',
      'Automatic prompt caching rebate on repetitive prefixes >1,024 tokens',
      'Cryptographic Zero Data Retention (ZDR) and enterprise security',
    ],
    faqs: [
      {
        q: 'How does GALX deliver sustainable intelligence rates?',
        a: 'GALX handles the underlying execution so developers can focus on building, eliminating infrastructure overhead and passing prompt caching savings directly to your account.',
      },
      {
        q: 'How does prompt caching work on GALX Nova?',
        a: 'GALX passes automated prompt caching rebates directly to your wallet for prompt prefixes exceeding 1,024 tokens, reducing input costs by up to 90%.',
      },
    ],
  },
];
