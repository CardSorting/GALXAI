import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CapabilityClient } from '@/components/capabilities/CapabilityClient';
import { CAPABILITIES_DATA, type CapabilityItem } from '@/lib/data/capabilitiesData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';

interface CapabilityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CAPABILITIES_DATA.map((c) => ({
    slug: c.slug,
  }));
}

export async function generateMetadata({ params }: CapabilityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const capability = CAPABILITIES_DATA.find((c) => c.slug === slug);

  if (!capability) {
    return constructMetadata({
      title: 'Capability Not Found',
      description: 'The requested AI gateway capability specification could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: capability.title,
    description: capability.description,
    canonicalPath: `/capabilities/${slug}`,
    keywords: [
      capability.badge,
      capability.title,
      'AI Gateway Architecture',
      'Prompt Caching',
      'Anycast AI',
      'Zero Data Retention',
      'pSEO Capabilities',
      'AEO Technical Architecture',
    ],
  });
}

export default async function CapabilityPage({ params }: CapabilityPageProps) {
  const { slug } = await params;
  const capability = CAPABILITIES_DATA.find((c) => c.slug === slug);

  if (!capability) {
    notFound();
  }

  const codeSchema = createSoftwareSourceCodeSchema({
    name: `${capability.title} (${capability.codeSnippet.language})`,
    programmingLanguage: capability.codeSnippet.language,
    codeSample: capability.codeSnippet.code,
    targetUrl: `https://galx.ai/capabilities/${slug}#code-snippet`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      codeSchema,
      createFAQPageSchema(capability.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Architecture', url: '/docs/architecture' },
        { name: capability.badge, url: `/capabilities/${slug}` },
      ]),
      createTechArticleSchema({
        headline: capability.title,
        description: capability.description,
        path: `/capabilities/${slug}`,
        keywords: [capability.badge, 'AI Gateway', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <CapabilityClient capability={capability} />
    </>
  );
}
