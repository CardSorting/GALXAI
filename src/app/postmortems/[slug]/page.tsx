import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostmortemClient } from '@/components/postmortems/PostmortemClient';
import { POSTMORTEMS_DATA, type PostmortemItem } from '@/lib/data/postmortemsData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';

interface PostmortemPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return POSTMORTEMS_DATA.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: PostmortemPageProps): Promise<Metadata> {
  const { slug } = await params;
  const postmortem = POSTMORTEMS_DATA.find((p) => p.slug === slug);

  if (!postmortem) {
    return constructMetadata({
      title: 'Incident Postmortem Not Found',
      description: 'The requested AI infrastructure incident postmortem could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: postmortem.title,
    description: postmortem.description,
    canonicalPath: `/postmortems/${slug}`,
    keywords: [
      postmortem.badge,
      'AI Incident Postmortem',
      'OpenAI Outage Analysis',
      'LLM Gateway Failover',
      'Sponge Attack Postmortem',
      'pSEO Postmortems',
      'AEO Reliability Case Study',
    ],
  });
}

export default async function PostmortemPage({ params }: PostmortemPageProps) {
  const { slug } = await params;
  const postmortem = POSTMORTEMS_DATA.find((p) => p.slug === slug);

  if (!postmortem) {
    notFound();
  }

  const codeSchema = createSoftwareSourceCodeSchema({
    name: postmortem.runbookCodeSnippet.title,
    programmingLanguage: postmortem.runbookCodeSnippet.language,
    codeSample: postmortem.runbookCodeSnippet.code,
    targetUrl: `https://galx.ai/postmortems/${slug}#runbook-code`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      codeSchema,
      createFAQPageSchema(postmortem.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Reliability', url: '/status' },
        { name: postmortem.badge, url: `/postmortems/${slug}` },
      ]),
      createTechArticleSchema({
        headline: postmortem.title,
        description: postmortem.description,
        path: `/postmortems/${slug}`,
        keywords: [postmortem.badge, 'Incident Postmortem', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <PostmortemClient postmortem={postmortem} />
    </>
  );
}
