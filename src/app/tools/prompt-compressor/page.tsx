import React from 'react';
import type { Metadata } from 'next';
import { PromptCompressorToolClient } from '@/components/tools/PromptCompressorToolClient';
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
  title: 'System Prompt Optimizer & Token Compressor — GALXAI Tools',
  description:
    'Free interactive prompt compaction utility. Remove filler tokens and markdown bloat to reduce LLM input token costs by up to 35% with 0% loss in instruction adherence.',
  canonicalPath: '/tools/prompt-compressor',
  keywords: [
    'Prompt Compressor',
    'System Prompt Optimizer',
    'Reduce LLM Token Cost',
    'Token Trimmer',
    'OpenAI Prompt Optimization',
    'Prompt Compression Tool',
    'AEO Developer Utility',
  ],
});

export default function PromptCompressorPage() {
  const toolFaqs = [
    {
      q: 'Does prompt compression degrade model accuracy or instruction adherence?',
      a: 'No. The compaction engine targets semantic redundancy, excessive whitespace, and filler conversational tokens while preserving all core constraints and directives.',
    },
    {
      q: 'How does prompt compression interact with 75% Prompt Caching?',
      a: 'Both work synergistically. Compressing your system prompt reduces the baseline token volume, while prompts over 1,024 tokens receive an additional 75% compound caching discount.',
    },
    {
      q: 'Is prompt optimization done entirely in the browser?',
      a: 'Yes. The prompt compaction engine runs 100% locally in your browser memory for zero data transmission and complete confidentiality.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI System Prompt Optimizer & Token Compressor',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/prompt-compressor`,
    description:
      'Free developer utility to eliminate filler tokens and reduce LLM input token expenses.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive prompt compressor and token optimizer',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Compress System Prompts to Cut LLM Token Ingestion Costs',
    description:
      'Step-by-step instructions to strip semantic fluff and maximize token throughput.',
    totalTime: 'PT15S',
    steps: [
      { name: 'Paste System Prompt', text: 'Input your original system instructions or persona definitions.' },
      { name: 'Review Token Reduction', text: 'Inspect the live before/after token count and projected savings.' },
      { name: 'Deploy Compacted Instructions', text: 'Copy the optimized prompt into your production AI pipeline.' },
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
        { name: 'Prompt Compressor', url: '/tools/prompt-compressor' },
      ]),
      createTechArticleSchema({
        headline: 'System Prompt Optimizer & Token Compressor',
        description:
          'Interactive prompt compaction engine to eliminate conversational fluff and reduce LLM bills.',
        path: '/tools/prompt-compressor',
        keywords: ['Prompt Compression', 'Token Optimization', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <PromptCompressorToolClient />
    </>
  );
}
