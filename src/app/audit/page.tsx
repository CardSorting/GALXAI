import React from 'react';
import type { Metadata } from 'next';
import { AuditClient } from '@/components/audit/AuditClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Enterprise AI Spend Forensic & Governance Control Tower — GALXAI',
  description:
    'Model an AI spend-governance rollout, then use reconciled traffic data to identify attribution gaps, cache opportunities, and evidence-gated routing candidates.',
  canonicalPath: '/audit',
  keywords: [
    'Enterprise AI Spend Audit',
    'AI Cost Governance',
    'OpenAI Cost Optimization',
    'Prompt Caching Forensic',
    'Frontier Model Misallocation',
    'AI FinOps Control Plane',
    'AI Token Waste Detection',
    'Evidence-Gated AI Spend Governance',
  ],
});

export default function AuditPage() {
  const auditFaqs = [
    {
      q: 'How does GalX reverse-audit live enterprise OpenAI traffic?',
      a: 'The OpenAI-compatible gateway records attributed request, model, usage, cache, and policy metadata. The first phase is observe-only: usage must be reconciled against provider billing before findings or enforcement are approved.',
    },
    {
      q: 'What is Frontier Model Misallocation?',
      a: 'It is a candidate finding where a more expensive model handles a named, low-risk workload. A lower-cost route is enforced only after workload-specific shadow evaluation meets an approved quality-regression threshold.',
    },
    {
      q: 'How does GalX address cache-busting prompt prefixes?',
      a: 'GalX can diagnose the first unstable prefix and recommend explicit application changes or provider cache controls. It does not silently reorder prompts; provider-reported cache reads and writes are used to verify results.',
    },
    {
      q: 'Can GalX stop runaway autonomous agent loops?',
      a: 'The gateway can reject additional calls when an attributed session exceeds a deterministic policy limit. More advanced cyclic-pattern detection remains a separate, testable capability rather than a default claim.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI Enterprise AI Spend Forensic & Governance Control Tower',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/audit`,
    description:
      'AI spend-governance planning simulator and gateway for attributed observability, deterministic limits, and evidence-gated model routing.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: '30-day zero-risk reverse audit and $100 enterprise trial key',
    },
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      appSchema,
      createFAQPageSchema(auditFaqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Enterprise Spend Audit', url: '/audit' },
      ]),
      createTechArticleSchema({
        headline: 'Enterprise AI Spend Forensic & Governance Control Tower',
        description:
          'Use reconciled production usage to identify spend leakage and evaluate evidence-gated remediation policies.',
        path: '/audit',
        keywords: ['AI Spend Audit', 'Cost Governance', 'AI FinOps', 'Prompt Caching', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <AuditClient />
    </>
  );
}
