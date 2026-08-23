import type { Metadata } from 'next';
import { StructuredOutputsClient } from '@/components/docs/StructuredOutputsClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Guaranteed Structured JSON Outputs Guide — Zod & Pydantic',
  description: 'Enforce 100% adherence to complex JSON Schemas, Pydantic models, and Zod definitions with zero missing keys, zero syntax errors, and zero hallucinations.',
  canonicalPath: '/docs/structured-outputs',
  keywords: [
    'Structured Outputs OpenAI',
    'Zod Schema Enforcement LLM',
    'Pydantic AI Response Format',
    'JSON Schema Constrained Decoding',
    'Guaranteed JSON Parsing AI',
  ],
});

export default function StructuredOutputsDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Guaranteed Structured JSON Outputs Guide',
        description: 'Complete tutorial on constrained decoding with Zod, Pydantic, and strict JSON schemas on GALXAI.',
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
