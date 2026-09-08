import React from 'react';
import type { Metadata } from 'next';
import { PromptCachingToolClient } from '@/components/tools/PromptCachingToolClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createHowToSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Prompt Caching Estimator & Token Prefix Counter — GALXAI Tools',
  description:
    'Free interactive prompt token counter and KV cache savings analyzer. Check 1,024-token prefix caching eligibility and calculate instant 75% compound cost savings across OpenAI and Grok.',
  canonicalPath: '/tools/prompt-caching-calculator',
  keywords: [
    'Prompt Caching Calculator',
    'LLM Token Counter',
    'OpenAI Prompt Token Estimator',
    'KV Cache Savings',
    '75% Prompt Caching Rebate',
    'Prompt Token Counter',
    'AEO Developer Tool',
  ],
});

export default function PromptCachingToolPage() {
  const toolFaqs = [
    {
      q: 'How does GALXAI detect and match cached prompt prefixes?',
      a: 'GALXAI evaluates prompt prefixes in volatile RAM slices. If the leading tokens exceed 1,024 tokens and match previous requests, the 75% discount applies automatically with zero code changes.',
    },
    {
      q: 'Do cached prompts expire?',
      a: 'Prompt caches stay warm in RAM during active usage. Typically caches remain warm for 5 to 10 minutes following the most recent request.',
    },
    {
      q: 'Does prompt caching alter the model response or token quality?',
      a: 'Zero difference. Cached tokens reuse exact mathematical Key-Value (KV) attention matrices, guaranteeing mathematically identical completions to non-cached requests.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI Prompt Caching Estimator & Token Prefix Counter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/prompt-caching-calculator`,
    description:
      'Free developer utility to measure prompt token counts and calculate 75% prompt caching savings.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive token counter and caching estimator',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Estimate and Activate 75% Prompt Caching Savings',
    description:
      'Step-by-step instructions to analyze prompt prefixes and claim wholesale caching rebates.',
    totalTime: 'PT15S',
    steps: [
      { name: 'Paste System Prompt', text: 'Input your system instructions or RAG documents.' },
      { name: 'Verify 1,024-Token Threshold', text: 'Ensure prefix tokens exceed 1,024 tokens.' },
      { name: 'Deploy via Anycast Gateway', text: 'Point baseURL to https://galx.ai/v1 to receive automatic 75% rebates.' },
    ],
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      appSchema,
      howToSchema,
      createFAQPageSchema(toolFaqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Tools', url: '/calculator' },
        { name: 'Prompt Caching Estimator', url: '/tools/prompt-caching-calculator' },
      ]),
      createTechArticleSchema({
        headline: 'Prompt Caching Estimator & Token Prefix Counter',
        description:
          'Interactive token counter and KV cache savings analyzer for OpenAI and xAI models.',
        path: '/tools/prompt-caching-calculator',
        keywords: ['Prompt Caching', 'Token Counter', 'LLM Pricing', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <PromptCachingToolClient />
    </>
  );
}
