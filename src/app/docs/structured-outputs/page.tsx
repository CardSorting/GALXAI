import type { Metadata } from 'next';
import { StructuredOutputsClient } from '@/components/docs/StructuredOutputsClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Structured Outputs with JSON Schema',
  description: 'Request schema-constrained JSON, validate it with Zod or Pydantic, and handle validation failures.',
  canonicalPath: '/docs/structured-outputs',
  keywords: [
    'Structured Outputs OpenAI',
    'Zod Schema Enforcement LLM',
    'Pydantic AI Response Format',
    'JSON Schema Constrained Decoding',
    'JSON Schema Validation',
  ],
});

export default function StructuredOutputsDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'GALXAI Structured Outputs Guide',
        description: 'Request and validate schema-constrained outputs with Zod, Pydantic, and JSON Schema.',
        path: '/docs/structured-outputs',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Structured Outputs', url: '/docs/structured-outputs' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <StructuredOutputsClient />
    </>
  );
}
