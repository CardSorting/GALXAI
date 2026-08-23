import type { Metadata } from 'next';
import { EmbeddingsClient } from '@/components/docs/EmbeddingsClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Vector Embeddings & Semantic Search Guide — pgvector & Python',
  description: 'High-throughput vector embeddings for RAG pipelines, PostgreSQL pgvector indexing, and semantic similarity search with 1,536 and 3,072 dimensions.',
  canonicalPath: '/docs/embeddings',
  keywords: [
    'Vector Embeddings API',
    'PostgreSQL pgvector Tutorial',
    'text-embedding-3-small OpenAI',
    'Cosine Similarity Search Python',
    'High Throughput Embeddings',
  ],
});

export default function EmbeddingsDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Vector Embeddings & Semantic Search Integration Guide',
        description: 'Complete guide for batch vector generation, PostgreSQL pgvector cosine queries, and LangChain embeddings.',
        path: '/docs/embeddings',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Embeddings', url: '/docs/embeddings' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <EmbeddingsClient />
    </>
  );
}
