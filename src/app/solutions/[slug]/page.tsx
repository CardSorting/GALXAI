import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SolutionClient } from '@/components/solutions/SolutionClient';
import { SOLUTION_GUIDES, type SolutionGuide } from '@/lib/data/solutionsData';
import { EXCLUSIVE_MODEL_CATALOG, ModelCatalog } from '@/core/router/PublicModelCatalog';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createSoftwareSourceCodeSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';

interface SolutionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SOLUTION_GUIDES.map((s) => ({
    slug: s.slug,
  }));
}

export async function generateMetadata({ params }: SolutionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = SOLUTION_GUIDES.find((s) => s.slug === slug);

  if (!solution) {
    return constructMetadata({
      title: 'Solution Not Found',
      description: 'The requested AI solution guide could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: solution.title,
    description: solution.description,
    canonicalPath: `/solutions/${slug}`,
    keywords: [
      solution.name,
      solution.primaryModelId,
      'AI Gateway Solution',
      'Wholesale LLM API',
      'Prompt Caching',
      'High-Throughput AI',
      'AEO Solution Guide',
    ],
  });
}

export default async function SolutionPage({ params }: SolutionPageProps) {
  const { slug } = await params;
  const solution = SOLUTION_GUIDES.find((s) => s.slug === slug);

  if (!solution) {
    notFound();
  }

  const primaryModel =
    ModelCatalog.resolveModel(solution.primaryModelId) ||
    EXCLUSIVE_MODEL_CATALOG.find((m) => m.id === solution.primaryModelId) ||
    null;

  const fallbackModel = solution.fallbackModelId ? (
    ModelCatalog.resolveModel(solution.fallbackModelId) ||
    EXCLUSIVE_MODEL_CATALOG.find((m) => m.id === solution.fallbackModelId) ||
    null) : null;

  const codeSchema = createSoftwareSourceCodeSchema({
    name: `${solution.name} Gateway Initialization`,
    programmingLanguage: solution.codeSnippet.language === 'Python' ? 'Python' : 'TypeScript',
    codeSample: solution.codeSnippet.code,
    targetUrl: `https://galx.ai/solutions/${slug}#solution-recipe`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: `GALXAI Solution: ${solution.name}`,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        description: solution.description,
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'USD',
          description: '$5 Instant Free Developer Compute Credits',
        },
      },
      codeSchema,
      createFAQPageSchema(solution.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Solutions', url: '/models' },
        { name: solution.name, url: `/solutions/${slug}` },
      ]),
      createTechArticleSchema({
        headline: solution.title,
        description: solution.description,
        path: `/solutions/${slug}`,
        keywords: [solution.name, solution.primaryModelId, 'AI Gateway', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <SolutionClient
        solution={solution}
        primaryModel={primaryModel}
        fallbackModel={fallbackModel}
      />
    </>
  );
}
