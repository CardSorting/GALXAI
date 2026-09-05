import type { Metadata } from 'next';
import { ModelsClient } from '@/components/models/ModelsClient';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createModelItemListSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Frontier AI Models & Architecture Specs | OpenAI-Compatible API Gateway',
  description: 'Explore flagship AI models including OpenAI Codex GPT-5.6 Sol, Terra, Luna, and GPT-Image suite. Access via a 100% OpenAI-compatible endpoint with automatic prompt caching and sub-15ms Anycast routing.',
  canonicalPath: '/models',
  keywords: [
    'AI Model Catalog',
    'GPT-5.6 Sol Pricing',
    'GPT-5.6 Terra Specs',
    'GPT-5.6 Luna Benchmarks',
    'OpenAI GPT-Image-2 API',
    'Wholesale AI Inference',
    'Prompt Caching LLM',
    'OpenAI SDK Compatible Models',
    'Developer AI Pricing',
  ],
});

export default function ModelsPage() {
  const modelsSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createModelItemListSchema(EXCLUSIVE_MODEL_CATALOG),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Models', url: '/models' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={modelsSchema} />
      <ModelsClient />
    </>
  );
}
