import type { Metadata } from 'next';
import { PromptCachingClient } from '@/components/docs/PromptCachingClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Prompt Caching',
  description: 'Structure stable request prefixes, inspect cached-token usage, and read current cache rates from the GALXAI model catalog.',
  canonicalPath: '/docs/prompt-caching',
  keywords: [
    'Prompt Caching Guide',
    'OpenAI Prompt Caching Discount',
    'KV Cache Prefill Acceleration',
    'Cached Input Pricing',
    'Prefix Caching Architecture',
  ],
});

export default function PromptCachingDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'GALXAI Prompt Caching Guide',
        description: 'Implementation rules, usage inspection, and current model-specific cache rates.',
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
