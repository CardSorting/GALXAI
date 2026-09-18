import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { IndustryClient } from '@/components/industries/IndustryClient';
import { INDUSTRIES_DATA, type IndustryItem } from '@/lib/data/industriesData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';

interface IndustryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return INDUSTRIES_DATA.map((i) => ({
    slug: i.slug,
  }));
}

export async function generateMetadata({ params }: IndustryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const industry = INDUSTRIES_DATA.find((i) => i.slug === slug);

  if (!industry) {
    return constructMetadata({
      title: 'Industry Solution Not Found',
      description: 'The requested industry vertical AI solution guide could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: industry.title,
    description: industry.description,
    canonicalPath: `/industries/${slug}`,
    keywords: [
      industry.badge,
      industry.sectorName,
      'Enterprise AI Solution',
      'Healthcare AI workflows',
      'Financial AI workflows',
      'Legal AI workflows',
      'pSEO Industry',
      'AEO Vertical Solution',
    ],
  });
}

export default async function IndustryPage({ params }: IndustryPageProps) {
  const { slug } = await params;
  const industry = INDUSTRIES_DATA.find((i) => i.slug === slug);

  if (!industry) {
    notFound();
  }

  const codeSchema = createSoftwareSourceCodeSchema({
    name: industry.codeExample.title,
    programmingLanguage: industry.codeExample.language,
    codeSample: industry.codeExample.code,
    targetUrl: `https://galx.ai/industries/${slug}#code-example`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      codeSchema,
      createFAQPageSchema(industry.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Solutions', url: '/solutions' },
        { name: industry.badge, url: `/industries/${slug}` },
      ]),
      createTechArticleSchema({
        headline: industry.title,
        description: industry.description,
        path: `/industries/${slug}`,
        keywords: [industry.badge, industry.sectorName, 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <IndustryClient industry={industry} />
    </>
  );
}
