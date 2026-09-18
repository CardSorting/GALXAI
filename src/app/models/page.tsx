import type { Metadata } from 'next';
import { ModelsClient } from '@/components/models/ModelsClient';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/PublicModelCatalog';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createModelItemListSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Frontier AI Models & Architecture Specs | GALX Nova Intelligence Layer',
  description: 'Explore canonical frontier intelligence models GALX Nova and GALX Nova-image. Access via OpenAI-compatible endpoints with automatic prompt caching and the GALX API.',
  canonicalPath: '/models',
  keywords: [
    'AI Model Catalog',
    'GALX Nova Pricing',
    'GALX Nova Specs',
    'GALX Nova Benchmarks',
    'GALX Nova-image API',
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
