import React from 'react';
import type { Metadata } from 'next';
import { FunctionCallingBuilderToolClient } from '@/components/tools/FunctionCallingBuilderToolClient';
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
  title: 'OpenAI Function Calling & Tool Definition Studio — GALXAI Tools',
  description:
    'Free visual OpenAI function calling and tool definition schema generator. Generate JSON tool schemas and complete Python and TypeScript agent execution loops.',
  canonicalPath: '/tools/function-calling-builder',
  keywords: [
    'OpenAI Function Calling Generator',
    'Tool Definition Builder',
    'AI Agent Tool Schema',
    'Parallel Function Calling',
    'LLM Tool Calling Generator',
    'pSEO Tools',
    'AEO Developer Tools',
  ],
});

export default function FunctionCallingBuilderPage() {
  const toolFaqs = [
    {
      q: 'Does GALXAI support Parallel Function Calling?',
      a: 'Yes. All frontier models on GALXAI support parallel tool execution, enabling agents to call multiple functions simultaneously in a single roundtrip.',
    },
    {
      q: 'Can I force the model to invoke a specific function?',
      a: 'Yes. Set tool_choice: {"type": "function", "function": {"name": "your_function_name"}} or tool_choice: "required".',
    },
    {
      q: 'Are tool definitions wire-compatible with standard OpenAI libraries?',
      a: 'Yes. All schemas conform strictly to the OpenAI JSON Schema tool format with 100% wire fidelity.',
    },
  ];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GALXAI Function Calling & Tool Definition Studio',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `${SITE_CONFIG.url}/tools/function-calling-builder`,
    description:
      'Interactive visual tool definition designer and SDK dispatcher code generator for OpenAI and xAI models.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Free interactive function calling schema builder',
    },
  };

  const howToSchema = createHowToSchema({
    name: 'How to Build and Generate OpenAI Tool Definitions',
    description:
      'Step-by-step instructions to create typed tool schemas for autonomous AI agents.',
    totalTime: 'PT15S',
    steps: [
      { name: 'Configure Function Meta', text: 'Specify function name and natural language purpose.' },
      { name: 'Define Parameters', text: 'Add property types, descriptions, and required flags.' },
      { name: 'Export Code & JSON', text: 'Copy the OpenAI tools array and Python/TypeScript dispatch loop.' },
    ],
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: 'OpenAI Tool Definition Schema',
    programmingLanguage: 'JSON',
    codeSample: '[{"type": "function", "function": {"name": "fetch_data", "parameters": {"type": "object"}}}]',
    targetUrl: 'https://galx.ai/tools/function-calling-builder#tool-output',
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
        { name: 'Function Calling Builder', url: '/tools/function-calling-builder' },
      ]),
      createTechArticleSchema({
        headline: 'OpenAI Function Calling & Tool Definition Studio',
        description:
          'Design strongly-typed tool definitions and generate complete Python and TypeScript agent loops.',
        path: '/tools/function-calling-builder',
        keywords: ['Function Calling', 'OpenAI Tools Generator', 'AI Agent Tools', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <FunctionCallingBuilderToolClient />
    </>
  );
}
