import type { Metadata } from 'next';
import { ResolverClient } from '@/components/models/ResolverClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createSoftwareAppSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: '0ms Universal AI Model Alias & Canonical Resolver',
  description: 'Test how GALXAI resolves shorthand aliases, provider prefixes, and legacy model strings to canonical frontier model specifications in 0ms.',
  canonicalPath: '/models/resolver',
  keywords: [
    'Model Alias Resolver',
    'OpenAI Model Aliases',
    'GALX Model Aliases',
    'Canonical LLM Resolver',
    'Universal AI Router',
  ],
});

export default function ModelResolverPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({
        name: 'GALXAI 0ms Model Alias Resolver',
        description: 'Instant in-memory trie resolver for AI model aliases, provider prefixes, and legacy model identifiers.',
        url: '/models/resolver',
        id: 'https://galx.ai/models/resolver#software',
        includeRating: false,
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Models', url: '/models' },
        { name: 'Resolver', url: '/models/resolver' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ResolverClient />
    </>
  );
}
