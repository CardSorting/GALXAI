import React from 'react';
import type { Metadata } from 'next';
import { StreamBenchmarkClient } from '@/components/tools/StreamBenchmarkClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createHowToSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'AI Token Streaming & Speed Benchmark Simulator — TTFT & Velocity Tool',
  description:
    'Free interactive AI token streaming and latency benchmark simulator. Model Time-To-First-Token (TTFT), tokens/sec throughput, and 25%-40% wholesale savings across OpenAI GPT-5.6 and xAI Grok 4.6.',
  canonicalPath: '/tools/stream-benchmark',
  keywords: [
    'AI streaming benchmark',
    'token generation speed tester',
    'OpenAI tokens per second',
    'Time to First Token simulator',
    'GPT-5.6 Luna streaming speed',
    'Grok 4.6 streaming throughput',
    'AI latency estimator',
    'Anycast TTFT calculator',
    'pSEO Developer Tool',
    'AEO Benchmark Simulator',
  ],
});

export default function StreamBenchmarkPage() {
  const faqs = [
    {
      q: 'Which model provides the fastest token generation speed on GALXAI?',
      a: 'OpenAI GPT-5.6 Luna is the fastest model in the catalog, delivering 142 tokens/second with an average Time-To-First-Token (TTFT) of 11.8ms at $0.75/1M input tokens.',
    },
    {
      q: 'How does Anycast routing achieve sub-15ms TTFT?',
      a: 'GALXAI terminates client TLS connections at the closest global edge Point of Presence (PoP) in <5ms and streams data over pre-warmed persistent fiber tunnels directly to origin GPU clusters.',
    },
    {
      q: 'Does streaming token generation qualify for the 75% prompt caching discount?',
      a: 'Yes. Repeated prompt prefixes exceeding 1,024 tokens receive an automatic 75% caching discount regardless of whether the response is streamed or buffered.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI AI Token Streaming & Speed Benchmark Simulator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/stream-benchmark`,
    description:
      'Free interactive browser tool to simulate Server-Sent Events (SSE) token generation velocity and Time-To-First-Token (TTFT) across frontier AI models.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free developer streaming speed benchmark simulator',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Benchmark AI Token Streaming Speed & TTFT',
    description:
      'Step-by-step guide to measuring real-time token velocities, Time-To-First-Token (TTFT), and wholesale token economics.',
    totalTime: 'PT30S',
    steps: [
      {
        name: 'Select Frontier Model',
        text: 'Choose between GPT-5.6 Luna (142 tok/s), Terra (92 tok/s), Sol (68 tok/s), or Grok 4.6 (75 tok/s).',
      },
      {
        name: 'Set Target Output Tokens',
        text: 'Select a preset prompt volume or customize token count from 50 to 4,000 tokens.',
      },
      {
        name: 'Start Live Simulation',
        text: 'Click Start Live Token Stream to observe real-time SSE token delivery and elapsed latency.',
      },
      {
        name: 'Export 1-Line Code',
        text: 'Copy the ready-to-run OpenAI Python or TypeScript SDK streaming snippet.',
      },
    ],
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      appSchema,
      howToSchema,
      createFAQPageSchema(faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Developer Tools', url: '/tools/model-cost-comparator' },
        { name: 'AI Stream Benchmark Simulator', url: '/tools/stream-benchmark' },
      ]),
      createTechArticleSchema({
        headline: 'AI Token Streaming Velocity & Time-To-First-Token Benchmarks',
        description:
          'Technical methodology for evaluating streaming latency, SSE chunk delivery, and Anycast edge acceleration across frontier LLMs.',
        path: '/tools/stream-benchmark',
        keywords: ['Streaming Benchmark', 'TTFT', 'Tokens Per Second', 'pSEO Tool', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <StreamBenchmarkClient />
    </>
  );
}
