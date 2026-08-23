import React from 'react';
import type { Metadata } from 'next';
import { JsonSchemaGeneratorClient } from '@/components/tools/JsonSchemaGeneratorClient';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createHowToSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'JSON Schema to Zod & Pydantic Generator — GALXAI Tools',
  description:
    'Free visual JSON Schema to Pydantic v2 and Zod code generator for OpenAI Structured Outputs. Guarantee 100% valid JSON responses with zero parsing errors.',
  canonicalPath: '/tools/json-schema-generator',
  keywords: [
    'JSON Schema to Pydantic',
    'JSON Schema to Zod',
    'OpenAI Structured Outputs Generator',
    'Pydantic v2 Generator',
    'Zod Schema Builder',
    'Constrained Decoding Schema',
    'pSEO Developer Tools',
    'AEO Generator',
  ],
});

export default function JsonSchemaGeneratorPage() {
  const toolFaqs = [
    {
      q: 'How does GALXAI guarantee 100% valid JSON adherence?',
      a: 'GALXAI enforces strict Context-Free Grammar (CFG) token masks at the sampling layer, mathematically eliminating illegal tokens and guaranteeing 0% parse failures.',
    },
    {
      q: 'Does client.beta.chat.completions.parse work with GALXAI?',
      a: 'Yes. GALXAI provides 100% wire-compatibility with the official OpenAI SDK parse methods in both Python and TypeScript.',
    },
    {
      q: 'Can I use optional fields and nested enums?',
      a: 'Yes. The schema generator creates compliant Pydantic, Zod, and JSON Schema objects conforming to OpenAI strict structured output rules.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI JSON Schema to Zod & Pydantic Studio',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/json-schema-generator`,
    description:
      'Interactive visual schema builder to export Pydantic, Zod, and strict JSON Schema for OpenAI structured outputs.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive JSON Schema, Pydantic, and Zod code generator',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Build and Generate Strict Structured Output Schemas',
    description:
      'Step-by-step instructions to create typed JSON Schema objects for AI pipelines.',
    totalTime: 'PT15S',
    steps: [
      { name: 'Add Fields & Types', text: 'Define property names, data types, descriptions, and required flags.' },
      { name: 'Select Target Framework', text: 'Choose between Pydantic v2, Zod (TypeScript), or raw JSON Schema.' },
      { name: 'Copy Generated Code', text: 'Paste the strongly-typed schema directly into your OpenAI parse method.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: 'Pydantic v2 Schema Quickstart',
    programmingLanguage: 'Python',
    codeSample: 'from pydantic import BaseModel, Field\n\nclass OutputSchema(BaseModel):\n    result: str = Field(description="Structured result")',
    targetUrl: 'https://galx.ai/tools/json-schema-generator#schema-output',
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      appSchema,
      howToSchema,
      codeSchema,
      createFAQPageSchema(toolFaqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Tools', url: '/calculator' },
        { name: 'JSON Schema Generator', url: '/tools/json-schema-generator' },
      ]),
      createTechArticleSchema({
        headline: 'JSON Schema to Zod & Pydantic Studio',
        description:
          'Design strongly-typed structured schemas and export Pydantic, Zod, and JSON Schema code.',
        path: '/tools/json-schema-generator',
        keywords: ['JSON Schema', 'Pydantic Generator', 'Zod Generator', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <JsonSchemaGeneratorClient />
    </>
  );
}
