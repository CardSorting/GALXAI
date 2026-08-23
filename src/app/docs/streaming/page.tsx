import type { Metadata } from 'next';
import { StreamingClient } from '@/components/docs/StreamingClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Server-Sent Events (SSE) Streaming Guide — Sub-15ms TTFT',
  description: 'Stream tokens in real time over standard HTTP/1.1 and HTTP/2 connections with sub-15ms Time-To-First-Token (TTFT) and continuous keep-alive heartbeats.',
  canonicalPath: '/docs/streaming',
  keywords: [
    'SSE AI Streaming',
    'Server-Sent Events LLM',
    'Low Latency Token Streaming',
    'TTFT Optimization',
    'Python OpenAI Streaming',
    'Next.js AI Stream',
  ],
});

export default function StreamingDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Server-Sent Events (SSE) Streaming Guide: Sub-15ms TTFT',
        description: 'Complete guide for real-time token streaming with Python, TypeScript, and cURL over SSE.',
        path: '/docs/streaming',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Streaming', url: '/docs/streaming' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <StreamingClient />
    </>
  );
}
