import React from 'react';
import type { Metadata } from 'next';
import { CalculatorClient } from '@/components/calculator/CalculatorClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Universal AI Token & Prompt Caching Cost Calculator — GALXAI',
  description:
    'Simulate production LLM workloads to calculate exact monthly savings, compound 75% prompt caching rebates, and net annual enterprise ROI across OpenAI Codex and GPT-5.6.',
  canonicalPath: '/calculator',
  keywords: [
    'AI Token Calculator',
    'Prompt Caching Calculator',
    'OpenAI Cost Calculator',
    'GPT-5.6 Token Pricing',
    'Wholesale LLM Savings',
    'AI ROI Simulator',
    'AEO Calculator',
  ],
});

export default function CalculatorPage() {
  const calculatorFaqs = [
    {
      q: 'How is the prompt caching savings calculated?',
      a: 'When prompt prefixes exceed 1,024 tokens and match cached RAM slices, GALXAI applies a 75% compound rebate on the input token price, passing 100% of the upstream savings directly to your wallet.',
    },
    {
      q: 'Do I need an enterprise subscription to access wholesale rates?',
      a: 'No. GALXAI provides direct wholesale rates starting on your very first token with zero monthly seat licenses and zero minimum commitments.',
    },
    {
      q: 'Can I export this calculation for my finance / budget approval team?',
      a: 'Yes. Click "Copy ROI Audit Report" above to copy a machine-formatted summary ready for inclusion in team budget proposals.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI Universal AI Token & Prompt Caching Cost Calculator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/calculator`,
    description:
      'Interactive financial tool for simulating LLM inference token costs, prompt caching rebates, and annual enterprise savings.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free instant ROI simulator and budget forecasting tool',
    },
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      appSchema,
      createFAQPageSchema(calculatorFaqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Calculator', url: '/calculator' },
      ]),
      createTechArticleSchema({
        headline: 'Universal AI Token & Prompt Caching Cost Calculator',
        description:
          'Simulate production LLM workloads to calculate monthly savings and prompt caching rebates.',
        path: '/calculator',
        keywords: ['Token Calculator', 'Prompt Caching', 'AI Pricing', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <CalculatorClient />
    </>
  );
}
