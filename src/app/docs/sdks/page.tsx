import type { Metadata } from 'next';
import { SdksClient } from '@/components/docs/SdksClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'SDKs & Client Libraries — Python, TypeScript, Rust, Go & CLI',
  description: 'Connection recipes for Python, TypeScript, Vercel AI SDK, LangChain, LlamaIndex, Rust, Go, and CLI clients.',
  canonicalPath: '/docs/sdks',
  keywords: [
    'AI SDKs',
    'OpenAI Python Client',
    'TypeScript OpenAI Library',
    'Rust AI Client',
    'Go LLM SDK',
    'Vercel AI SDK Integration',
  ],
});

export default function SdksDocPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'SDKs & Client Libraries Guide',
        description: 'Connection recipes for 8 popular developer frameworks connecting to GALXAI.',
        path: '/docs/sdks',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'SDKs', url: '/docs/sdks' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <SdksClient />
    </>
  );
}
