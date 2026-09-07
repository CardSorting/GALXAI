import React from 'react';
import type { Metadata } from 'next';
import { LatencyEstimatorClient } from '@/components/tools/LatencyEstimatorClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createHowToSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'AI Latency & TTFT Estimator — Time-To-First-Token Simulator | GALXAI Tools',
  description:
    'Free interactive AI Time-To-First-Token (TTFT) and streaming latency calculator for OpenAI GPT-5.6 and xAI Grok. Model prefill times, Anycast TLS acceleration, and token throughput.',
  canonicalPath: '/tools/latency-estimator',
  keywords: [
    'AI Latency Estimator',
    'Time To First Token TTFT',
    'LLM Streaming Speed Calculator',
    'GPT-5.6 Luna Latency',
    'Anycast Edge AI Proxy',
    'Tokens Per Second Benchmark',
    'pSEO Developer Tools',
    'AEO Grounding',
  ],
});

export default function LatencyEstimatorPage() {
  const toolFaqs = [
    {
      q: 'What is the fastest model for streaming completions on GALXAI?',
      a: 'OpenAI GPT-5.6 Luna is our fastest streaming engine, delivering sub-12ms Time-To-First-Token (TTFT) and sustained throughput exceeding 145 tokens/second.',
    },
    {
      q: 'How does prompt size affect TTFT latency?',
      a: 'Every 1,000 prompt tokens require 2ms–6ms of GPU prefill computation. For massive prompts (e.g. 50,000+ tokens), prompt caching cuts prefill time by over 70% by keeping attention matrices warm in GPU memory.',
    },
    {
      q: 'What makes GALXAI Anycast edge routing faster than direct provider APIs?',
      a: 'GALXAI terminates TCP and TLS handshakes at distributed Anycast points-of-presence worldwide in <15ms, maintaining persistent HTTP/2 and HTTP/3 multiplexed tunnels to upstream provider clusters.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI AI Latency & TTFT Estimator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/latency-estimator`,
    description:
      'Interactive Time-To-First-Token (TTFT) and streaming duration simulator comparing Anycast edge routing against direct single-origin dispatch.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive AI streaming latency and TTFT estimator',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Estimate AI Inference Latency and TTFT',
    description:
      'Step-by-step instructions to model streaming latency across models, token lengths, and geographic regions.',
    totalTime: 'PT10S',
    steps: [
      { name: 'Select Target Model', text: 'Choose between GPT-5.6 Luna, Terra, Sol, or Grok 4.6.' },
      { name: 'Set Token Quantities', text: 'Adjust prompt (prefill) and completion (streamed) token sliders.' },
      { name: 'Compare Anycast vs Origin', text: 'Observe TTFT latency reduction and overall streaming speedup.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: 'Python TTFT Benchmark Script',
    programmingLanguage: 'Python',
    codeSample: 'from openai import OpenAI\nimport time\nclient = OpenAI(base_url="https://galx.ai/v1", api_key="galx_live_...")\nt0 = time.perf_counter()\nstream = client.chat.completions.create(model="gpt-5.6-luna", messages=[{"role": "user", "content": "Benchmark"}], stream=True)',
    targetUrl: 'https://galx.ai/tools/latency-estimator#code-snippet',
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      appSchema,
      howToSchema,
      codeSchema,
      createFAQPageSchema(toolFaqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Tools', url: '/calculator' },
        { name: 'Latency Estimator', url: '/tools/latency-estimator' },
      ]),
      createTechArticleSchema({
        headline: 'AI Latency & Time-To-First-Token (TTFT) Estimator',
        description:
          'Model end-to-end streaming latency, TLS handshake acceleration, and token throughput across frontier AI models.',
        path: '/tools/latency-estimator',
        keywords: ['AI Latency Estimator', 'TTFT', 'Streaming Latency', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <LatencyEstimatorClient />
    </>
  );
}
