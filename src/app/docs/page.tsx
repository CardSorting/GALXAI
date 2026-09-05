import type { Metadata } from 'next';
import { DocsClient } from '@/components/docs/DocsClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Developer Documentation',
  description: 'Choose a model, create an API key, and integrate GALXAI through an OpenAI-compatible API, SDK, IDE, or agent.',
  canonicalPath: '/docs',
  keywords: [
    'AI Gateway Documentation',
    'OpenAI Python SDK Quickstart',
    'TypeScript AI Client',
    'Cursor IDE OpenAI Base URL',
    'Windsurf API Setup',
    'Prompt Caching Implementation',
    'Zero Data Retention Security Spec',
  ],
});

export default function DocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'GALXAI Developer Documentation',
        description: 'Implementation guides and API references for connecting to the GALXAI inference platform.',
        path: '/docs',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Documentation', url: '/docs' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <DocsClient />
    </>
  );
}
