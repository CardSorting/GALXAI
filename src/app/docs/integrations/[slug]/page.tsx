import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { IntegrationClient } from '@/components/docs/IntegrationClient';
import { INTEGRATION_GUIDES, type IntegrationGuide } from '@/lib/data/integrationsData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createHowToSchema,
  createSoftwareSourceCodeSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';

interface IntegrationPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return INTEGRATION_GUIDES.map((g) => ({
    slug: g.slug,
  }));
}

export async function generateMetadata({ params }: IntegrationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = INTEGRATION_GUIDES.find((g) => g.slug === slug);

  if (!guide) {
    return constructMetadata({
      title: 'Integration Guide Not Found',
      description: 'The requested developer integration guide could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: guide.title,
    description: guide.description,
    canonicalPath: `/docs/integrations/${slug}`,
    keywords: [
      guide.name,
      slug,
      'OpenAI drop-in',
      'AI Gateway Integration',
      'Cursor AI setup',
      'LangChain baseURL',
      'Vercel AI SDK',
      'Prompt Caching',
      'Wholesale AI Tokens',
    ],
  });
}

export default async function IntegrationPage({ params }: IntegrationPageProps) {
  const { slug } = await params;
  const guide = INTEGRATION_GUIDES.find((g) => g.slug === slug);

  if (!guide) {
    notFound();
  }

  const howToSchema = createHowToSchema({
    name: guide.headline,
    description: guide.description,
    totalTime: guide.timeToSetup,
    steps: guide.steps.map((s) => ({
      name: s.name,
      text: s.description,
    })),
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: `${guide.name} Configuration Snippet`,
    programmingLanguage: guide.codeExample.language === 'Python' ? 'Python' : 'TypeScript',
    codeSample: guide.codeExample.code,
    targetUrl: `https://galx.ai/docs/integrations/${slug}#code-example`,
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
        { name: 'Integrations', url: '/docs/ide-setup' },
        { name: guide.name, url: `/docs/integrations/${slug}` },
      ]),
      createTechArticleSchema({
        headline: guide.title,
        description: guide.description,
        path: `/docs/integrations/${slug}`,
        keywords: [guide.name, 'AI Gateway', 'Integration Guide', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <IntegrationClient guide={guide} />
    </>
  );
}
