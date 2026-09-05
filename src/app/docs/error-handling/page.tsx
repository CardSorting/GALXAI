import type { Metadata } from 'next';
import { ErrorHandlingClient } from '@/components/docs/ErrorHandlingClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Error Handling, Retries, and Failover',
  description: 'Classify API errors, retry transient failures with jitter, and preserve idempotency across failover.',
  canonicalPath: '/docs/error-handling',
  keywords: [
    'AI API Error Handling',
    'OpenAI 429 Rate Limit Recovery',
    'Circuit Breaker AI Gateway',
    'Exponential Backoff Jitter Python',
    'AI Gateway Failover',
  ],
});

export default function ErrorHandlingDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'GALXAI Error Handling, Retries, and Failover',
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
