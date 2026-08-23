import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ErrorTroubleshootClient } from '@/components/docs/ErrorTroubleshootClient';
import { ERROR_TROUBLESHOOT_DATA, type ErrorTroubleshootItem } from '@/lib/data/errorsData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createHowToSchema,
  createSoftwareSourceCodeSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';

interface ErrorPageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  return ERROR_TROUBLESHOOT_DATA.map((e) => ({
    code: e.code,
  }));
}

export async function generateMetadata({ params }: ErrorPageProps): Promise<Metadata> {
  const { code } = await params;
  const errorItem = ERROR_TROUBLESHOOT_DATA.find((e) => e.code === code);

  if (!errorItem) {
    return constructMetadata({
      title: 'Error Guide Not Found',
      description: 'The requested error troubleshooting guide could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: errorItem.title,
    description: errorItem.description,
    canonicalPath: `/docs/errors/${code}`,
    keywords: [
      errorItem.code,
      errorItem.errorType,
      `HTTP ${errorItem.httpStatus}`,
      'OpenAI error fix',
      'AI Gateway troubleshooting',
      '429 Rate Limit fix',
      'pSEO Error Guide',
      'AEO Technical Fix',
    ],
  });
}

export default async function ErrorTroubleshootPage({ params }: ErrorPageProps) {
  const { code } = await params;
  const errorItem = ERROR_TROUBLESHOOT_DATA.find((e) => e.code === code);

  if (!errorItem) {
    notFound();
  }

  const howToSchema = createHowToSchema({
    name: errorItem.headline,
    description: errorItem.description,
    totalTime: 'PT30S',
    steps: [
      { name: 'Diagnose Root Cause', text: errorItem.rootCause },
      { name: 'Apply Gateway Fix', text: errorItem.permanentFix },
      { name: 'Verify Resolution', text: 'Execute test completion to verify 0 dropped sockets.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: `Resolution Snippet for ${errorItem.errorType}`,
    programmingLanguage: errorItem.codeSnippet.language === 'Python' ? 'Python' : 'TypeScript',
    codeSample: errorItem.codeSnippet.code,
    targetUrl: `https://galx.ai/docs/errors/${code}#permanent-fix`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      howToSchema,
      codeSchema,
      createFAQPageSchema(errorItem.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Errors', url: '/docs/error-handling' },
        { name: `HTTP ${errorItem.httpStatus}`, url: `/docs/errors/${code}` },
      ]),
      createTechArticleSchema({
        headline: errorItem.title,
        description: errorItem.description,
        path: `/docs/errors/${code}`,
        keywords: [errorItem.errorType, 'AI Error Resolution', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ErrorTroubleshootClient errorItem={errorItem} />
    </>
  );
}
