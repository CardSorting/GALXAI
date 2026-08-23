import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import { CURATED_MATCHUPS } from '@/lib/data/comparisonData';
import { INTEGRATION_GUIDES } from '@/lib/data/integrationsData';
import { SOLUTION_GUIDES } from '@/lib/data/solutionsData';
import { COMPETITOR_ALTERNATIVES } from '@/lib/data/alternativesData';
import { ERROR_TROUBLESHOOT_DATA } from '@/lib/data/errorsData';
import { SDK_LANG_GUIDES } from '@/lib/data/sdksData';
import { MIGRATION_GUIDES_DATA } from '@/lib/data/migrationData';
import { COOKBOOK_RECIPES_DATA } from '@/lib/data/cookbooksData';
import { PROVIDERS_DATA } from '@/lib/data/providersData';
import { CAPABILITIES_DATA } from '@/lib/data/capabilitiesData';
import { WORKLOAD_BENCHMARKS_DATA } from '@/lib/data/workloadBenchmarksData';
import { ARCHITECTURE_WHITEPAPERS_DATA } from '@/lib/data/architectureWhitepapersData';
import { SECURITY_SPECIFICATIONS_DATA } from '@/lib/data/securityData';
import { RELIABILITY_DATA } from '@/lib/data/reliabilityData';
import { INDUSTRIES_DATA } from '@/lib/data/industriesData';
import { SECURITY_PATTERNS_DATA } from '@/lib/data/securityPatternsData';
import { POSTMORTEMS_DATA } from '@/lib/data/postmortemsData';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.url;
  const currentDate = new Date();

  // 1. High-Priority Conversion & Discovery Core Routes
  const coreRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/models`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/grants`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.92,
    },
    {
      url: `${baseUrl}/queues`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/models/compare`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.88,
    },
    {
      url: `${baseUrl}/models/resolver`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/benchmarks`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.92,
    },
    {
      url: `${baseUrl}/calculator`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.91,
    },
    {
      url: `${baseUrl}/architecture`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.82,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.82,
    },
    {
      url: `${baseUrl}/status`,
      lastModified: currentDate,
      changeFrequency: 'always',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compliance`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/vault`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/vault/deposit`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/vault/simulator`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/keys`,
      lastModified: currentDate,
      changeFrequency: 'always',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/keys/new`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/auth/connect`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/telemetry`,
      lastModified: currentDate,
      changeFrequency: 'always',
      priority: 0.6,
    },
  ];

  // 2. Comprehensive Documentation Suite Routes
  const docRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/docs`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/docs/quickstart`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.88,
    },
    {
      url: `${baseUrl}/docs/simple`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.88,
    },
    {
      url: `${baseUrl}/docs/agents`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.88,
    },
    {
      url: `${baseUrl}/docs/models-guide`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/docs/ide-setup`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/docs/sdks`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.82,
    },
    {
      url: `${baseUrl}/docs/sdks/python`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.82,
    },
    {
      url: `${baseUrl}/docs/sdks/typescript`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.82,
    },
    {
      url: `${baseUrl}/docs/migration`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.82,
    },
    {
      url: `${baseUrl}/docs/cookbook`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.82,
    },
    {
      url: `${baseUrl}/docs/api-reference`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.82,
    },
    {
      url: `${baseUrl}/docs/prompt-caching`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/streaming`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/structured-outputs`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/function-calling`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/embeddings`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.78,
    },
    {
      url: `${baseUrl}/docs/rate-limits`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.78,
    },
    {
      url: `${baseUrl}/docs/error-handling`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.78,
    },
    {
      url: `${baseUrl}/docs/architecture`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.78,
    },
    {
      url: `${baseUrl}/docs/security-spec`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.78,
    },
  ];

  // 3. Dynamic Model Profile Pages
  const modelRoutes: MetadataRoute.Sitemap = EXCLUSIVE_MODEL_CATALOG.map((m) => ({
    url: `${baseUrl}/models/${m.id.replace('/', '-')}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.88,
  }));

  // 4. Dynamic Head-to-Head Comparison Matchup Pages (pSEO)
  const matchupRoutes: MetadataRoute.Sitemap = CURATED_MATCHUPS.map((matchup) => ({
    url: `${baseUrl}/models/vs/${matchup.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.89,
  }));

  // 5. Dynamic Integration Solution Guides (pSEO)
  const integrationRoutes: MetadataRoute.Sitemap = INTEGRATION_GUIDES.map((g) => ({
    url: `${baseUrl}/docs/integrations/${g.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.88,
  }));

  // 6. Dynamic Use-Case Solution Landing Pages (pSEO)
  const solutionRoutes: MetadataRoute.Sitemap = SOLUTION_GUIDES.map((s) => ({
    url: `${baseUrl}/solutions/${s.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // 7. Dynamic Competitor Alternative Landing Pages (pSEO)
  const alternativeRoutes: MetadataRoute.Sitemap = COMPETITOR_ALTERNATIVES.map((a) => ({
    url: `${baseUrl}/alternatives/${a.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.91,
  }));

  // 8. Dynamic Error Troubleshooting Guides (pSEO)
  const errorRoutes: MetadataRoute.Sitemap = ERROR_TROUBLESHOOT_DATA.map((e) => ({
    url: `${baseUrl}/docs/errors/${e.code}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.87,
  }));

  // 9. Dynamic Multi-Language SDK Guides (pSEO)
  const sdkRoutes: MetadataRoute.Sitemap = SDK_LANG_GUIDES.map((s) => ({
    url: `${baseUrl}/docs/sdks/${s.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.88,
  }));

  // 10. Dynamic Cloud Migration Guides (pSEO)
  const migrationRoutes: MetadataRoute.Sitemap = MIGRATION_GUIDES_DATA.map((m) => ({
    url: `${baseUrl}/migrate/${m.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // 11. Interactive Tools
  const toolRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/tools/prompt-caching-calculator`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/prompt-compressor`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/api-request-builder`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/json-schema-generator`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/api-key-checker`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/embeddings-calculator`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/function-calling-builder`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/token-counter`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/model-cost-comparator`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // 12. Dynamic Developer Cookbook Recipes (pSEO)
  const cookbookRoutes: MetadataRoute.Sitemap = COOKBOOK_RECIPES_DATA.map((c) => ({
    url: `${baseUrl}/cookbook/${c.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.89,
  }));

  // 13. Dynamic AI Model Provider Portals (pSEO)
  const providerRoutes: MetadataRoute.Sitemap = PROVIDERS_DATA.map((p) => ({
    url: `${baseUrl}/providers/${p.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.92,
  }));

  // 14. Dynamic Architectural Capabilities (pSEO)
  const capabilityRoutes: MetadataRoute.Sitemap = CAPABILITIES_DATA.map((cap) => ({
    url: `${baseUrl}/capabilities/${cap.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.91,
  }));

  // 15. Dynamic Workload-Specific Benchmarks (pSEO)
  const workloadBenchmarkRoutes: MetadataRoute.Sitemap = WORKLOAD_BENCHMARKS_DATA.map((wb) => ({
    url: `${baseUrl}/benchmarks/${wb.workloadSlug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.91,
  }));

  // 16. Dynamic Deep-Dive Architecture Whitepapers (pSEO)
  const whitepaperRoutes: MetadataRoute.Sitemap = ARCHITECTURE_WHITEPAPERS_DATA.map((w) => ({
    url: `${baseUrl}/architecture/${w.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // 17. Dynamic Enterprise Security & Governance Whitepapers (pSEO)
  const securityRoutes: MetadataRoute.Sitemap = SECURITY_SPECIFICATIONS_DATA.map((s) => ({
    url: `${baseUrl}/security/${s.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // 18. Dynamic AI Red-Teaming & Security Patterns (pSEO)
  const securityPatternRoutes: MetadataRoute.Sitemap = SECURITY_PATTERNS_DATA.map((p) => ({
    url: `${baseUrl}/security/patterns/${p.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // 19. Dynamic AI Reliability & Resilience Engineering Guides (pSEO)
  const reliabilityRoutes: MetadataRoute.Sitemap = RELIABILITY_DATA.map((r) => ({
    url: `${baseUrl}/reliability/${r.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // 20. Dynamic AI Incident Postmortems (pSEO)
  const postmortemRoutes: MetadataRoute.Sitemap = POSTMORTEMS_DATA.map((pm) => ({
    url: `${baseUrl}/postmortems/${pm.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // 21. Dynamic Vertical Industry Solutions (pSEO)
  const industryRoutes: MetadataRoute.Sitemap = INDUSTRIES_DATA.map((i) => ({
    url: `${baseUrl}/industries/${i.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // 22. Compliance Document Deep-Links
  const complianceRoutes: MetadataRoute.Sitemap = [
    'soc2',
    'hipaa_baa',
    'dpa_gdpr',
    'iso27001',
    'zdr_protocol',
  ].map((id) => ({
    url: `${baseUrl}/compliance/${id}`,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.72,
  }));

  // 23. Billing, Enterprise & Business Support Pages
  const businessRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/billing`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/billing/enterprise`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
  ];

  return [
    ...coreRoutes,
    ...docRoutes,
    ...modelRoutes,
    ...matchupRoutes,
    ...integrationRoutes,
    ...solutionRoutes,
    ...alternativeRoutes,
    ...errorRoutes,
    ...sdkRoutes,
    ...migrationRoutes,
    ...toolRoutes,
    ...cookbookRoutes,
    ...providerRoutes,
    ...capabilityRoutes,
    ...workloadBenchmarkRoutes,
    ...whitepaperRoutes,
    ...securityRoutes,
    ...securityPatternRoutes,
    ...reliabilityRoutes,
    ...postmortemRoutes,
    ...industryRoutes,
    ...complianceRoutes,
    ...businessRoutes,
  ];
}
