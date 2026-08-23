import type { Metadata } from 'next';
import { CookbookClient } from '@/components/docs/CookbookClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Production AI Cookbooks & Reference Recipes — Swarms & RAG',
  description: 'Production recipes and code patterns for Autonomous Multi-Agent Swarms, 500K context RAG pipelines, bulk batch evaluations, and Zero-Data-Retention security workflows.',
  canonicalPath: '/docs/cookbook',
  keywords: [
    'AI Agent Swarm Cookbook',
    '500K Context RAG Python',
    'Batch LLM Pipeline',
    'Zero Data Retention AI Code',
    'LangGraph Production Recipe',
    'CrewAI Code Examples',
  ],
});

export default function CookbookDocsPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Production AI Cookbooks & Reference Recipes',
        description: 'Tested code recipes for Multi-Agent Swarms, 500K context RAG, and bulk batch evaluation pipelines.',
        path: '/docs/cookbook',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Cookbook', url: '/docs/cookbook' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <CookbookClient />
    </>
  );
}
