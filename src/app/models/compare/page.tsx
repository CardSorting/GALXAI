import type { Metadata } from 'next';
import { CompareClient } from '@/components/models/CompareClient';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createModelItemListSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Compare Frontier AI Models Side-by-Side — Specs, Latency & Pricing',
  description: 'Side-by-side benchmark comparison of OpenAI and GPT-5.6 (Sol, Terra, Luna). Compare TTFT latency, context windows, output limits, and wholesale pricing.',
  canonicalPath: '/models/compare',
  keywords: [
    'AI Model Comparison',
    'GPT-5.6 Sol vs GPT-5.6 Terra',
    'GPT-5.6 Terra vs Luna',
    'AI Model Latency Benchmark',
    'LLM Price Comparison',
    'Fastest Coding LLM',
  ],
});

export default function CompareModelsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createModelItemListSchema(EXCLUSIVE_MODEL_CATALOG.slice(0, 4)),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Models', url: '/models' },
        { name: 'Compare', url: '/models/compare' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <CompareClient />
    </>
  );
}
