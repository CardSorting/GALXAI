import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlternativeClient } from '@/components/alternatives/AlternativeClient';
import { COMPETITOR_ALTERNATIVES, type CompetitorAlternative } from '@/lib/data/alternativesData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createSoftwareSourceCodeSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';

interface AlternativePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COMPETITOR_ALTERNATIVES.map((a) => ({
    slug: a.slug,
  }));
}

export async function generateMetadata({ params }: AlternativePageProps): Promise<Metadata> {
  const { slug } = await params;
  const alt = COMPETITOR_ALTERNATIVES.find((a) => a.slug === slug);

  if (!alt) {
    return constructMetadata({
      title: 'Alternative Not Found',
      description: 'The requested competitor alternative comparison could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: alt.title,
    description: alt.description,
    canonicalPath: `/alternatives/${slug}`,
    keywords: [
      alt.competitorName,
      `${alt.competitorName} alternative`,
      'OpenRouter alternative',
      'AI Gateway comparison',
      'Wholesale AI Tokens',
      'Prompt Caching',
      'pSEO Alternative',
      'AEO Benchmark',
    ],
  });
}

export default async function AlternativePage({ params }: AlternativePageProps) {
  const { slug } = await params;
  const alt = COMPETITOR_ALTERNATIVES.find((a) => a.slug === slug);

  if (!alt) {
    notFound();
  }

  const codeSchema = createSoftwareSourceCodeSchema({
    name: `Migration Code from ${alt.competitorName}`,
    programmingLanguage: alt.codeSnippet.language === 'Python' ? 'Python' : 'TypeScript',
    codeSample: alt.codeSnippet.code,
    targetUrl: `https://galx.ai/alternatives/${slug}#migration-guide`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: `GALXAI: ${alt.competitorName} Alternative`,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        description: alt.description,
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'USD',
          description: '0% Gateway Markup with $5 Free Compute Credits',
        },
      },
      codeSchema,
      createFAQPageSchema(alt.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Alternatives', url: '/pricing' },
        { name: `${alt.competitorName} Alternative`, url: `/alternatives/${slug}` },
      ]),
      createTechArticleSchema({
        headline: alt.title,
        description: alt.description,
        path: `/alternatives/${slug}`,
        keywords: [alt.competitorName, 'AI Gateway Alternative', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <AlternativeClient alternative={alt} />
    </>
  );
}
