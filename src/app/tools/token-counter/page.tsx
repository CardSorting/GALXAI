import React from 'react';
import type { Metadata } from 'next';
import { TokenCounterToolClient } from '@/components/tools/TokenCounterToolClient';
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
  title: 'AI Token Counter & BPE Tokenizer Studio — GALXAI Tools',
  description:
    'Free interactive Byte-Pair Encoding (BPE) token counter and subword inspector for frontier LLMs. Calculate token slices, byte counts, and wholesale inference pricing.',
  canonicalPath: '/tools/token-counter',
  keywords: [
    'AI Token Counter',
    'tiktoken Online Calculator',
    'BPE Tokenizer Studio',
    'o200k_base Tokenizer',
    'cl100k_base Token Counter',
    'Token to Word Ratio',
    'pSEO Tools',
    'AEO Tokenizer Guide',
  ],
});

export default function TokenCounterPage() {
  const toolFaqs = [
    {
      q: 'What is Byte-Pair Encoding (BPE)?',
      a: 'Byte-Pair Encoding (BPE) is the subword tokenization algorithm used by OpenAI and frontier LLMs to convert raw text into numerical token IDs for neural network processing.',
    },
    {
      q: 'What is the difference between cl100k_base and o200k_base?',
      a: 'cl100k_base was introduced with earlier models with a 100k vocabulary. o200k_base powers frontier models with a 200k vocabulary, improving compression density by 15%–20% on code and non-English text.',
    },
    {
      q: 'How does token count affect prompt caching rebates on GALXAI?',
      a: 'Prompts with identical leading prefixes exceeding 1,024 tokens automatically qualify for 75% prompt caching discounts.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI AI Token Counter & BPE Studio',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/token-counter`,
    description:
      'Interactive BPE token counter, subword slice visualizer, and multi-model inference cost calculator.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive BPE token counter and visualizer',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Count and Inspect BPE Tokens in Text',
    description:
      'Step-by-step instructions to analyze token counts and calculate API costs.',
    totalTime: 'PT10S',
    steps: [
      { name: 'Paste Text', text: 'Enter system prompts or user messages into the input area.' },
      { name: 'Select Tokenizer', text: 'Choose between o200k_base (GALX Nova / modern) and cl100k_base (legacy).' },
      { name: 'Review Token Slices', text: 'Inspect individual colored subwords and model price estimates.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: 'Python tiktoken BPE Quickstart',
    programmingLanguage: 'Python',
    codeSample: 'import tiktoken\nenc = tiktoken.get_encoding("o200k_base")\ntokens = enc.encode("Hello world")',
    targetUrl: 'https://galx.ai/tools/token-counter#tokenizer-code-snippet',
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
        { name: 'Token Counter', url: '/tools/token-counter' },
      ]),
      createTechArticleSchema({
        headline: 'OpenAI Token Counter & BPE Tokenizer Studio',
        description:
          'Inspect BPE subword tokens, visualize token boundaries, and calculate model inference costs.',
        path: '/tools/token-counter',
        keywords: ['Token Counter', 'tiktoken', 'BPE Tokenizer', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <TokenCounterToolClient />
    </>
  );
}
