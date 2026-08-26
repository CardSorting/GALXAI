import React from 'react';
import type { Metadata } from 'next';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Dynamic Routing & Circuit Breaker Engine',
  description: 'Configure automated failover rules, latency thresholds, and prompt cache preservation between frontier AI models.',
  canonicalPath: '/models/routing',
  keywords: [
    'AI Model Routing',
    'Circuit Breaker Failover',
    'Latency-Based Rerouting',
    'Prompt Cache Preservation',
    'OpenAI Model Routing',
  ],
});

export default function RoutingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
