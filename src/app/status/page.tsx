import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { LiveStatusDashboard } from '@/components/status/LiveStatusDashboard';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createSoftwareAppSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'GALX service status',
  description: 'Check current availability for GALX services.',
  canonicalPath: '/status',
  keywords: [
    'GALX status',
    'GALX service availability',
    'GALX Nova status',
  ],
});

export default function StatusPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({
        name: 'GALX Service Status',
        description: 'Check current availability for GALX services.',
        url: '/status',
        id: 'https://galx.ai/status#software',
        includeRating: false,
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Status', url: '/status' },
      ]),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd data={pageSchema} />
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Service status' }]} />
        <LiveStatusDashboard />
      </main>
    </div>
  );
}
