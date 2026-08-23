import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SecurityPatternClient } from '@/components/security/SecurityPatternClient';
import { SECURITY_PATTERNS_DATA, type SecurityPatternItem } from '@/lib/data/securityPatternsData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';

interface SecurityPatternPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SECURITY_PATTERNS_DATA.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: SecurityPatternPageProps): Promise<Metadata> {
  const { slug } = await params;
  const pattern = SECURITY_PATTERNS_DATA.find((p) => p.slug === slug);

  if (!pattern) {
    return constructMetadata({
      title: 'Security Pattern Not Found',
      description: 'The requested AI red-teaming security pattern could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: pattern.title,
    description: pattern.description,
    canonicalPath: `/security/patterns/${slug}`,
    keywords: [
      pattern.badge,
      pattern.owaspLlmMapping,
      'Prompt Injection Defense',
      'AI Red-Teaming',
      'Jailbreak Mitigation',
      'Data Exfiltration Prevention',
      'pSEO Security Patterns',
      'AEO AI Safety',
    ],
  });
}

export default async function SecurityPatternPage({ params }: SecurityPatternPageProps) {
  const { slug } = await params;
  const pattern = SECURITY_PATTERNS_DATA.find((p) => p.slug === slug);

  if (!pattern) {
    notFound();
  }

  const codeSchema = createSoftwareSourceCodeSchema({
    name: pattern.mitigationCodeSnippet.title,
    programmingLanguage: pattern.mitigationCodeSnippet.language,
    codeSample: pattern.mitigationCodeSnippet.code,
    targetUrl: `https://galx.ai/security/patterns/${slug}#mitigation-code`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      codeSchema,
      createFAQPageSchema(pattern.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Security', url: '/compliance' },
        { name: pattern.badge, url: `/security/patterns/${slug}` },
      ]),
      createTechArticleSchema({
        headline: pattern.title,
        description: pattern.description,
        path: `/security/patterns/${slug}`,
        keywords: [pattern.badge, pattern.owaspLlmMapping, 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <SecurityPatternClient pattern={pattern} />
    </>
  );
}
