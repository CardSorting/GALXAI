import type { Metadata } from 'next';
import { PromptCachingClient } from '@/components/docs/PromptCachingClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: '75% Automated Prompt Caching Guide — Wholesale Token Rebate',
  description: 'Cut input inference costs by 75% and slash TTFT by up to 80% with automated prefix KV-caching. 0 code refactoring or custom routing parameters required.',
  canonicalPath: '/docs/prompt-caching',
  keywords: [
    'Prompt Caching Guide',
    'OpenAI Prompt Caching Discount',
    'KV Cache Prefill Acceleration',
    '75% AI Token Rebate',
    'Prefix Caching Architecture',
  ],
});

export default function PromptCachingDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Automated 75% Prompt Caching Guide',
        description: 'Complete architecture and verification guide for prefix KV-caching with 75% cost savings.',
        path: '/docs/prompt-caching',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Prompt Caching', url: '/docs/prompt-caching' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <PromptCachingClient />
    </>
  );
}
