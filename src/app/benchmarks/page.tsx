import React from 'react';
import type { Metadata } from 'next';
import { BenchmarksClient } from '@/components/benchmarks/BenchmarksClient';
import { BENCHMARKS_DATA, BENCHMARK_FAQS } from '@/lib/data/benchmarksData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Real-Time LLM Latency & Throughput Benchmark Leaderboard — GALX Distributed Edge',
  description:
    'Authoritative, real-time speed and TTFT benchmark leaderboard measuring sub-15ms edge latency, tokens/sec velocity, and prompt caching speedups across GALX Nova.',
  canonicalPath: '/benchmarks',
  keywords: [
    'LLM Speed Benchmark',
    'TTFT Latency Leaderboard',
    'Tokens Per Second LLM',
    'GALX Nova Latency Benchmark',
    'GALX Nova Speed Benchmark',
    'Prompt Caching Latency Delta',
    'Sub-15ms Edge AI Gateway',
    'AEO Benchmark',
  ],
});

export default function BenchmarksPage() {
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'GALXAI Global Distributed Edge LLM Latency & Throughput Telemetry Dataset',
    description:
      'Verified real-time benchmarks measuring Time-To-First-Token (TTFT), generation tokens/second, and prompt cache hit latency across frontier AI models.',
    url: `${SITE_CONFIG.url}/benchmarks`,
    creator: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    temporalCoverage: '2025/2026',
    spatialCoverage: 'Global (Distributed Edge)',
    variableMeasured: [
      'Time-To-First-Token (TTFT)',
      'Tokens Per Second Throughput',
      'Prompt Cache Hit TTFT Delta',
      'P99 Latency Boundary',
    ],
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      datasetSchema,
      createFAQPageSchema(BENCHMARK_FAQS),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Benchmarks', url: '/benchmarks' },
      ]),
      createTechArticleSchema({
        headline: 'Real-Time LLM Latency & Speed Leaderboard',
        description:
          'Authoritative end-to-end telemetry measuring TTFT and generation velocity on GALX distributed edge nodes.',
        path: '/benchmarks',
        keywords: ['LLM Benchmark', 'TTFT', 'Latency Leaderboard', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <BenchmarksClient />
    </>
  );
}
