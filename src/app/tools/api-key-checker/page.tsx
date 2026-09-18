import React from 'react';
import type { Metadata } from 'next';
import { ApiKeyCheckerToolClient } from '@/components/tools/ApiKeyCheckerToolClient';
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
  title: 'OpenAI API Key Validator & Health Tester — GALXAI Tools',
  description:
    'Free in-browser OpenAI and GALXAI API key format validator and connectivity tester. Check key entropy, active endpoint status, and edge ping latency with 100% client-side privacy.',
  canonicalPath: '/tools/api-key-checker',
  keywords: [
    'OpenAI API Key Checker',
    'API Key Validator',
    'Test OpenAI API Key',
    'API Key Balance Tester',
    'GALXAI Key Health',
    'pSEO Tools',
    'AEO Developer Security',
  ],
});

export default function ApiKeyCheckerPage() {
  const toolFaqs = [
    {
      q: 'Is my API key sent to any external servers during format verification?',
      a: 'No. Format checks and entropy validation execute 100% locally within your browser client memory for absolute confidentiality.',
    },
    {
      q: 'Can I test both GALXAI live keys and direct OpenAI keys?',
      a: 'Yes. The tool recognizes both "galx_live_..." and "sk-..." key formats and verifies wire-level compatibility.',
    },
    {
      q: 'What should I do if my key has expired or lacks quota?',
      a: 'Click "Mint Active Developer Key" to provision a new high-throughput key with $5 in free compute instantly.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI API Key Validator & Health Tester',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/api-key-checker`,
    description:
      'In-browser API key format validator, entropy checker, and distributed edge latency diagnostic tool.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive API key health testing utility',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Validate and Test OpenAI API Key Status',
    description:
      'Step-by-step instructions to test API key format entropy and edge responsiveness.',
    totalTime: 'PT10S',
    steps: [
      { name: 'Enter API Key', text: 'Paste your galx_live_ or sk- key into the local validator input.' },
      { name: 'Execute Diagnostic', text: 'Click Validate Key to test format entropy and ping response.' },
      { name: 'Review Health Readout', text: 'Inspect model tier permissions and distributed edge response latency.' },
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
        { name: 'API Key Checker', url: '/tools/api-key-checker' },
      ]),
      createTechArticleSchema({
        headline: 'OpenAI API Key Validator & Health Tester',
        description:
          'Validate API key format entropy, active model permissions, and distributed edge response latency.',
        path: '/tools/api-key-checker',
        keywords: ['API Key Validator', 'OpenAI Tester', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ApiKeyCheckerToolClient />
    </>
  );
}
