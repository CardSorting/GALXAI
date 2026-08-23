import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SdkLangClient } from '@/components/docs/SdkLangClient';
import { SDK_LANG_GUIDES, type SdkLangGuide } from '@/lib/data/sdksData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createHowToSchema,
  createSoftwareSourceCodeSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';

interface SdkLangPageProps {
  params: Promise<{ lang: string }>;
}

export async function generateStaticParams() {
  return SDK_LANG_GUIDES.map((s) => ({
    lang: s.slug,
  }));
}

export async function generateMetadata({ params }: SdkLangPageProps): Promise<Metadata> {
  const { lang } = await params;
  const guide = SDK_LANG_GUIDES.find((s) => s.slug === lang);

  if (!guide) {
    return constructMetadata({
      title: 'SDK Guide Not Found',
      description: 'The requested language SDK guide could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: guide.title,
    description: guide.description,
    canonicalPath: `/docs/sdks/${lang}`,
    keywords: [
      guide.language,
      guide.packageManager,
      'AI Gateway SDK',
      'OpenAI drop-in library',
      'SSE streaming',
      'Wholesale AI Tokens',
      'pSEO SDK Guide',
      'AEO Technical Quickstart',
    ],
  });
}

export default async function SdkLangPage({ params }: SdkLangPageProps) {
  const { lang } = await params;
  const guide = SDK_LANG_GUIDES.find((s) => s.slug === lang);

  if (!guide) {
    notFound();
  }

  const howToSchema = createHowToSchema({
    name: guide.headline,
    description: guide.description,
    totalTime: 'PT30S',
    steps: [
      { name: 'Install Library', text: `Run ${guide.installCommand}` },
      { name: 'Configure Base URL', text: 'Set BaseURL to "https://api.galx.ai/v1"' },
      { name: 'Run Inference', text: 'Execute chat completions or streaming requests.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: `${guide.language} Quickstart Snippet`,
    programmingLanguage: guide.language,
    codeSample: guide.codeSnippet,
    targetUrl: `https://galx.ai/docs/sdks/${lang}#code-snippet`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      howToSchema,
      codeSchema,
      createFAQPageSchema(guide.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'SDKs', url: '/docs/sdks' },
        { name: guide.language, url: `/docs/sdks/${lang}` },
      ]),
      createTechArticleSchema({
        headline: guide.title,
        description: guide.description,
        path: `/docs/sdks/${lang}`,
        keywords: [guide.language, 'AI Gateway SDK', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <SdkLangClient guide={guide} />
    </>
  );
}
