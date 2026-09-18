import React from 'react';
import type { Metadata } from 'next';
import { ApiRequestBuilderClient } from '@/components/tools/ApiRequestBuilderClient';
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
  title: 'Interactive API Request Builder & Code Generator — GALXAI Tools',
  description:
    'Free interactive OpenAI API request builder and multi-language code generator. Export ready-to-run code in Python, TypeScript, cURL, Go, Rust, Ruby, and PHP with sub-15ms distributed edge routing.',
  canonicalPath: '/tools/api-request-builder',
  keywords: [
    'OpenAI Request Builder',
    'cURL to Python Converter',
    'LLM API Payload Generator',
    'AI Code Generator',
    'Streaming SSE Generator',
    'pSEO Tools',
    'AEO Developer Utility',
  ],
});

export default function ApiRequestBuilderPage() {
  const toolFaqs = [
    {
      q: 'Are all generated snippets 100% wire-compatible with official SDKs?',
      a: 'Yes. Every code snippet uses official client libraries with standard baseURL overrides pointing to "https://galx.ai/v1".',
    },
    {
      q: 'Does streaming SSE work across all supported programming languages?',
      a: 'Yes. All SDKs support Server-Sent Events (SSE) streaming with sub-15ms edge Time-To-First-Token.',
    },
    {
      q: 'How do I authenticate these requests?',
      a: 'Pass your live GALXAI API key in the Authorization Bearer header or client apiKey constructor parameter.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI API Request Builder & Code Studio',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/api-request-builder`,
    description:
      'Interactive payload customizer and multi-language SDK code generator for OpenAI and xAI models.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive API payload builder and code generator',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Build and Export OpenAI Wire-Compatible Code Snippets',
    description:
      'Step-by-step instructions to configure API parameters and copy production SDK code.',
    totalTime: 'PT15S',
    steps: [
      { name: 'Select Target Model', text: 'Choose your preferred frontier reasoning or high-speed model.' },
      { name: 'Customize Parameters', text: 'Configure temperature, max tokens, and streaming SSE options.' },
      { name: 'Export Multi-Language Code', text: 'Switch between Python, TypeScript, cURL, Go, Rust, Ruby, or PHP.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: 'Python OpenAI Client Quickstart',
    programmingLanguage: 'Python',
    codeSample: 'from openai import OpenAI\nclient = OpenAI(base_url="https://galx.ai/v1", api_key="galx_live_key")',
    targetUrl: 'https://galx.ai/tools/api-request-builder#code-output',
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
        { name: 'API Request Builder', url: '/tools/api-request-builder' },
      ]),
      createTechArticleSchema({
        headline: 'Interactive API Request Builder & Code Generator',
        description:
          'Build OpenAI wire-compatible inference requests and export ready-to-run code across 7 programming languages.',
        path: '/tools/api-request-builder',
        keywords: ['API Request Builder', 'OpenAI Generator', 'cURL Converter', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ApiRequestBuilderClient />
    </>
  );
}
