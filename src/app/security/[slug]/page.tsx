import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SecurityClient } from '@/components/security/SecurityClient';
import { SECURITY_SPECIFICATIONS_DATA, type SecuritySpecificationItem } from '@/lib/data/securityData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';

interface SecuritySpecificationPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SECURITY_SPECIFICATIONS_DATA.map((s) => ({
    slug: s.slug,
  }));
}

export async function generateMetadata({ params }: SecuritySpecificationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const security = SECURITY_SPECIFICATIONS_DATA.find((s) => s.slug === slug);

  if (!security) {
    return constructMetadata({
      title: 'Security Specification Not Found',
      description: 'The requested enterprise compliance specification could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: security.title,
    description: security.description,
    canonicalPath: `/security/${slug}`,
    keywords: [
      security.badge,
      security.regulatoryBody,
      'Enterprise AI Security',
      'PCI DSS Compliance',
      'EU AI Act',
      'FedRAMP AI Proxy',
      'CCPA Privacy',
      'pSEO Security',
      'AEO Compliance',
    ],
  });
}

export default async function SecuritySpecificationPage({ params }: SecuritySpecificationPageProps) {
  const { slug } = await params;
  const security = SECURITY_SPECIFICATIONS_DATA.find((s) => s.slug === slug);

  if (!security) {
    notFound();
  }

  const codeSchema = createSoftwareSourceCodeSchema({
    name: security.systemVerificationSnippet.title,
    programmingLanguage: security.systemVerificationSnippet.language,
    codeSample: security.systemVerificationSnippet.code,
    targetUrl: `https://galx.ai/security/${slug}#verification-code`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      codeSchema,
      createFAQPageSchema(security.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Compliance', url: '/compliance' },
        { name: security.badge, url: `/security/${slug}` },
      ]),
      createTechArticleSchema({
        headline: security.title,
        description: security.description,
        path: `/security/${slug}`,
        keywords: [security.badge, security.regulatoryBody, 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <SecurityClient security={security} />
    </>
  );
}
