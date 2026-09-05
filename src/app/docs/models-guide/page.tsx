import type { Metadata } from 'next';
import { ModelsGuideClient } from '@/components/docs/ModelsGuideClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Model Selection Guide',
  description: 'Choose a GALXAI model using the live catalog of capabilities, context limits, and rates.',
  canonicalPath: '/docs/models-guide',
  keywords: [
    'AI Model Selection Guide',
    'GPT-5.6 Sol Specs',
    'GPT-5.6 Context Guide',
    'Coding Model Guide',
    'AI Model Benchmark Comparison',
  ],
});

export default function ModelsGuideDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'GALXAI Model Selection Guide',
        description: 'Capabilities, limits, rates, and workload guidance sourced from the live model catalog.',
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
