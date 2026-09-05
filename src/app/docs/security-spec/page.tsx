import type { Metadata } from 'next';
import { SecuritySpecClient } from '@/components/docs/SecuritySpecClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Security and Retention',
  description: 'Credential custody, stateless inference, explicit durable sessions, and tenant authority in GALXAI.',
  canonicalPath: '/docs/security-spec',
  keywords: [
    'Zero Data Retention AI',
    'AI Security Specifications',
    'RAM Zeroization AI Gateway',
    'AES-256-GCM API Vault',
    'HIPAA GDPR AI Privacy',
  ],
});

export default function SecuritySpecDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'GALXAI Security and Retention',
        description: 'Credential custody, stateless inference, explicit durable sessions, and tenant authority.',
        path: '/docs/security-spec',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Security Spec', url: '/docs/security-spec' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <SecuritySpecClient />
    </>
  );
}
