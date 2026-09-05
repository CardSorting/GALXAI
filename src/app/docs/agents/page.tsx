import type { Metadata } from 'next';
import { AgentsClient } from '@/components/docs/AgentsClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'AI Agents & Autonomous Swarms Hub — CrewAI, LangGraph & AutoGen',
  description: 'Integrate agent frameworks with isolated sessions, bounded concurrency, tool calling, and streamed inference.',
  canonicalPath: '/docs/agents',
  keywords: [
    'AI Agents Gateway',
    'CrewAI Integration',
    'LangGraph LLM Router',
    'AutoGen Gateway',
    'Vercel AI SDK Swarms',
    'Agent Rate Limit 429 Prevention',
    'Autonomous Multi-Agent Routing',
  ],
});

export default function AgentsDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'AI Agents & Autonomous Swarms Integration Guide',
        description: 'Connect CrewAI, LangGraph, AutoGen, and Vercel AI SDK to GALXAI inference APIs.',
        path: '/docs/agents',
        keywords: ['AI Agents', 'CrewAI', 'LangGraph', 'AutoGen'],
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'AI Agents', url: '/docs/agents' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <AgentsClient />
    </>
  );
}
