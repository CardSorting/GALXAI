import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { LiveStatusDashboard } from '@/components/status/LiveStatusDashboard';

export const metadata: Metadata = {
  title: 'System Status & Operational Health',
  description: 'Real-time operational status, router latency metrics, and upstream availability for OpenAI Codex and xAI Grok.',
};

export default function StatusPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'System Status & Health' }]} />
        <LiveStatusDashboard />
      </main>
    </div>
  );
}
