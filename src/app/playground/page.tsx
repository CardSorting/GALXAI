import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ApiPlayground } from '@/components/dashboard/ApiPlayground';

export const metadata: Metadata = {
  title: 'Model Playground & Gateway Sandbox — GALXAI',
  description: 'GALXAI Universal Gateway API access, authentication status, and integration quickstart.',
};

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs items={[{ label: 'Gateway Sandbox' }]} />
        <Suspense fallback={
          <div className="glass-panel rounded-3xl p-8 text-center text-xs text-zinc-400 animate-pulse">
            Loading Gateway Status...
          </div>
        }>
          <ApiPlayground />
        </Suspense>
      </main>
    </div>
  );
}
