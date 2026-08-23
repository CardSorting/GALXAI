import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WorkloadBenchmarkClient } from '@/components/benchmarks/WorkloadBenchmarkClient';
import { WORKLOAD_BENCHMARKS_DATA, type WorkloadBenchmarkItem } from '@/lib/data/workloadBenchmarksData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

interface WorkloadBenchmarkPageProps {
  params: Promise<{ workload: string }>;
}

export async function generateStaticParams() {
  return WORKLOAD_BENCHMARKS_DATA.map((w) => ({
    workload: w.workloadSlug,
  }));
}

export async function generateMetadata({ params }: WorkloadBenchmarkPageProps): Promise<Metadata> {
  const { workload } = await params;
  const benchmark = WORKLOAD_BENCHMARKS_DATA.find((w) => w.workloadSlug === workload);

  if (!benchmark) {
    return constructMetadata({
      title: 'Benchmark Not Found',
      description: 'The requested workload benchmark leaderboard could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: benchmark.title,
    description: benchmark.description,
    canonicalPath: `/benchmarks/${workload}`,
    keywords: [
      benchmark.badge,
      benchmark.title,
      'LLM Benchmark',
      'AI Leaderboard',
      'SWE-bench',
      'HumanEval',
      'Anycast TTFT',
      'pSEO Benchmarks',
      'AEO Benchmark Answer',
    ],
  });
}

export default async function WorkloadBenchmarkPage({ params }: WorkloadBenchmarkPageProps) {
  const { workload } = await params;
  const benchmark = WORKLOAD_BENCHMARKS_DATA.find((w) => w.workloadSlug === workload);

  if (!benchmark) {
    notFound();
  }

  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: benchmark.title,
    description: benchmark.description,
    url: `${SITE_CONFIG.url}/benchmarks/${workload}`,
    creator: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    variableMeasured: [
      'SWE-bench / HumanEval Coding Accuracy',
      'Time-To-First-Token (TTFT)',
      'Tokens Per Second Throughput',
      'Wholesale Price Per 1M Tokens',
    ],
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      datasetSchema,
      createFAQPageSchema(benchmark.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Benchmarks', url: '/benchmarks' },
        { name: benchmark.badge, url: `/benchmarks/${workload}` },
      ]),
      createTechArticleSchema({
        headline: benchmark.title,
        description: benchmark.description,
        path: `/benchmarks/${workload}`,
        keywords: [benchmark.badge, 'LLM Benchmark', 'AI Leaderboard', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <WorkloadBenchmarkClient benchmark={benchmark} />
    </>
  );
}
