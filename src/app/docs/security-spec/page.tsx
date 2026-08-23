import type { Metadata } from 'next';
import { SecuritySpecClient } from '@/components/docs/SecuritySpecClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Security & Zero-Retention Specifications — Cryptographic ZDR Spec',
  description: 'Technical specifications on AES-256-GCM authenticated encryption, ephemeral RAM transit, and cryptographic memory zeroization upon HTTP stream completion.',
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
        headline: 'Security & Zero-Data-Retention (ZDR) Specifications',
        description: 'Complete cryptographic verification and ephemeral RAM pipeline security specifications.',
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
