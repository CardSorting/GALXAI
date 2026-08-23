import type { Metadata } from 'next';
import { FunctionCallingClient } from '@/components/docs/FunctionCallingClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Function Calling & Agentic Tools Guide — Parallel Tool Calling',
  description: 'Connect databases, APIs, and tools to GPT-5.6 and Grok 4.5. Parallel tool calling, automatic 75% tool schema caching, and zero latency overhead.',
  canonicalPath: '/docs/function-calling',
  keywords: [
    'Function Calling OpenAI',
    'Parallel Tool Calling AI',
    'Agentic Tool Use Python',
    'Vercel AI SDK Tool Calling',
    'Cached Tool Definitions',
  ],
});

export default function FunctionCallingDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Function Calling & Agentic Tools Integration Guide',
        description: 'Complete tutorial on executing parallel tool calling and cached tool schemas with GALXAI.',
        path: '/docs/function-calling',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Function Calling', url: '/docs/function-calling' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <FunctionCallingClient />
    </>
  );
}
