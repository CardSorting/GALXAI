import type { Metadata } from 'next';
import { PythonSdkClient } from '@/components/docs/PythonSdkClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Python SDK Deep Dive & Production Recipes — OpenAI & AsyncIO',
  description: 'Production Python patterns for GALXAI. AsyncIO concurrency pipelines, Pydantic structured output models, and HTTPX connection pooling.',
  canonicalPath: '/docs/sdks/python',
  keywords: [
    'Python OpenAI SDK Tutorial',
    'AsyncIO LLM Concurrency',
    'Pydantic AI Structured Outputs',
    'HTTPX OpenAI Connection Pool',
    'Python AI Routing',
  ],
});

export default function PythonSdkDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Python SDK Deep Dive: AsyncIO, Pydantic & Connection Pooling',
        description: 'Complete technical reference for connecting Python applications to GALXAI.',
        path: '/docs/sdks/python',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'SDKs', url: '/docs/sdks' },
        { name: 'Python SDK', url: '/docs/sdks/python' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <PythonSdkClient />
    </>
  );
}
