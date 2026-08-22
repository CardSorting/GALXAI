import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TelemetryFeed } from '@/components/dashboard/TelemetryFeed';

export const metadata: Metadata = {
  title: 'Live Pool Telemetry & Immutable Audit Trail',
  description: 'Real-time telemetry, execution lease allocations, token replenishment events, and circuit breaker state changes in the GALXAI pool.',
};

export default function TelemetryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs items={[{ label: 'Live Telemetry & Audit' }]} />
        <TelemetryFeed />
      </main>
    </div>
  );
}
