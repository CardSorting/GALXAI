import React from 'react';
import type { Metadata } from 'next';
import { ModelCostComparatorToolClient } from '@/components/tools/ModelCostComparatorToolClient';
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
  title: 'AI Model Cost Comparator & Wholesale Pricing Calculator — GALXAI Tools',
  description:
    'Free interactive LLM cost comparator. Calculate side-by-side monthly inference invoices across OpenAI GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna, and xAI Grok with 75% prompt caching savings.',
  canonicalPath: '/tools/model-cost-comparator',
  keywords: [
    'LLM Price Comparison',
    'OpenAI vs Grok Cost Calculator',
    'GPT-5.6 Pricing Calculator',
    'Prompt Caching Savings Estimator',
    'AI Gateway Wholesale Rates',
    'pSEO Tools',
    'AEO Pricing Guide',
  ],
});

export default function ModelCostComparatorPage() {
  const toolFaqs = [
    {
      q: 'How does GALXAI offer 25% to 40% wholesale pricing compared to direct providers?',
      a: 'GALXAI pools massive multi-tenant GPU reservation volumes with upstream infrastructure providers, passing wholesale volume tier discounts directly to developers without middleman surcharges.',
    },
    {
      q: 'How does the 75% Prompt Caching discount work?',
      a: 'When an incoming request shares an identical prefix of 1,024+ tokens with previous requests, the cached tokens are processed at a 75% discount ($0.25 on the dollar) and delivered in <15ms.',
    },
    {
      q: 'Can I switch between OpenAI and xAI models using the same API key?',
      a: 'Yes. A single GALXAI API key unlocks unified routing across GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna, Grok 4.6 (1M context), and GPT-Image-2.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI Model Cost Comparator & Pricing Studio',
    applicationCategory: 'FinancialApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/model-cost-comparator`,
    description:
      'Interactive side-by-side LLM pricing comparator with prompt caching savings modeling.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive model pricing comparator',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Compare LLM Inference Invoices and Calculate Savings',
    description:
      'Step-by-step instructions to model monthly token workloads across frontier AI models.',
    totalTime: 'PT15S',
    steps: [
      { name: 'Adjust Monthly Token Volume', text: 'Set your expected monthly input and output token millions.' },
      { name: 'Configure Cache Hit Ratio', text: 'Simulate the percentage of repetitive system prompts qualifying for 75% rebates.' },
      { name: 'Compare Wholesale Invoices', text: 'Review side-by-side annual dollar savings vs direct retail API pricing.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: 'Wholesale Model Invocation Code',
    programmingLanguage: 'Python',
    codeSample: 'from openai import OpenAI\nclient = OpenAI(base_url="https://api.galx.ai/v1", api_key="galx_live_key")\nres = client.chat.completions.create(model="gpt-5.6-sol", messages=[{"role":"user","content":"Hello"}])',
    targetUrl: 'https://galx.ai/tools/model-cost-comparator#comparator-code-snippet',
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
        { name: 'Model Cost Comparator', url: '/tools/model-cost-comparator' },
      ]),
      createTechArticleSchema({
        headline: 'AI Model Cost Comparator & Wholesale Pricing Calculator',
        description:
          'Calculate side-by-side monthly inference invoices across OpenAI and xAI models with 75% prompt caching savings.',
        path: '/tools/model-cost-comparator',
        keywords: ['Model Cost Comparator', 'LLM Pricing', 'Wholesale AI Tokens', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ModelCostComparatorToolClient />
    </>
  );
}
