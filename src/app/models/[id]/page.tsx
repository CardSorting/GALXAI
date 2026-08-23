import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { EXCLUSIVE_MODEL_CATALOG, ModelCatalog } from '@/core/router/ModelCatalog';
import { ModelCardClient } from '@/components/models/ModelCardClient';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createProductModelSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
  createFAQPageSchema,
  createHowToSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';

interface ModelDetailPageProps {
  params: Promise<{ id: string }>;
}

function resolveModelFromSlug(slug: string) {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).trim().toLowerCase();

  // 1. Direct match
  const direct = EXCLUSIVE_MODEL_CATALOG.find(
    (m) =>
      m.id.toLowerCase() === decoded ||
      m.id.replace('/', '-').toLowerCase() === decoded ||
      m.upstreamId.toLowerCase() === decoded
  );
  if (direct) return direct;

  // 2. Catalog Resolver with canonical aliases
  const resolved =
    ModelCatalog.resolveModel(decoded) ||
    ModelCatalog.resolveModel(decoded.replace(/-/g, '.')) ||
    ModelCatalog.resolveModel(decoded.replace(/-/g, '/')) ||
    ModelCatalog.resolveModel(decoded.replace(/^x-ai-/, 'x-ai/'));
  if (resolved) return resolved;

  // 3. Fallback for dash separated version numbers like gpt-5-6-sol -> gpt-5.6-sol
  const dotNormalized = decoded.replace(/(\d+)-(\d+)/g, '$1.$2');
  const dotResolved =
    ModelCatalog.resolveModel(dotNormalized) ||
    EXCLUSIVE_MODEL_CATALOG.find((m) => m.id.toLowerCase() === dotNormalized);
  if (dotResolved) return dotResolved;

  return null;
}

export async function generateStaticParams() {
  return EXCLUSIVE_MODEL_CATALOG.map((m) => ({
    id: m.id.replace('/', '-'),
  }));
}

export async function generateMetadata({ params }: ModelDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const model = resolveModelFromSlug(id);

  if (!model) {
    return constructMetadata({
      title: 'Model Not Found',
      description: 'The requested model could not be found in the GALXAI catalog.',
      noIndex: true,
    });
  }

  const contextK = Math.round(model.contextWindowTokens / 1000);
  const discount = model.discountPercentage ?? 25;
  const slug = model.id.replace('/', '-');

  return constructMetadata({
    title: `${model.name} — Pricing, Specs & Sandbox`,
    description: `Deploy ${model.name} with ${discount}% wholesale savings, 75% prompt caching, and sub-15ms Anycast routing. Input: $${model.inputPricePer1M.toFixed(2)}/1M, Output: $${model.outputPricePer1M.toFixed(2)}/1M, ${contextK}K context window. Drop-in OpenAI SDK replacement.`,
    canonicalPath: `/models/${slug}`,
    keywords: [
      model.id,
      model.upstreamId,
      model.name,
      model.provider,
      'OpenAI drop-in',
      'AI Gateway',
      'Model Specs',
      'Wholesale LLM Pricing',
      'Prompt Caching',
      'Developer Quickstart',
    ],
  });
}

export default async function ModelDetailPage({ params }: ModelDetailPageProps) {
  const { id } = await params;
  const model = resolveModelFromSlug(id);

  if (!model) {
    notFound();
  }

  const slug = model.id.replace('/', '-');
  const siblingModels = EXCLUSIVE_MODEL_CATALOG.filter((m) => m.id !== model.id);
  const contextK = Math.round(model.contextWindowTokens / 1000);

  const modelFaqs = [
    {
      q: `How much does ${model.name} cost on GALXAI vs direct retail?`,
      a: `On GALXAI, ${model.name} (${model.id}) costs $${model.inputPricePer1M.toFixed(2)} / 1M input tokens and $${model.outputPricePer1M.toFixed(2)} / 1M output tokens (a ${model.discountPercentage ?? 25}% direct wholesale discount). Cached prompts receive an additional 75% compound rebate.`,
    },
    {
      q: `How do I connect ${model.name} to the OpenAI Python SDK or Cursor IDE?`,
      a: `Set the OpenAI base_url to "https://api.galx.ai/v1", supply your GALXAI API key ("galx_live_..."), and specify model="${model.id}". It functions as a 100% wire-compatible 1-line drop-in replacement.`,
    },
    {
      q: `What is the context window and completion limit for ${model.name}?`,
      a: `${model.name} features a ${contextK}K token context window (${model.contextWindowTokens.toLocaleString()} tokens) with a maximum completion output of ${model.maxOutputTokens.toLocaleString()} tokens per response.`,
    },
  ];

  const codeSnippet = `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "Execute high-throughput inference on ${model.name}"}]
)
print(response.choices[0].message.content)`;

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createProductModelSchema(model),
      createFAQPageSchema(modelFaqs),
      createHowToSchema({
        name: `How to Connect to ${model.name} in 30 Seconds`,
        description: `Step-by-step instructions to route ${model.name} completions via GALXAI with wholesale discounts.`,
        totalTime: 'PT30S',
        steps: [
          { name: 'Generate API Key', text: 'Obtain a free live developer key with $5 compute credits.' },
          { name: 'Set Base URL', text: 'Set baseURL="https://api.galx.ai/v1" in OpenAI client settings.' },
          { name: 'Request Inference', text: `Execute completion requests specifying model="${model.id}".` },
        ],
      }),
      createSoftwareSourceCodeSchema({
        name: `${model.name} Python 1-Line Drop-in Snippet`,
        programmingLanguage: 'Python',
        codeSample: codeSnippet,
        targetUrl: `https://galx.ai/models/${slug}#recipes`,
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Models', url: '/models' },
        { name: model.name, url: `/models/${slug}` },
      ]),
      createTechArticleSchema({
        headline: `${model.name} Specifications, Pricing & API Reference`,
        description: model.description,
        path: `/models/${slug}`,
        keywords: [model.id, model.provider, 'AI Gateway', 'AEO', 'LLM Benchmark'],
      }),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd data={pageSchema} />

      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: model.name },
          ]}
        />

        {/* Rich Interactive Client Experience */}
        <ModelCardClient model={model} siblingModels={siblingModels} />
      </main>

      {/* Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
