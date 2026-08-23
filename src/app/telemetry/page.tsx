import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TelemetryFeed } from '@/components/dashboard/TelemetryFeed';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createSoftwareAppSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Live Pool Telemetry & Immutable Audit Trail',
  description: 'Real-time telemetry, execution lease allocations, token replenishment events, and circuit breaker state changes in the GALXAI pool.',
  canonicalPath: '/telemetry',
  keywords: [
    'AI Gateway Telemetry',
    'Real-Time Token Flow',
    'Circuit Breaker Logs',
    'Merkle Audit AI',
  ],
});

export default function TelemetryPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({
        name: 'GALXAI Live Telemetry & Audit Stream',
        description: 'Real-time telemetry and execution lease allocation feed for the GALXAI model pool.',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Telemetry', url: '/telemetry' },
      ]),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd data={pageSchema} />
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs items={[{ label: 'Live Telemetry & Audit' }]} />
        <AuthRequiredGate
          title="Sign In to Inspect Real-Time Telemetry"
          description="Live shard leases, token allocation velocity, and cryptographic Merkle audit records are private to authenticated developers."
          checkoutAmount={50}
        >
          <TelemetryFeed />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
