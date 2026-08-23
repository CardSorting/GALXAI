import type { Metadata } from 'next';
import { ErrorHandlingClient } from '@/components/docs/ErrorHandlingClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Error Handling & Sub-15ms Failover Guide — Status Codes & Retries',
  description: 'Understand standard HTTP status codes, exponential backoff with full jitter, and automated multi-region circuit breaker recovery for resilient zero-stall AI execution.',
  canonicalPath: '/docs/error-handling',
  keywords: [
    'AI API Error Handling',
    'OpenAI 429 Rate Limit Recovery',
    'Circuit Breaker AI Gateway',
    'Exponential Backoff Jitter Python',
    'Sub-15ms AI Failover',
  ],
});

export default function ErrorHandlingDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Error Handling & Sub-15ms Circuit Breaker Failover Guide',
        description: 'Complete guide for error codes, automated retries with jitter, and circuit breaker architecture.',
        path: '/docs/error-handling',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Error Handling', url: '/docs/error-handling' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ErrorHandlingClient />
    </>
  );
}
