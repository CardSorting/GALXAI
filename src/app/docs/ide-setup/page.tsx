import type { Metadata } from 'next';
import { IdeSetupClient } from '@/components/docs/IdeSetupClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createHowToSchema, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Cursor, Windsurf & Continue.dev IDE Setup — 30-Second Guide',
  description: 'Learn how to configure Cursor IDE, Windsurf, Claude Code CLI, Continue.dev, and Cline with GALXAI for 25%–40% wholesale token savings and sub-15ms latency.',
  canonicalPath: '/docs/ide-setup',
  keywords: [
    'Cursor OpenAI Base URL',
    'Windsurf API Setup',
    'Claude Code CLI Gateway',
    'Continue.dev Custom Models',
    'Cline Roo-Code OpenAI Compatible',
    'Cheapest Cursor API Key',
  ],
});

export default function IdeSetupDocPage() {
  const howToSchema = createHowToSchema({
    name: 'How to Connect Cursor or Windsurf IDE to GALXAI in 30 Seconds',
    description: 'Step-by-step guide to routing your AI coding IDE through GALXAI with wholesale pricing and prompt caching.',
    totalTime: 'PT30S',
    steps: [
      {
        name: 'Open IDE AI Settings',
        text: 'In Cursor or Windsurf settings, locate the OpenAI API Key and Models configuration tab.',
      },
      {
        name: 'Override OpenAI Base URL',
        text: 'Set the custom endpoint to https://api.galx.ai/v1.',
      },
      {
        name: 'Supply Developer Key',
        text: 'Paste your GALXAI live developer key (galx_live_...) and select gpt-5.6-sol or grok-4.6.',
      },
    ],
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      howToSchema,
      createTechArticleSchema({
        headline: 'IDE Configuration Guide: Cursor, Windsurf, Claude Code & Continue.dev',
        description: 'Complete setup instructions for routing developer IDEs through GALXAI wholesale model router.',
        path: '/docs/ide-setup',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'IDE Setup', url: '/docs/ide-setup' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <IdeSetupClient />
    </>
  );
}
