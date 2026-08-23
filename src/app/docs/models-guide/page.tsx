import type { Metadata } from 'next';
import { ModelsGuideClient } from '@/components/docs/ModelsGuideClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Frontier AI Model Capability & Selection Guide — GPT-5.6 & Grok',
  description: 'Comparative benchmark capabilities, context windows, and workload recommendations across all 12 supported frontier engines with 0ms ambiguity resolution.',
  canonicalPath: '/docs/models-guide',
  keywords: [
    'AI Model Selection Guide',
    'GPT-5.6 Sol Specs',
    'Grok 4.6 1M Context Guide',
    'Best Coding LLM Guide',
    'AI Model Benchmark Comparison',
  ],
});

export default function ModelsGuideDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Frontier AI Model Capability & Selection Guide',
        description: 'Comparative benchmark analysis and workload recommendations across all supported models.',
        path: '/docs/models-guide',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Models Guide', url: '/docs/models-guide' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ModelsGuideClient />
    </>
  );
}
