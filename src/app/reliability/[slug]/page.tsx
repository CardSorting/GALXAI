import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReliabilityClient } from '@/components/reliability/ReliabilityClient';
import { RELIABILITY_DATA, type ReliabilityItem } from '@/lib/data/reliabilityData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';

interface ReliabilityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return RELIABILITY_DATA.map((r) => ({
    slug: r.slug,
  }));
}

export async function generateMetadata({ params }: ReliabilityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const reliability = RELIABILITY_DATA.find((r) => r.slug === slug);

  if (!reliability) {
    return constructMetadata({
      title: 'Reliability Guide Not Found',
      description: 'The requested AI reliability and resilience architecture guide could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: reliability.title,
    description: reliability.description,
    canonicalPath: `/reliability/${slug}`,
    keywords: [
      reliability.badge,
      reliability.title,
      'AI Gateway Reliability',
      'OpenAI Outage Failover',
      '429 Mitigation',
      'High Availability AI',
      'pSEO Reliability',
      'AEO Resilience Guide',
    ],
  });
}

export default async function ReliabilityPage({ params }: ReliabilityPageProps) {
  const { slug } = await params;
  const reliability = RELIABILITY_DATA.find((r) => r.slug === slug);

  if (!reliability) {
    notFound();
  }

  const codeSchema = createSoftwareSourceCodeSchema({
    name: reliability.runbookCodeSnippet.title,
    programmingLanguage: reliability.runbookCodeSnippet.language,
    codeSample: reliability.runbookCodeSnippet.code,
    targetUrl: `https://galx.ai/reliability/${slug}#runbook-code`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      codeSchema,
      createFAQPageSchema(reliability.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Reliability', url: '/status' },
        { name: reliability.badge, url: `/reliability/${slug}` },
      ]),
      createTechArticleSchema({
        headline: reliability.title,
        description: reliability.description,
        path: `/reliability/${slug}`,
        keywords: [reliability.badge, 'AI Gateway Reliability', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ReliabilityClient reliability={reliability} />
    </>
  );
}
