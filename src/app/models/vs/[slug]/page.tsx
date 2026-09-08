import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ModelVsClient } from '@/components/models/ModelVsClient';
import { CURATED_MATCHUPS, type ModelMatchup } from '@/lib/data/comparisonData';
import { EXCLUSIVE_MODEL_CATALOG, ModelCatalog } from '@/core/router/PublicModelCatalog';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createProductModelSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';

interface ModelVsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CURATED_MATCHUPS.map((m) => ({
    slug: m.slug,
  }));
}

export async function generateMetadata({ params }: ModelVsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const matchup = CURATED_MATCHUPS.find((m) => m.slug === slug);

  if (!matchup) {
    return constructMetadata({
      title: 'Matchup Not Found',
      description: 'The requested model matchup could not be found.',
      noIndex: true,
    });
  }

  const modelA = ModelCatalog.resolveModel(matchup.modelAId) || EXCLUSIVE_MODEL_CATALOG.find((m) => m.id === matchup.modelAId);
  const modelB = ModelCatalog.resolveModel(matchup.modelBId) || EXCLUSIVE_MODEL_CATALOG.find((m) => m.id === matchup.modelBId);

  return constructMetadata({
    title: matchup.title,
    description: matchup.description,
    canonicalPath: `/models/vs/${slug}`,
    keywords: [
      matchup.modelAId,
      matchup.modelBId,
      modelA?.name || 'Model A',
      modelB?.name || 'Model B',
      'AI Model Comparison',
      'LLM Benchmark',
      'Wholesale AI Tokens',
      'Prompt Caching Comparison',
      'AEO Benchmark',
    ],
  });
}

export default async function ModelVsPage({ params }: ModelVsPageProps) {
  const { slug } = await params;
  const matchup = CURATED_MATCHUPS.find((m) => m.slug === slug);

  if (!matchup) {
    notFound();
  }

  const modelA =
    ModelCatalog.resolveModel(matchup.modelAId) ||
    EXCLUSIVE_MODEL_CATALOG.find((m) => m.id === matchup.modelAId);
  const modelB =
    ModelCatalog.resolveModel(matchup.modelBId) ||
    EXCLUSIVE_MODEL_CATALOG.find((m) => m.id === matchup.modelBId);

  if (!modelA || !modelB) {
    notFound();
  }

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createProductModelSchema(modelA, { includeRating: false }),
      createProductModelSchema(modelB, { includeRating: false }),
      createFAQPageSchema(matchup.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Models', url: '/models' },
        { name: 'Comparisons', url: '/models/compare' },
        { name: `${modelA.name} vs ${modelB.name}`, url: `/models/vs/${slug}` },
      ]),
      createTechArticleSchema({
        headline: matchup.title,
        description: matchup.description,
        path: `/models/vs/${slug}`,
        keywords: [modelA.id, modelB.id, 'AEO', 'LLM Benchmark', 'AI Gateway'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ModelVsClient matchup={matchup} modelA={modelA} modelB={modelB} />
    </>
  );
}
