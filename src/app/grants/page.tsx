import type { Metadata } from 'next';
import { GrantsClient } from '@/components/grants/GrantsClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createGrantFinancialSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'AI Builder & Scale Acceleration Grants — Up to $2,500 Match',
  description: 'Apply for up to $2,500 in 50% compute match grants for high-velocity AI builders, funded startups, and enterprise teams scaling OpenAI and xAI Grok workloads.',
  canonicalPath: '/grants',
  keywords: [
    'AI Grants',
    'Startup Compute Grants',
    'OpenAI Compute Credits',
    'AI Builder Acceleration Fund',
    'YC AI Grants',
    'Free AI Tokens',
  ],
});

export default function GrantsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createGrantFinancialSchema(),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Pricing', url: '/pricing' },
        { name: 'Grants', url: '/grants' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <GrantsClient />
    </>
  );
}
