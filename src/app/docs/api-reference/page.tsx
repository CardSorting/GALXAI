import type { Metadata } from 'next';
import { ApiReferenceClient } from '@/components/docs/ApiReferenceClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'OpenAPI REST & SSE Endpoint Reference — Complete Docs',
  description: 'Complete OpenAPI 3.0 specification for GALXAI chat completions, streaming SSE, vector embeddings, image synthesis, and model catalog endpoints.',
  canonicalPath: '/docs/api-reference',
  keywords: [
    'OpenAPI AI Specification',
    'OpenAI Compatible API Reference',
    'Anthropic Messages Compatible Endpoint',
    'Vector Embeddings API Reference',
    'Image Generation API Documentation',
  ],
});

export default function ApiReferenceDocPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'OpenAPI REST & SSE Endpoint Reference',
        description: 'Complete API reference for OpenAI and Anthropic compatible endpoints on GALXAI.',
        path: '/docs/api-reference',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'API Reference', url: '/docs/api-reference' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ApiReferenceClient />
    </>
  );
}
