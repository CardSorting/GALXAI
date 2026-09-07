import React from 'react';
import type { Metadata } from 'next';
import { EmbeddingsCalculatorToolClient } from '@/components/tools/EmbeddingsCalculatorToolClient';
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
  title: 'Embeddings & Vector Storage Cost Calculator — GALXAI Tools',
  description:
    'Free interactive vector embedding and RAG database storage cost calculator. Calculate token costs, RAM footprint in GB, and wholesale indexing savings across Pinecone, Milvus, and pgvector.',
  canonicalPath: '/tools/embeddings-calculator',
  keywords: [
    'OpenAI Embeddings Calculator',
    'text-embedding-3-small Pricing',
    'Vector Database Cost Calculator',
    'RAG Storage Estimator',
    'Vector DB RAM Calculator',
    'pSEO Tools',
    'AEO Embeddings Guide',
  ],
});

export default function EmbeddingsCalculatorPage() {
  const toolFaqs = [
    {
      q: 'How does GALXAI achieve $0.020/1M pricing on text-embedding-3-small?',
      a: 'GALXAI purchases wholesale compute capacity in bulk and passes 100% of the volume clearance discount to developers with zero markup.',
    },
    {
      q: 'Are the embedding vectors mathematically identical to official OpenAI embeddings?',
      a: 'Yes. Every embedding vector is generated directly by official model weights, ensuring 100% cosine similarity parity for your vector database.',
    },
    {
      q: 'How should I batch embedding requests for maximum throughput?',
      a: 'We recommend batching 100 to 500 document chunks per API request to minimize HTTP roundtrip overhead and maximize Anycast pipeline efficiency.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI Embeddings & Vector Storage Cost Calculator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/embeddings-calculator`,
    description:
      'Interactive calculator to estimate RAG embedding tokens, vector storage RAM/NVMe footprint, and wholesale API costs.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive vector embeddings and storage calculator',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Calculate RAG Embedding Token Costs and Vector DB Memory',
    description:
      'Step-by-step instructions to model indexing costs and storage footprints.',
    totalTime: 'PT15S',
    steps: [
      { name: 'Set Document Count', text: 'Select the total number of document chunks to index into your vector store.' },
      { name: 'Choose Vector Dimensions', text: 'Select between 1536 (small) and 3072 (large) embedding dimensions.' },
      { name: 'Export Batching Code', text: 'Copy the ready-to-run Python or TypeScript batching snippet.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: 'Python Batched Embeddings Client',
    programmingLanguage: 'Python',
    codeSample: 'from openai import OpenAI\nclient = OpenAI(base_url="https://galx.ai/v1", api_key="galx_live_key")\nresp = client.embeddings.create(model="text-embedding-3-small", input=["doc 1", "doc 2"])',
    targetUrl: 'https://galx.ai/tools/embeddings-calculator#embedding-code-snippet',
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
        { name: 'Embeddings Calculator', url: '/tools/embeddings-calculator' },
      ]),
      createTechArticleSchema({
        headline: 'Embeddings & Vector Storage Cost Calculator',
        description:
          'Calculate embedding token costs, vector database memory footprints, and wholesale indexing savings.',
        path: '/tools/embeddings-calculator',
        keywords: ['Embeddings Calculator', 'Vector Database Storage', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <EmbeddingsCalculatorToolClient />
    </>
  );
}
