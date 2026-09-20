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
      { '@type': 'Thing', name: 'AI image creation' },
      { '@type': 'Thing', name: 'Managed intelligence' },
      { '@type': 'Thing', name: 'API integration' },
    ],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_CONFIG.url}/explore?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-US',
  };
}

/**
 * Schema.org SoftwareApplication for a documented GALX capability.
 */
export function createSoftwareAppSchema(props?: {
  name?: string;
  description?: string;
  url?: string;
  id?: string;
  featureList?: string[];
  includeRating?: boolean;
}) {
  const softwareId = props?.id || `${props?.url || SITE_CONFIG.url}#software`;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': softwareId,
    name: props?.name || 'GALX Nova',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform',
    description: props?.description || 'GALX Nova is GALX’s managed intelligence layer for reasoning and generation.',
    featureList: props?.featureList || [
      'Supported reasoning and generation capabilities',
      'Documented API integration requirements',
      'GALX-managed service access',
    ],
  };
}

/**
 * Schema.org ItemList for supported GALX capabilities.
 */
export function createModelItemListSchema(models: ModelSpecItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'GALX Nova supported capabilities',
    description: 'Documented capabilities available through GALX Nova.',
    itemListElement: [{
      '@type': 'ListItem',
      position: 1,
      name: 'GALX Nova supported capabilities',
      url: `${SITE_CONFIG.url}/docs/api-reference`,
      item: {
        '@type': 'SoftwareApplication',
        name: 'GALX Nova',
        description: 'Managed intelligence for supported reasoning and generation capabilities.',
        url: `${SITE_CONFIG.url}/docs/api-reference`,
      },
    }],
  };
}

/**
 * Schema.org descriptor for a supported GALX capability.
 */
export function createProductModelSchema(model: ModelSpecItem, options?: { includeRating?: boolean }) {
  const canonicalUrl = `${SITE_CONFIG.url}/docs/api-reference`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalUrl}/#product`,
    name: 'GALX Nova — supported capability',
    description: 'GALX Nova is GALX’s managed intelligence layer for supported reasoning and generation capabilities.',
    disambiguatingDescription: 'Programmable access to documented GALX Nova capabilities.',
    brand: {
      '@type': 'Brand',
      name: 'GALX',
    },
    url: canonicalUrl,
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
 * Schema.org descriptor for Developer access.
 */
export function createGrantFinancialSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'GALX Developer access',
    description: 'Request programmable access to supported GALX Nova capabilities.',
    provider: {
      '@type': 'Organization',
      '@id': `${SITE_CONFIG.url}/#organization`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    url: `${SITE_CONFIG.url}/docs/api-reference`,
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
