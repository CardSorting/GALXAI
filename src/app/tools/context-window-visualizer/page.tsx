import React from 'react';
import type { Metadata } from 'next';
import { ContextWindowVisualizerClient } from '@/components/tools/ContextWindowVisualizerClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createHowToSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'LLM Context Window Capacity & Prompt Caching Visualizer — GALXAI Tools',
  description:
    'Interactive 1,000,000 token context window visualizer and caching calculator for OpenAI GPT-5.6 and xAI Grok 4.6. Calculate word counts, document capacity, and 75% prompt caching savings.',
  canonicalPath: '/tools/context-window-visualizer',
  keywords: [
    'LLM Context Window Visualizer',
    '1M Context Window Calculator',
    '1 Million Token Capacity',
    'GPT-5.6 Sol Context Window',
    'Grok 4.6 1M Context',
    'Prompt Caching Breakpoint',
    'Tokens to Words Calculator',
    'pSEO AI Tools',
    'AEO Grounding',
  ],
});

export default function ContextWindowVisualizerPage() {
  const toolFaqs = [
    {
      q: 'What is the largest context window available on GALXAI?',
      a: 'xAI Grok 4.6 offers a 1,000,000 (1M) token context window, while OpenAI GPT-5.6 Sol, Terra, and Luna offer 900,000 (900K) tokens with sub-15ms Anycast TTFT.',
    },
    {
      q: 'How does prompt caching work on 1M token contexts?',
      a: 'When sending repeated prompts exceeding 1,024 tokens with identical leading prefixes (e.g. system instructions, documentation, or code repositories), GALXAI passes through the provider 75% cached token rebate automatically.',
    },
    {
      q: 'How are tokens converted to word and page counts?',
      a: 'For English text, 1 token is approximately 0.75 words. A standard single-spaced document page contains about 350 to 500 words (450 to 650 tokens). In programming code, 1 token is approximately 12 characters or 1/12 of a code line.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI LLM Context Window & Caching Visualizer',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/context-window-visualizer`,
    description:
      'Interactive 1M token context capacity simulator, document equivalence estimator, and prompt caching rebate calculator.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive context capacity and prompt caching tool',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Calculate LLM Context Capacity and Caching Rebates',
    description:
      'Step-by-step instructions to simulate token utilization and calculate prefix caching discounts.',
    totalTime: 'PT10S',
    steps: [
      { name: 'Select Model', text: 'Choose between Grok 4.6 (1M), GPT-5.6 Sol (900K), or GPT-5.6 Luna.' },
      { name: 'Adjust Token Volume', text: 'Move the slider or click a preset (monorepo, textbook, whitepaper).' },
      { name: 'Inspect Capacity & Savings', text: 'View word equivalence, page count, and 75% prompt caching savings.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: 'Python 1M Context Ingestion Snippet',
    programmingLanguage: 'Python',
    codeSample: 'from openai import OpenAI\nclient = OpenAI(base_url="https://api.galx.ai/v1", api_key="galx_live_...")\nresponse = client.chat.completions.create(model="x-ai/grok-4.6", messages=[{"role": "user", "content": "Analyze 1M token context"}])',
    targetUrl: 'https://galx.ai/tools/context-window-visualizer#code-snippet',
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      appSchema,
      howToSchema,
      codeSchema,
      createFAQPageSchema(toolFaqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Tools', url: '/calculator' },
        { name: 'Context Window Visualizer', url: '/tools/context-window-visualizer' },
      ]),
      createTechArticleSchema({
        headline: 'LLM Context Window Capacity & Prompt Caching Visualizer',
        description:
          'Simulate token capacity across 1M, 900K, and 500K context windows with wholesale pricing and prompt caching discounts.',
        path: '/tools/context-window-visualizer',
        keywords: ['Context Window Visualizer', '1M Tokens', 'Prompt Caching', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ContextWindowVisualizerClient />
    </>
  );
}
