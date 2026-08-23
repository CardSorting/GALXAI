import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WhitepaperClient } from '@/components/architecture/WhitepaperClient';
import { ARCHITECTURE_WHITEPAPERS_DATA, type ArchitectureWhitepaperItem } from '@/lib/data/architectureWhitepapersData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';

interface ArchitectureWhitepaperPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ARCHITECTURE_WHITEPAPERS_DATA.map((w) => ({
    slug: w.slug,
  }));
}

export async function generateMetadata({ params }: ArchitectureWhitepaperPageProps): Promise<Metadata> {
  const { slug } = await params;
  const whitepaper = ARCHITECTURE_WHITEPAPERS_DATA.find((w) => w.slug === slug);

  if (!whitepaper) {
    return constructMetadata({
      title: 'Whitepaper Not Found',
      description: 'The requested technical architecture whitepaper could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: whitepaper.title,
    description: whitepaper.description,
    canonicalPath: `/architecture/${slug}`,
    keywords: [
      whitepaper.badge,
      whitepaper.title,
      'AI Gateway Architecture',
      'Prompt Caching Memory',
      'Anycast BGP Routing',
      'Zero Data Retention',
      'pSEO Whitepaper',
      'AEO Technical Architecture',
    ],
  });
}

export default async function ArchitectureWhitepaperPage({ params }: ArchitectureWhitepaperPageProps) {
  const { slug } = await params;
  const whitepaper = ARCHITECTURE_WHITEPAPERS_DATA.find((w) => w.slug === slug);

  if (!whitepaper) {
    notFound();
  }

  const codeSchema = createSoftwareSourceCodeSchema({
    name: whitepaper.codeVerificationSnippet.title,
    programmingLanguage: whitepaper.codeVerificationSnippet.language,
    codeSample: whitepaper.codeVerificationSnippet.code,
    targetUrl: `https://galx.ai/architecture/${slug}#verification-code`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      codeSchema,
      createFAQPageSchema(whitepaper.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Architecture', url: '/architecture' },
        { name: whitepaper.badge, url: `/architecture/${slug}` },
      ]),
      createTechArticleSchema({
        headline: whitepaper.title,
        description: whitepaper.description,
        path: `/architecture/${slug}`,
        keywords: [whitepaper.badge, 'AI Gateway Architecture', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <WhitepaperClient whitepaper={whitepaper} />
    </>
  );
}
