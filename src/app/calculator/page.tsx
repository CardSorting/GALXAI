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
  title: 'Universal AI Velocity & Total Cost of Ownership (TCO) Calculator — GALXAI',
  description:
    'Calculate the true economics of operating frontier AI. Simulate 25%–40% wholesale token pricing, compound prompt caching rebates, avoided developer infrastructure tuition, and accelerated time-to-first-dollar.',
  canonicalPath: '/calculator',
  keywords: [
    'AI Velocity Calculator',
    'AI Total Cost of Ownership',
    'AI Cost Calculator',
    'Time to First Dollar AI',
    'Prompt Caching Calculator',
    'GALX Nova Token Pricing',
    'Wholesale LLM Savings',
    'Avoided Engineering Tuition',
    'AI FinOps Simulator',
  ],
});

export default function CalculatorPage() {
  const calculatorFaqs = [
    {
      q: 'How does GALXAI compress Time-to-First-Dollar for AI applications?',
      a: 'Building production AI traditionally requires 3–6 weeks of engineering time spent writing routing infrastructure, managing API key security, and handling 429 rate-limit retries. GALXAI eliminates this with an OpenAI-compatible gateway, native SDKs, zero-route Server Actions, and automatic 1-line OpenAI SDK patching (import "galxai/patch").',
    },
    {
      q: 'What is "Avoided Engineering Tuition"?',
      a: 'Engineering teams typically waste 15+ hours per month per developer debugging inference edge cases, maintaining custom proxy servers, and fixing streaming socket failures. GALXAI provides pre-built, hardened infrastructure so your team avoids paying that operational and engineering tuition.',
    },
    {
      q: 'How does Intelligent Tier Cascading prevent frontier model overspend?',
      a: 'Many teams accidentally use oversized reasoning pipelines for simple classification, routing, or formatting tasks. Intelligent Tier Cascading automatically identifies simple workloads and routes them to optimal velocity execution, unlocking an additional 20%–40% cost reduction without quality degradation.',
    },
    {
      q: 'How is the prompt caching savings calculated?',
      a: 'When prompt prefixes exceed 1,024 tokens and match cached RAM slices, GALXAI applies a compound rebate on the input token price, passing 100% of the upstream savings directly to your wallet.',
    },
    {
      q: 'Do I need an enterprise subscription to access wholesale rates?',
      a: 'No. GALXAI provides direct wholesale rates starting on your very first token with zero monthly seat licenses and zero minimum commitments.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI Universal AI Velocity & Total Cost of Ownership (TCO) Calculator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/calculator`,
    description:
      'Interactive economic simulator for measuring OpenAI inference token savings, prompt caching rebates, avoided developer infrastructure tuition, and time-to-first-dollar velocity.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free instant AI velocity and TCO forecasting tool',
    },
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      appSchema,
      createFAQPageSchema(calculatorFaqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'AI Velocity & TCO Calculator', url: '/calculator' },
      ]),
      createTechArticleSchema({
        headline: 'Universal AI Velocity & Total Cost of Ownership (TCO) Calculator',
        description:
          'Simulate production OpenAI workloads to calculate monthly token savings, prompt caching rebates, and avoided developer infrastructure tuition.',
        path: '/calculator',
        keywords: ['AI Velocity Calculator', 'TCO Calculator', 'Prompt Caching', 'OpenAI Pricing', 'AEO'],
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
