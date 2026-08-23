import type { Metadata } from 'next';
import { TypeScriptSdkClient } from '@/components/docs/TypeScriptSdkClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'TypeScript & Node.js SDK Deep Dive — Zod & Vercel AI SDK',
  description: 'Type-safe TypeScript and Node.js patterns for GALXAI. Zod structured outputs, Vercel AI SDK streams, and Bun/Deno zero-dependency compatibility.',
  canonicalPath: '/docs/sdks/typescript',
  keywords: [
    'TypeScript OpenAI Client',
    'Zod Structured Outputs OpenAI',
    'Vercel AI SDK Custom Endpoint',
    'Bun OpenAI SDK Streaming',
    'Next.js 15 AI Stream',
  ],
});

export default function TypeScriptSdkDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'TypeScript & Node.js SDK Deep Dive',
        description: 'Type-safe integration patterns for TypeScript, Zod schemas, and Next.js / Vercel AI SDK.',
        path: '/docs/sdks/typescript',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'SDKs', url: '/docs/sdks' },
        { name: 'TypeScript SDK', url: '/docs/sdks/typescript' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <TypeScriptSdkClient />
    </>
  );
}
