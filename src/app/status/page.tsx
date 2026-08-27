import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { LiveStatusDashboard } from '@/components/status/LiveStatusDashboard';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createSoftwareAppSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Real-Time System Status & Operational SLA Health',
  description: 'Real-time operational status, sub-15ms router latency metrics, and upstream availability for OpenAI Codex and GPT-5.6.',
  canonicalPath: '/status',
  keywords: [
    'GALXAI Status',
    'AI Router Uptime',
    'OpenAI Status Gateway',
    'GPT-5.6 Operational Health',
    'AI Gateway Latency Status',
  ],
});

export default function StatusPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({
        name: 'GALXAI Real-Time System Status',
        description: 'Operational health, circuit breaker telemetry, and Anycast latency metrics.',
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
        <Breadcrumbs items={[{ label: 'System Status & Health' }]} />
        <LiveStatusDashboard />
      </main>
    </div>
  );
}
