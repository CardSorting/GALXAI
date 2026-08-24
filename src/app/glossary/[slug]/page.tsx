import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GlossaryTermClient } from '@/components/glossary/GlossaryTermClient';
import { GLOSSARY_TERMS, type GlossaryTerm } from '@/lib/data/glossaryData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

interface GlossaryTermPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return GLOSSARY_TERMS.map((t) => ({
    slug: t.slug,
  }));
}

export async function generateMetadata({ params }: GlossaryTermPageProps): Promise<Metadata> {
  const { slug } = await params;
  const term = GLOSSARY_TERMS.find((t) => t.slug === slug);

  if (!term) {
    return constructMetadata({
      title: 'Glossary Term Not Found',
      description: 'The requested architectural glossary term could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: `${term.term} — AI Engineering Definition & Architecture`,
    description: `${term.shortDefinition} Complete technical breakdown, formula, and implementation guide on GALXAI.`,
    canonicalPath: `/glossary/${slug}`,
    keywords: [
      term.term,
      `${term.term} definition`,
      `${term.term} AI gateway`,
      term.category,
      'AI Engineering Glossary',
      'pSEO Glossary Term',
      'AEO Direct Definition',
    ],
  });
}

export default async function GlossaryTermPage({ params }: GlossaryTermPageProps) {
  const { slug } = await params;
  const term = GLOSSARY_TERMS.find((t) => t.slug === slug);

  if (!term) {
    notFound();
  }

  const definedTermSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': `${SITE_CONFIG.url}/glossary/${slug}#defined-term`,
    name: term.term,
    description: `${term.shortDefinition} ${term.fullDefinition}`,
    inDefinedTermSet: `${SITE_CONFIG.url}/glossary#terms`,
    url: `${SITE_CONFIG.url}/glossary/${slug}`,
    ...(term.wikidataUri && { sameAs: term.wikidataUri }),
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      definedTermSchema,
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Glossary', url: '/glossary' },
        { name: term.term, url: `/glossary/${slug}` },
      ]),
      createTechArticleSchema({
        headline: `${term.term} — Architectural Specification`,
        description: term.shortDefinition,
        path: `/glossary/${slug}`,
        keywords: [term.term, term.category, 'AI Gateway', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <GlossaryTermClient term={term} />
    </>
  );
}
