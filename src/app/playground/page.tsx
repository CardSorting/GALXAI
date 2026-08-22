import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ApiPlayground } from '@/components/dashboard/ApiPlayground';

export const metadata: Metadata = {
  title: 'Universal Model Playground & Streaming Sandbox',
  description: 'Test live token streaming, lease allocation, and failover across OpenAI Codex (GPT-5.6 Sol, Terra, Luna) and xAI Grok 4.5.',
};

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs items={[{ label: 'Universal Model Playground' }]} />
        <Suspense fallback={
          <div className="glass-panel rounded-3xl p-8 text-center text-xs text-zinc-400 animate-pulse">
            Loading Playground Sandbox...
          </div>
        }>
          <ApiPlayground />
        </Suspense>
      </main>
    </div>
  );
}
