import React from 'react';
import type { Metadata } from 'next';
import { RoiCalculatorClient } from '@/components/tools/RoiCalculatorClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createHowToSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Enterprise LLM ROI & Token Budget Calculator — AI Cost Modeler',
  description:
    'Free interactive Enterprise LLM ROI and Token Budget Calculator. Model monthly AI inference spend across DAUs, prompt token volumes, 75% prompt caching, and 25%-40% wholesale clearance rates.',
  canonicalPath: '/tools/roi-calculator',
  keywords: [
    'LLM ROI Calculator',
    'AI Token Budget Modeler',
    'AI API Cost Calculator',
    'LLM cost per user',
    'Enterprise AI Cost Estimation',
    'Prompt Caching ROI',
    'Wholesale AI Savings Calculator',
    'pSEO AI Tools',
    'AEO Financial Modeler',
  ],
});

export default function RoiCalculatorPage() {
  const faqs = [
    {
      q: 'How does GALXAI achieve 25%–40% token discounts vs direct retail?',
      a: 'GALXAI aggregates compute volume across enterprise liquidity pools to qualify for maximum tier clearance rates, passing 100% of the wholesale discount directly to developers with $0 monthly platform seat fees.',
    },
    {
      q: 'How is the 75% prompt caching discount applied in the calculator?',
      a: 'When prompt prefixes exceed 1,024 tokens and match active cache slices, input pricing for the cached segment drops significantly (e.g. down to $0.02/1M on GALX Nova).',
    },
    {
      q: 'Does GALXAI require annual volume commitments or seat fees?',
      a: 'No. GALXAI operates with $0 monthly platform fees, zero seat surcharges, and pay-as-you-go billing with complete deposit liquidity refundability.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI Enterprise LLM ROI & Token Budget Calculator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/roi-calculator`,
    description:
      'Interactive financial calculator to model enterprise LLM inference spend, DAU traffic scaling, and compound 75% prompt caching savings.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive enterprise AI budget modeler',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Calculate Enterprise LLM Token ROI & Budget',
    description:
      'Step-by-step guide to forecasting monthly AI API costs, factoring in prompt caching rebates, and measuring wholesale arbitrage.',
    totalTime: 'PT45S',
    steps: [
      {
        name: 'Select Target Model',
        text: 'Select GALX Nova or custom workload configurations.',
      },
      {
        name: 'Configure Active User Scale',
        text: 'Set Daily Active Users (DAUs) and estimated queries per user per day.',
      },
      {
        name: 'Input Token Payload Sizes',
        text: 'Specify average prompt input and completion output tokens per request.',
      },
      {
        name: 'Adjust Prompt Cache Hit Rate',
        text: 'Model the percentage of queries sharing repeated system or document prefixes.',
      },
      {
        name: 'Export Executive Budget Report',
        text: 'Copy the executive financial summary with net monthly and annual savings.',
      },
    ],
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      appSchema,
      howToSchema,
      createFAQPageSchema(faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Developer Tools', url: '/tools/model-cost-comparator' },
        { name: 'LLM ROI & Budget Calculator', url: '/tools/roi-calculator' },
      ]),
      createTechArticleSchema({
        headline: 'Enterprise LLM Cost Modeling & Token Budgeting Economics',
        description:
          'Financial methodology for calculating large language model inference costs, cache hit efficiency, and volume arbitrage.',
        path: '/tools/roi-calculator',
        keywords: ['LLM ROI', 'Token Budget', 'Cost Modeling', 'pSEO Tool', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <RoiCalculatorClient />
    </>
  );
}
