import type { Metadata } from 'next';
import { GlossaryClient } from '@/components/glossary/GlossaryClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createDefinedTermSetSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';
import { GLOSSARY_TERMS } from '@/lib/data/glossaryData';

export const metadata: Metadata = constructMetadata({
  title: 'AI Routing & Gateway Engineering Glossary — AEO Knowledge Base',
  description:
    'Comprehensive developer knowledge base and architectural glossary defining prompt caching rebates, sub-15ms TTFT, Anycast routing, 429 shield pooling, and zero data retention.',
  canonicalPath: '/glossary',
  keywords: [
    'AI Gateway Glossary',
    'Prompt Caching Definition',
    'Time to First Token TTFT',
    'Anycast LLM Router',
    'Zero Data Retention AI',
    'OpenAI Wire Compatibility',
    '429 Shield Rate Limiting',
    'Structured JSON Outputs',
  ],
});

export default function GlossaryPage() {
  const definedTerms = GLOSSARY_TERMS.map((t) => ({
    name: t.term,
    description: `${t.shortDefinition} ${t.fullDefinition}`,
    url: `/glossary#${t.slug}`,
  }));

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createDefinedTermSetSchema({
        name: 'GALXAI AI Engineering & Gateway Knowledge Glossary',
        description:
          'Authoritative architectural definitions for LLM routing, prompt caching economics, and low-latency infrastructure.',
        terms: definedTerms,
      }),
      createTechArticleSchema({
        headline: 'AI Routing & Gateway Engineering Technical Glossary',
        description:
          'Comprehensive architectural glossary defining foundational AI gateway concepts, latency benchmarks, and pricing mechanisms.',
        path: '/glossary',
        keywords: ['AEO', 'AI Gateway', 'Prompt Caching', 'Anycast Routing'],
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Glossary', url: '/glossary' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <GlossaryClient />
    </>
  );
}
