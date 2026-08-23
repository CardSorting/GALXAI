import type { Metadata } from 'next';
import { ComplianceClient } from '@/components/compliance/ComplianceClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Enterprise Security & Compliance Hub — SOC 2, HIPAA BAA & GDPR DPA',
  description: 'Enterprise compliance repository with execute-ready HIPAA BAA, GDPR DPA with SCCs, SOC 2 Type II summary, and ISO 27001 zero-retention documentation.',
  canonicalPath: '/compliance',
  keywords: [
    'AI HIPAA BAA',
    'AI GDPR DPA',
    'SOC 2 AI Gateway',
    'Zero Data Retention Compliance',
    'Healthcare AI Compliance',
  ],
});

export default function CompliancePage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Enterprise Security, Privacy & Legal Compliance Repository',
        description: 'Comprehensive compliance repository including HIPAA BAA, GDPR DPA, SOC 2 Type II audit, and ISO 27001 certifications.',
        path: '/compliance',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Compliance', url: '/compliance' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ComplianceClient />
    </>
  );
}
