import type { Metadata } from 'next';
import { MigrationClient } from '@/components/docs/MigrationClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createHowToSchema, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: '1-Click Zero-Code Migration Guide — OpenAI, OpenRouter & LiteLLM',
  description: 'Switch from direct OpenAI, OpenRouter, LiteLLM, Vercel AI SDK, LangChain, or LlamaIndex in 30 seconds with 1 line of configuration. 0 code refactoring.',
  canonicalPath: '/docs/migration',
  keywords: [
    'OpenAI Migration Guide',
    'OpenRouter Alternative',
    'LiteLLM Router Config',
    'LangChain OpenAI Base URL',
    'Vercel AI SDK Custom Gateway',
    'Zero Code AI Migration',
  ],
});

export default function MigrationGuidePage() {
  const howToSchema = createHowToSchema({
    name: 'How to Migrate from Direct OpenAI to GALXAI in 1 Line',
    description: 'Switch any OpenAI SDK, LangChain, or Cursor IDE project to GALXAI wholesale gateway in 30 seconds.',
    totalTime: 'PT30S',
    steps: [
      {
        name: 'Change Base URL',
        text: 'Update your client baseURL or OPENAI_BASE_URL to https://api.galx.ai/v1.',
      },
      {
        name: 'Provide GALXAI API Key',
        text: 'Replace your API key with a live GALXAI key (galx_live_...).',
      },
      {
        name: 'Run Immediate Inference',
        text: 'Execute your completions as usual with 25%–40% wholesale margin and 75% prompt caching.',
      },
    ],
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      howToSchema,
      createTechArticleSchema({
        headline: '1-Click Zero-Code Migration Guide to GALXAI',
        description: 'Complete instructions for migrating applications from OpenAI, OpenRouter, LiteLLM, and LangChain to GALXAI.',
        path: '/docs/migration',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Migration Guide', url: '/docs/migration' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <MigrationClient />
    </>
  );
}
