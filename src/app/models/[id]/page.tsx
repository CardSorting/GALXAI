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
    return { title: 'Model Not Found | GALXAI' };
  }

  const contextK = Math.round(model.contextWindowTokens / 1000);
  const discount = model.discountPercentage || 25;

  return {
    title: `${model.name} — Pricing, Specs & Sandbox | GALXAI`,
    description: `Deploy ${model.name} with ${discount}% wholesale savings, 75% prompt caching, and sub-15ms Anycast routing. Input: $${model.inputPricePer1M.toFixed(2)}/1M, Output: $${model.outputPricePer1M.toFixed(2)}/1M, ${contextK}K context window. Drop-in OpenAI SDK replacement.`,
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
      'Developer Quickstart'
    ],
    openGraph: {
      title: `${model.name} — GALXAI Universal API Specs`,
      description: `Save ${discount}% on ${model.name} with sub-15ms Anycast failover and 75% prompt caching. 1-line OpenAI SDK drop-in.`,
      url: `https://galx.ai/models/${model.id.replace('/', '-')}`,
      siteName: 'GALXAI',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${model.name} — GALXAI Pricing & Specs`,
      description: `Save ${discount}% on ${model.name} with 75% prompt caching and instant OpenAI client compatibility.`,
    },
  };
}

export default async function ModelDetailPage({ params }: ModelDetailPageProps) {
  const { id } = await params;
  const model = resolveModelFromSlug(id);

  if (!model) {
    notFound();
  }

  const isGrok = model.provider === 'xai-grok';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://galx.ai';
  const canonicalUrl = `${baseUrl}/models/${model.id.replace('/', '-')}`;

  // Sibling models for matrix comparison
  const siblingModels = EXCLUSIVE_MODEL_CATALOG.filter((m) => m.id !== model.id);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${model.name} — GALXAI Universal API`,
    image: `${baseUrl}/models/${model.id.replace('/', '-')}/opengraph-image`,
    description: model.description,
    brand: {
      '@type': 'Brand',
      name: isGrok ? 'xAI' : 'OpenAI',
    },
    offers: {
      '@type': 'Offer',
      price: model.inputPricePer1M.toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2027-12-31',
      url: canonicalUrl,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.95',
      reviewCount: '240',
    },
  };

  const softwareAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: model.name,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform (HTTP REST / OpenAI SDK)',
    offers: {
      '@type': 'Offer',
      price: model.inputPricePer1M.toFixed(2),
      priceCurrency: 'USD',
    },
    featureList: [
      `${Math.round(model.contextWindowTokens / 1000)}K Context Window`,
      '75% Prompt Caching Pass-Through',
      'Sub-15ms Anycast Failover',
      'Zero Data Retention (ZDR)',
      '100% OpenAI Wire-Compatible'
    ]
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />

      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: model.name }
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

