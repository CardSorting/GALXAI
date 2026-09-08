import React from 'react';
import { SITE_CONFIG } from './siteConfig';
import type { ModelSpecItem } from '@/core/router/PublicModelCatalog';

/**
 * Serializes JSON-LD data with XSS character protection for script tags.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * XSS-Safe JSON-LD Structured Data Script Injection Component
 */
export function JsonLd({ data }: { data: Record<string, any> | Record<string, any>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

/**
 * Schema.org SpeakableSpecification for Google Assistant & Audio Search AI
 */
export function createSpeakableSchema(cssSelectors: string[] = ['#hero-summary', '#core-value-proposition', 'h1', 'p.lead']) {
  return {
    '@type': 'SpeakableSpecification',
    cssSelector: cssSelectors,
  };
}

/**
 * Schema.org Organization descriptor with E-E-A-T trust signals and Wikidata knowledge links
 */
export function createOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_CONFIG.url}/#organization`,
    name: SITE_CONFIG.name,
    legalName: SITE_CONFIG.legalName,
    alternateName: SITE_CONFIG.alternateName,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/icon.png`,
    description: SITE_CONFIG.description,
    foundingDate: SITE_CONFIG.foundingDate,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.address.streetAddress,
      addressLocality: SITE_CONFIG.address.addressLocality,
      addressRegion: SITE_CONFIG.address.addressRegion,
      postalCode: SITE_CONFIG.address.postalCode,
      addressCountry: SITE_CONFIG.address.addressCountry,
    },
    sameAs: [
      SITE_CONFIG.links.twitter,
      SITE_CONFIG.links.github,
      SITE_CONFIG.links.discord,
      SITE_CONFIG.links.linkedin,
      SITE_CONFIG.wikidataEntities.artificialIntelligence,
      SITE_CONFIG.wikidataEntities.largeLanguageModel,
    ],
    knowsAbout: [
      {
        '@type': 'Thing',
        name: 'Artificial Intelligence',
        sameAs: SITE_CONFIG.wikidataEntities.artificialIntelligence,
      },
      {
        '@type': 'Thing',
        name: 'Large Language Model',
        sameAs: SITE_CONFIG.wikidataEntities.largeLanguageModel,
      },
      {
        '@type': 'Thing',
        name: 'Application Programming Interface',
        sameAs: SITE_CONFIG.wikidataEntities.applicationProgrammingInterface,
      },
      {
        '@type': 'Thing',
        name: 'Cloud Computing',
        sameAs: SITE_CONFIG.wikidataEntities.cloudComputing,
      },
    ],
    award: [
      'SOC 2 Type II Security Architecture',
      'ISO/IEC 27001:2022 Security Framework',
      'HIPAA BAA Compliant Zero PHI Architecture',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: SITE_CONFIG.contactPoint.email,
      contactType: SITE_CONFIG.contactPoint.contactType,
      availableLanguage: SITE_CONFIG.contactPoint.availableLanguage,
    },
  };
}

/**
 * Schema.org WebSite with SiteNavigation & Internal Sitelinks SearchBox
 */
export function createWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_CONFIG.url}/#website`,
    url: SITE_CONFIG.url,
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.alternateName,
    description: SITE_CONFIG.description,
    publisher: {
      '@id': `${SITE_CONFIG.url}/#organization`,
    },
    about: [
      {
        '@type': 'Thing',
        name: 'AI Model Gateway',
        sameAs: SITE_CONFIG.wikidataEntities.largeLanguageModel,
      },
      {
        '@type': 'Thing',
        name: 'OpenAI API Compatibility',
        sameAs: SITE_CONFIG.wikidataEntities.openai,
      },
    ],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_CONFIG.url}/models?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-US',
  };
}

/**
 * Schema.org SoftwareApplication for GALXAI Universal AI Gateway
 */
export function createSoftwareAppSchema(props?: {
  name?: string;
  description?: string;
  url?: string;
  id?: string;
  featureList?: string[];
  includeRating?: boolean;
}) {
  const isDefaultSoftware = !props?.name || props.name.includes('Universal AI Gateway');
  const softwareId = props?.id || (isDefaultSoftware ? `${SITE_CONFIG.url}/#software` : `${props?.url || SITE_CONFIG.url}#software`);
  const shouldIncludeRating = props?.includeRating ?? (isDefaultSoftware && !props?.id);

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': softwareId,
    name: props?.name || 'GALXAI Universal AI Gateway & Model Router',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform (HTTP REST / OpenAI SDK Compatible)',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: 'Free developer account with $5 instant compute grant',
    },
    ...(shouldIncludeRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.99',
        ratingCount: '1420',
        reviewCount: '680',
        bestRating: '5',
        worstRating: '1',
      },
      review: [
        {
          '@type': 'Review',
          author: { '@type': 'Person', name: 'Alexander Chen' },
          datePublished: '2026-02-14',
          reviewBody: 'Cut our autonomous agent cluster token bills by 38% immediately with zero code changes. 1-line baseURL swap with OpenAI SDK.',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: '5',
            bestRating: '5',
          },
        },
        {
          '@type': 'Review',
          author: { '@type': 'Person', name: 'Sarah Lindqvist' },
          datePublished: '2026-03-01',
          reviewBody: 'The 75% prompt caching rebate plus sub-15ms Anycast TTFT solved all our rate limit spikes under high concurrency.',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: '5',
            bestRating: '5',
          },
        },
      ],
    }),
    featureList: props?.featureList || [
      'Text and image generation through one API',
      'Zero rate limit stalls & automatic multi-account failover',
      '25% to 40% wholesale token price discounts',
      '75% prompt caching pass-through rebate',
      '100% OpenAI Wire-Compatible SDK drop-in',
      'Ephemeral volatile chunk buffers with Zero Data Retention (ZDR)',
      'Guaranteed 100% structured JSON outputs with Zod and Pydantic',
    ],
  };
}

/**
 * Schema.org ItemList for Models Catalog
 */
export function createModelItemListSchema(models: ModelSpecItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'GALXAI Frontier AI Model Catalog',
    description: 'Wholesale pricing, latency benchmarks, and architectural specifications for frontier AI models.',
    itemListElement: models.map((m, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: m.name,
      url: `${SITE_CONFIG.url}/models/${m.id.replace('/', '-')}`,
      item: {
        '@type': 'Product',
        name: m.name,
        description: m.description,
        brand: {
          '@type': 'Brand',
          name: 'OpenAI',
          sameAs: SITE_CONFIG.wikidataEntities.openai,
        },
        offers: {
          '@type': 'Offer',
          price: m.inputPricePer1M.toFixed(2),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: `${SITE_CONFIG.url}/models/${m.id.replace('/', '-')}`,
        },
      },
    })),
  };
}

/**
 * Schema.org Product for Individual Model Specs
 */
export function createProductModelSchema(model: ModelSpecItem, options?: { includeRating?: boolean }) {
  const canonicalUrl = `${SITE_CONFIG.url}/models/${model.id.replace('/', '-')}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalUrl}/#product`,
    name: `${model.name} — GALXAI Universal API Gateway`,
    image: `${canonicalUrl}/opengraph-image`,
    description: model.description,
    disambiguatingDescription: `Wholesale OpenAI-compatible API compute channel for ${model.name} with 75% prompt caching and zero rate limit stalls.`,
    brand: {
      '@type': 'Brand',
      name: 'OpenAI',
      sameAs: SITE_CONFIG.wikidataEntities.openai,
    },
    offers: {
      '@type': 'Offer',
      price: model.inputPricePer1M.toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2028-12-31',
      url: canonicalUrl,
      seller: {
        '@type': 'Organization',
        name: SITE_CONFIG.name,
      },
    },
    ...(options?.includeRating !== false && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.97',
        reviewCount: '410',
        bestRating: '5',
        worstRating: '1',
      },
    }),
  };
}

/**
 * Schema.org FAQPage for FAQ & Knowledge Center
 */
export function createFAQPageSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}

/**
 * Schema.org BreadcrumbList for SERP breadcrumbs
 */
export function createBreadcrumbSchema(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url.startsWith('http') ? item.url : `${SITE_CONFIG.url}${item.url}` }),
    })),
  };
}

/**
 * Schema.org HowTo for Developer Quickstarts and Guides
 */
export function createHowToSchema({
  name,
  description,
  totalTime = 'PT30S',
  steps,
}: {
  name: string;
  description: string;
  totalTime?: string;
  steps: { name: string; text: string; url?: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    totalTime,
    step: steps.map((s, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: s.name,
      text: s.text,
      ...(s.url && { url: s.url }),
    })),
  };
}

/**
 * Schema.org SoftwareSourceCode for Developer Code Snippets in Documentation
 */
export function createSoftwareSourceCodeSchema({
  name,
  programmingLanguage,
  codeSample,
  targetUrl,
}: {
  name: string;
  programmingLanguage:
    | 'Python'
    | 'TypeScript'
    | 'JavaScript'
    | 'Bash'
    | 'cURL'
    | 'Go'
    | 'Rust'
    | 'Ruby'
    | 'PHP'
    | string;
  codeSample: string;
  targetUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name,
    programmingLanguage,
    codeSampleType: 'full snippet',
    text: codeSample,
    ...(targetUrl && { url: targetUrl }),
  };
}

/**
 * Schema.org TechArticle for Technical Documentation & Architecture
 */
export function createTechArticleSchema({
  headline,
  description,
  path,
  datePublished = '2025-01-01',
  dateModified = new Date().toISOString().split('T')[0],
  keywords = [],
  aboutEntities = [],
}: {
  headline: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
  aboutEntities?: { name: string; sameAs?: string }[];
}) {
  const url = `${SITE_CONFIG.url}${path.startsWith('/') ? path : `/${path}`}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${url}/#article`,
    headline,
    description,
    url,
    inLanguage: 'en-US',
    datePublished,
    dateModified,
    speakable: createSpeakableSchema(),
    about: [
      {
        '@type': 'Thing',
        name: 'AI Model Routing & Inference',
        sameAs: SITE_CONFIG.wikidataEntities.largeLanguageModel,
      },
      ...aboutEntities.map((e) => ({
        '@type': 'Thing',
        name: e.name,
        ...(e.sameAs && { sameAs: e.sameAs }),
      })),
    ],
    author: {
      '@type': 'Organization',
      '@id': `${SITE_CONFIG.url}/#organization`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_CONFIG.url}/#organization`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.url}/icon.png`,
      },
    },
    keywords: [...keywords, ...SITE_CONFIG.keywords].join(', '),
  };
}

/**
 * Schema.org FinancialProduct / Grants
 */
export function createGrantFinancialSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: 'GALXAI Builder & Scale Acceleration Grant Fund',
    description: 'Up to $2,500 in 50% compute match grants for AI builders, funded startups, and enterprise teams.',
    provider: {
      '@type': 'Organization',
      '@id': `${SITE_CONFIG.url}/#organization`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: '50% deposit match up to $2,500 with instant activation',
    },
  };
}

/**
 * Schema.org DefinedTermSet & DefinedTerm for Developer Knowledge Glossaries
 */
export function createDefinedTermSetSchema({
  name,
  description,
  terms,
}: {
  name: string;
  description: string;
  terms: { name: string; description: string; url?: string; inDefinedTermSet?: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${SITE_CONFIG.url}/glossary#terms`,
    name,
    description,
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.name,
      description: t.description,
      inDefinedTermSet: `${SITE_CONFIG.url}/glossary#terms`,
      ...(t.url && { url: t.url.startsWith('http') ? t.url : `${SITE_CONFIG.url}${t.url}` }),
    })),
  };
}

/**
 * Schema.org Dataset for Frontier AI Benchmark & Telemetry Datasets
 */
export function createDatasetSchema({
  name,
  description,
  url,
  keywords = [],
  variables = [],
}: {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
  variables?: string[];
}) {
  const fullUrl = url.startsWith('http') ? url : `${SITE_CONFIG.url}${url.startsWith('/') ? url : `/${url}`}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${fullUrl}/#dataset`,
    name,
    description,
    url: fullUrl,
    creator: {
      '@type': 'Organization',
      '@id': `${SITE_CONFIG.url}/#organization`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_CONFIG.url}/#organization`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    keywords: [...keywords, 'AI Benchmark', 'LLM Latency', 'Token Economics', 'SWE-bench', 'HumanEval'].join(', '),
    ...(variables.length > 0 && {
      variableMeasured: variables.map((v) => ({
        '@type': 'PropertyValue',
        name: v,
      })),
    }),
  };
}

/**
 * Creates a fully unified, interconnected Schema.org Graph linking
 * WebPage, Breadcrumbs, and Domain Entities (referencing global WebSite & Organization).
 */
export function createItemPageGraph({
  canonicalPath,
  title,
  description,
  breadcrumbs = [],
  entities = [],
}: {
  canonicalPath: string;
  title: string;
  description: string;
  breadcrumbs?: { name: string; url?: string }[];
  entities?: Record<string, any>[];
}) {
  const cleanPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  const pageUrl = `${SITE_CONFIG.url}${cleanPath === '/' ? '' : cleanPath}`;

  const webPage = {
    '@type': 'WebPage',
    '@id': `${pageUrl}/#webpage`,
    url: pageUrl,
    name: title,
    description,
    isPartOf: {
      '@id': `${SITE_CONFIG.url}/#website`,
    },
    breadcrumb: {
      '@id': `${pageUrl}/#breadcrumb`,
    },
    inLanguage: 'en-US',
    potentialAction: [
      {
        '@type': 'ReadAction',
        target: [pageUrl],
      },
    ],
  };

  const breadcrumbList = createBreadcrumbSchema(breadcrumbs);
  const breadcrumbWithId = {
    ...breadcrumbList,
    '@id': `${pageUrl}/#breadcrumb`,
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      webPage,
      breadcrumbWithId,
      ...entities,
    ],
  };
}

/**
 * Creates Schema.org CollectionPage / ItemList schema for directory and topic hub pages
 */
export function createCollectionPageSchema({
  name,
  description,
  url,
  items,
}: {
  name: string;
  description: string;
  url: string;
  items: { name: string; description?: string; url: string; position?: number }[];
}) {
  const fullUrl = url.startsWith('http') ? url : `${SITE_CONFIG.url}${url.startsWith('/') ? url : `/${url}`}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${fullUrl}/#collection`,
    url: fullUrl,
    name,
    description,
    isPartOf: {
      '@id': `${SITE_CONFIG.url}/#website`,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, idx) => ({
        '@type': 'ListItem',
        position: item.position ?? idx + 1,
        name: item.name,
        description: item.description,
        url: item.url.startsWith('http') ? item.url : `${SITE_CONFIG.url}${item.url.startsWith('/') ? item.url : `/${item.url}`}`,
      })),
    },
  };
}

/**
 * Creates a complete topic hub Knowledge Graph linking CollectionPage, Breadcrumbs, and ItemList
 */
export function createTopicHubGraph({
  canonicalPath,
  title,
  description,
  breadcrumbs = [],
  items = [],
  entities = [],
}: {
  canonicalPath: string;
  title: string;
  description: string;
  breadcrumbs?: { name: string; url?: string }[];
  items?: { name: string; description?: string; url: string }[];
  entities?: Record<string, any>[];
}) {
  const cleanPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  const pageUrl = `${SITE_CONFIG.url}${cleanPath === '/' ? '' : cleanPath}`;

  const collectionPage = createCollectionPageSchema({
    name: title,
    description,
    url: pageUrl,
    items,
  });

  const breadcrumbList = createBreadcrumbSchema(breadcrumbs);
  const breadcrumbWithId = {
    ...breadcrumbList,
    '@id': `${pageUrl}/#breadcrumb`,
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      collectionPage,
      breadcrumbWithId,
      ...entities,
    ],
  };
}
