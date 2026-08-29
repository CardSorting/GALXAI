import type { Metadata } from 'next';
import { HomeClient } from '@/components/home/HomeClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createSoftwareAppSchema,
  createFAQPageSchema,
} from '@/lib/seo/jsonld';
import { FAQS } from '@/lib/data/faqData';

export const metadata: Metadata = constructMetadata({
  title: 'GALXAI Gateway — Wholesale AI Token Router & API Infrastructure',
  description: 'One unified OpenAI-compatible API gateway for OpenAI Codex and GPT-5.6 frontier models. Sub-millisecond Anycast routing, 75% prompt caching, zero 429 rate limit stalls, and 25%–40% wholesale savings.',
  canonicalPath: '/gateway',
  keywords: [
    'AI Gateway',
    'Model Router',
    'OpenAI Drop-in API',
    'Wholesale AI Tokens',
    'GPT-5.6 Sol API Key',
    'GPT-5.6 Terra API Key',
    'Prompt Caching Pass-Through',
    'Cursor AI Base URL',
    'Windsurf AI Gateway',
    '429 Failover Shield',
  ],
});

export default function GatewayPage() {
  const homeFaqSnippet = FAQS.slice(0, 6);

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({ includeRating: true }),
      createFAQPageSchema(homeFaqSnippet),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <HomeClient />
    </>
  );
}
