import type { Metadata } from 'next';
import { DocsClient } from '@/components/docs/DocsClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Developer Documentation & Universal API Quickstart Center',
  description: 'Complete documentation for the GALXAI Universal AI Gateway. Learn how to connect in 30 seconds using Python, TypeScript, Cursor IDE, Windsurf, or cURL with 25%–40% wholesale savings.',
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
        headline: 'GALXAI Universal AI Gateway Developer Documentation',
        description: 'Complete documentation, SDK recipes, and quickstart guides for connecting to the GALXAI model router.',
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
