import type { Metadata } from 'next';
import { RateLimitsClient } from '@/components/docs/RateLimitsClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Rate Limits & Concurrency Governor Guide — Continuous Token Refill',
  description: 'Continuous fractional token replenishment calculus, 2-phase token reservations, and burst smoothing eliminate top-of-minute 429 stampedes.',
  canonicalPath: '/docs/rate-limits',
  keywords: [
    'AI Rate Limits Guide',
    'Continuous Token Bucket Algorithm',
    'OpenAI Rate Limit 429 Fix',
    'Token Reservation Calculus',
    'Concurrency Governor',
  ],
});

export default function RateLimitsDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Rate Limits & Continuous Concurrency Governor Guide',
        description: 'Deep dive into microsecond token replenishment calculus and 2-phase token reservations.',
        path: '/docs/rate-limits',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Rate Limits', url: '/docs/rate-limits' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <RateLimitsClient />
    </>
  );
}
