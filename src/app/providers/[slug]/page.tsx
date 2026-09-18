import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProviderPortalClient } from '@/components/providers/ProviderPortalClient';
import { PROVIDERS_DATA, type ProviderPortalItem } from '@/lib/data/providersData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

interface ProviderPortalPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PROVIDERS_DATA.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: ProviderPortalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = PROVIDERS_DATA.find((p) => p.slug === slug);

  if (!provider) {
    return constructMetadata({
      title: 'Provider Not Found',
      description: 'The requested AI model provider portal could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: provider.title,
    description: provider.description,
    canonicalPath: `/providers/${slug}`,
    keywords: [
      provider.providerName,
      `${provider.providerName} API Gateway`,
      'Wholesale AI Tokens',
      'Prompt Caching',
      'Distributed AI Proxy',
      'pSEO Provider Portal',
      'AEO Gateway',
    ],
  });
}

export default async function ProviderPortalPage({ params }: ProviderPortalPageProps) {
  const { slug } = await params;
  const provider = PROVIDERS_DATA.find((p) => p.slug === slug);

  if (!provider) {
    notFound();
  }

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${provider.providerName} Model Fleet on GALXAI`,
    description: provider.description,
    itemListElement: provider.featuredModels.map((m, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: m.name,
      url: `${SITE_CONFIG.url}/models/${m.id.replace('/', '-')}`,
    })),
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      itemListSchema,
      createFAQPageSchema(provider.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Models', url: '/models' },
        { name: `${provider.providerName} Gateway`, url: `/providers/${slug}` },
      ]),
      createTechArticleSchema({
        headline: provider.title,
        description: provider.description,
        path: `/providers/${slug}`,
        keywords: [provider.providerName, 'AI Gateway', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ProviderPortalClient provider={provider} />
    </>
  );
}
