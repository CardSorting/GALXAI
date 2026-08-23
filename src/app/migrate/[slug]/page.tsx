import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MigrateClient } from '@/components/migrate/MigrateClient';
import { MIGRATION_GUIDES_DATA, type MigrationGuideItem } from '@/lib/data/migrationData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createHowToSchema,
  createSoftwareSourceCodeSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';

interface MigratePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return MIGRATION_GUIDES_DATA.map((g) => ({
    slug: g.slug,
  }));
}

export async function generateMetadata({ params }: MigratePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = MIGRATION_GUIDES_DATA.find((g) => g.slug === slug);

  if (!guide) {
    return constructMetadata({
      title: 'Migration Guide Not Found',
      description: 'The requested cloud migration guide could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: guide.title,
    description: guide.description,
    canonicalPath: `/migrate/${slug}`,
    keywords: [
      guide.sourceProvider,
      `Migrate from ${guide.sourceProvider}`,
      'Cloud AI Migration',
      'OpenAI drop-in gateway',
      'Wholesale AI Tokens',
      'Prompt Caching',
      'pSEO Migration Guide',
      'AEO Benchmark',
    ],
  });
}

export default async function MigratePage({ params }: MigratePageProps) {
  const { slug } = await params;
  const guide = MIGRATION_GUIDES_DATA.find((g) => g.slug === slug);

  if (!guide) {
    notFound();
  }

  const howToSchema = createHowToSchema({
    name: guide.headline,
    description: guide.description,
    totalTime: 'PT30S',
    steps: guide.migrationSteps.map((s) => ({
      name: s.step,
      text: s.desc,
    })),
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: `GALXAI Migration Snippet from ${guide.sourceProvider}`,
    programmingLanguage: 'Python',
    codeSample: guide.afterCode.code,
    targetUrl: `https://galx.ai/migrate/${slug}#code-diff`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      howToSchema,
      codeSchema,
      createFAQPageSchema(guide.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Migration Guides', url: '/docs/migration' },
        { name: `Migrate from ${guide.sourceProvider}`, url: `/migrate/${slug}` },
      ]),
      createTechArticleSchema({
        headline: guide.title,
        description: guide.description,
        path: `/migrate/${slug}`,
        keywords: [guide.sourceProvider, 'AI Migration Guide', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <MigrateClient guide={guide} />
    </>
  );
}
