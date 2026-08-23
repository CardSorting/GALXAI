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
    providerName: 'OpenAI',
    badge: 'Wholesale Gateway',
    title: 'OpenAI API Gateway & Wholesale Token Clearinghouse — 25%–40% Off',
    headline: 'Access Official OpenAI Frontier Models at Wholesale Rates',
    description:
      'Direct Anycast routing for OpenAI Codex (GPT-5.6 Sol, Terra, Luna) and visual synthesis with 0% gateway markup, 75% prompt caching pass-through, and $5 free developer credits.',
    fleetSummary:
      'The complete OpenAI GPT-5.6 reasoning fleet, high-velocity coding models, and GPT-Image-2 studio endpoints.',
    discountPct: 40,
    featuredModels: [
      {
        id: 'gpt-5.6-sol',
        name: 'GPT-5.6 Sol',
        role: 'Frontier Reasoning & Coding',
        context: '900K Tokens',
        inputPrice: '$3.75/1M',
        outputPrice: '$11.25/1M',
        discount: '-25% Off',
      },
      {
        id: 'gpt-5.6-terra',
        name: 'GPT-5.6 Terra',
        role: 'Balanced Production Workhorses',
        context: '750K Tokens',
        inputPrice: '$2.25/1M',
        outputPrice: '$6.75/1M',
        discount: '-25% Off',
      },
      {
        id: 'gpt-5.6-luna',
        name: 'GPT-5.6 Luna',
        role: 'Extreme Velocity (145 tok/s)',
        context: '500K Tokens',
        inputPrice: '$0.75/1M',
        outputPrice: '$2.25/1M',
        discount: '-25% Off',
      },
      {
        id: 'openai-gpt-image-2',
        name: 'GPT-Image-2',
        role: 'Photorealistic Studio HD',
        context: '1024x1024',
        inputPrice: '$0.032/img',
        outputPrice: 'HD Output',
        discount: '-20% Off',
      },
    ],
    quickstartSnippet: {
      language: 'python',
      code: `from openai import OpenAI

# Direct OpenAI Wire-Compatibility with 25%-40% Wholesale Pass
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Execute high-tier architectural analysis"}]
)

print(response.choices[0].message.content)`,
    },
    keyAdvantages: [
      'True 25%–40% wholesale discount passed directly from volume clearinghouses',
      'Zero annual Provisioned Throughput Unit (PTU) or seat license lock-in',
      'Automatic 75% compound prompt caching rebate on prefixes >1,024 tokens',
      'Cryptographic Zero Data Retention (ZDR) and SOC 2 Type II compliance',
    ],
    faqs: [
      {
        q: 'Are these models authentic OpenAI weights?',
        a: 'Yes. All completions route through verified OpenAI enterprise infrastructure with zero alterations to token logits or mathematical attention matrices.',
      },
      {
        q: 'How does prompt caching work on OpenAI models?',
        a: 'GALXAI passes 100% of the 75% prompt caching rebate directly to your wallet for prompt prefixes exceeding 1,024 tokens.',
      },
    ],
  },
  {
    slug: 'xai',
    providerName: 'xAI',
    badge: '1M Context Gateway',
    title: 'xAI Grok API Gateway — Wholesale Grok 4.6 (1M Context) & Grok 4.5',
    headline: 'Access xAI Grok 4.6 & 4.5 with Sub-15ms Anycast Routing',
    description:
      'Deploy xAI Grok frontier reasoning models with 1,000,000 token context windows, real-time multimodal vision, and wholesale token pricing via standard OpenAI SDK compatibility.',
    fleetSummary:
      'The flagship xAI Grok 4.6 1M-token cognitive reasoning engine and Grok 4.5 multimodal vision models.',
    discountPct: 30,
    featuredModels: [
      {
        id: 'x-ai/grok-4.6',
        name: 'xAI Grok 4.6',
        role: '1,000,000 Token Massive Context',
        context: '1,000K Tokens',
        inputPrice: '$2.80/1M',
        outputPrice: '$8.40/1M',
        discount: '-30% Off',
      },
      {
        id: 'x-ai/grok-4.5',
        name: 'xAI Grok 4.5',
        role: 'Multimodal Vision & High-Speed Chat',
        context: '500K Tokens',
        inputPrice: '$2.40/1M',
        outputPrice: '$7.20/1M',
        discount: '-20% Off',
      },
    ],
    quickstartSnippet: {
      language: 'python',
      code: `from openai import OpenAI

# 1-Line Drop-in Client for xAI Grok with 1M Token Context
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="x-ai/grok-4.6",
    messages=[{"role": "user", "content": "Analyze 1M token codebase context"}]
)

print(response.choices[0].message.content)`,
    },
    keyAdvantages: [
      'Massive 1,000,000 token context window for full-repository ingestion',
      'Sub-15ms Anycast Time-To-First-Token across North America, Europe, and Asia',
      'Standard OpenAI SDK drop-in integration (zero custom SDK needed)',
      'Direct wholesale rates starting on your very first token',
    ],
    faqs: [
      {
        q: 'Can I use the standard openai python package for xAI Grok?',
        a: 'Yes. GALXAI provides 100% wire-compatibility, translating standard chat completions calls directly to xAI models.',
      },
    ],
  },
];
