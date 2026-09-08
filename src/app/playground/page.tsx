import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ApiPlayground } from '@/components/dashboard/ApiPlayground';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema, createSoftwareAppSchema } from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Model Playground & Gateway Sandbox',
  description: 'Test OpenAI GPT-5.6 Sol, Terra, and Luna models in the interactive GALXAI developer playground with live streaming telemetry.',
  canonicalPath: '/playground',
  keywords: [
    'AI Model Playground',
    'GPT-5.6 Sandbox',
    'OpenAI Streaming Test',
    'Prompt Caching Sandbox',
    'API Request Simulator',
  ],
});

export default function PlaygroundPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gateway Sandbox', href: '/playground' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-foreground font-sans selection:bg-indigo-500 selection:text-white">
      <JsonLd
        data={[
          createBreadcrumbSchema([
            { name: 'Home', url: SITE_CONFIG.url },
            { name: 'Gateway Sandbox', url: `${SITE_CONFIG.url}/playground` },
          ]),
          createSoftwareAppSchema({
            name: 'GALXAI Model Playground',
            description: 'Interactive developer sandbox for experimenting with frontier LLMs and prompt caching.',
            url: `${SITE_CONFIG.url}/playground`,
            id: `${SITE_CONFIG.url}/playground#software`,
            includeRating: false,
          }),
        ]}
      />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs items={breadcrumbs} />
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
