import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import { COOKBOOK_RECIPES_DATA } from '@/lib/data/cookbooksData';
import { PROVIDERS_DATA } from '@/lib/data/providersData';
import { CAPABILITIES_DATA } from '@/lib/data/capabilitiesData';
import { GLOSSARY_TERMS } from '@/lib/data/glossaryData';
import { SOLUTION_GUIDES } from '@/lib/data/solutionsData';
import { COMPETITOR_ALTERNATIVES } from '@/lib/data/alternativesData';
import { CURATED_MATCHUPS } from '@/lib/data/comparisonData';
import { ERROR_TROUBLESHOOT_DATA } from '@/lib/data/errorsData';
import { INTEGRATION_GUIDES } from '@/lib/data/integrationsData';
import { SECURITY_PATTERNS_DATA } from '@/lib/data/securityPatternsData';
import { INDUSTRIES_DATA } from '@/lib/data/industriesData';

export const dynamic = 'force-dynamic';

interface SuggestionItem {
  title: string;
  description: string;
  url: string;
  category: string;
}

/**
 * World-Class OpenSearch Suggestions & Auto-Complete API
 * Supports both OpenSearch JSON array specification: [query, [titles], [descriptions], [urls]]
 * and modern developer JSON schema: { query, total, suggestions: [...] }
 */
async function previewGET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get('q') || searchParams.get('query') || '';
  const query = rawQuery.trim().toLowerCase();
  const format = searchParams.get('format'); // 'json' | 'opensearch'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 25);

  const allItems: SuggestionItem[] = [
    // 1. Models
    ...FRONTEND_VISIBLE_MODELS.map((m) => ({
      title: `${m.name} (${m.id})`,
      description: `${m.description} - Wholesale Rate: $${m.inputPricePer1M.toFixed(2)}/1M (${m.discountPercentage ?? 25}% off list).`,
      url: `${SITE_CONFIG.url}/models/${m.id.replace('/', '-')}`,
      category: 'Model',
    })),

    // 2. Interactive Tools
    {
      title: 'Enterprise LLM ROI & Token Budget Calculator',
      description: 'Model DAU scale, 75% prompt caching arbitrage, and wholesale compute savings with CSV export.',
      url: `${SITE_CONFIG.url}/tools/roi-calculator`,
      category: 'Tool',
    },
    {
      title: 'AI Token Streaming & Speed Benchmark Simulator',
      description: 'Real-time Server-Sent Events (SSE) token generation velocity and TTFT simulator across OpenAI models.',
      url: `${SITE_CONFIG.url}/tools/stream-benchmark`,
      category: 'Tool',
    },
    {
      title: '1,000,000 Token Context Window Capacity Visualizer',
      description: 'Simulate document capacities, code AST line volumes, and prompt caching breakpoints.',
      url: `${SITE_CONFIG.url}/tools/context-window-visualizer`,
      category: 'Tool',
    },
    {
      title: 'OpenAI Token Counter & BPE Tokenizer Studio',
      description: 'Inspect exact Byte-Pair Encoding subword tokens and costs using o200k_base and cl100k_base vocabularies.',
      url: `${SITE_CONFIG.url}/tools/token-counter`,
      category: 'Tool',
    },
    {
      title: 'Distributed Edge Latency & Time-To-First-Token (TTFT) Estimator',
      description: 'Simulate TLS distributed edge termination vs single-origin RTT across global regions.',
      url: `${SITE_CONFIG.url}/tools/latency-estimator`,
      category: 'Tool',
    },
    {
      title: 'Prompt Compressor & System Instruction Optimizer',
      description: 'Heuristic token compression engine removing lexical redundancy while maintaining strict instruction integrity.',
      url: `${SITE_CONFIG.url}/tools/prompt-compressor`,
      category: 'Tool',
    },
    {
      title: 'Compound Prompt Caching Rebate Calculator',
      description: 'Calculate exact compound savings from 75% cached prefix pass-through across repetitive agent prompts.',
      url: `${SITE_CONFIG.url}/tools/prompt-caching-calculator`,
      category: 'Tool',
    },
    {
      title: 'Wholesale Model Cost Comparator',
      description: 'Side-by-side pricing matrix comparing GALXAI wholesale rates against direct OpenAI and competitor pricing.',
      url: `${SITE_CONFIG.url}/tools/model-cost-comparator`,
      category: 'Tool',
    },

    // 3. Topic Hubs
    {
      title: 'Interactive AI Developer Tools Directory',
      description: '13 free interactive developer tools for AI token optimization, latency benchmarking, and ROI modeling.',
      url: `${SITE_CONFIG.url}/tools`,
      category: 'Hub',
    },
    {
      title: 'Developer Cookbooks & Production Code Recipes',
      description: 'Copy-pasteable code recipes, end-to-end tutorials, and architectural patterns in TypeScript and Python.',
      url: `${SITE_CONFIG.url}/cookbook`,
      category: 'Hub',
    },
    {
      title: 'Frontier AI Model Providers & Wholesale Gateways',
      description: 'Access the world\'s leading frontier AI providers through a single unified OpenAI wire-compatible API gateway.',
      url: `${SITE_CONFIG.url}/providers`,
      category: 'Hub',
    },
    {
      title: 'Architectural Capabilities & Edge Gateway Features',
      description: 'Text generation, image generation, and supported API inputs.',
      url: `${SITE_CONFIG.url}/capabilities`,
      category: 'Hub',
    },
    {
      title: 'Enterprise AI Security & Regulatory Governance',
      description: 'SOC 2 Type II, ISO 27001, HIPAA BAA, EU AI Act, and PCI DSS compliance specifications.',
      url: `${SITE_CONFIG.url}/security`,
      category: 'Hub',
    },
    {
      title: 'AI Reliability, Resilience Engineering & High Availability',
      description: 'Current service availability and customer updates.',
      url: `${SITE_CONFIG.url}/reliability`,
      category: 'Hub',
    },
    {
      title: 'Cloud & AI Provider Migration Center',
      description: '30-second zero-code-refactoring migration guides from Azure OpenAI, AWS Bedrock, Google Vertex, and OpenRouter.',
      url: `${SITE_CONFIG.url}/migrate`,
      category: 'Hub',
    },
    {
      title: 'AI Gateway Competitor Alternatives & Comparisons',
      description: 'Compare GALXAI against OpenRouter, Together AI, Portkey, Helicone, and LiteLLM.',
      url: `${SITE_CONFIG.url}/alternatives`,
      category: 'Hub',
    },

    // 4. Glossary Terms
    ...GLOSSARY_TERMS.map((g) => ({
      title: `${g.term} — AI Engineering Glossary`,
      description: g.shortDefinition,
      url: `${SITE_CONFIG.url}/glossary/${g.slug}`,
      category: 'Glossary',
    })),

    // 5. Cookbooks
    ...COOKBOOK_RECIPES_DATA.map((c) => ({
      title: c.title,
      description: c.description,
      url: `${SITE_CONFIG.url}/cookbook/${c.slug}`,
      category: 'Cookbook',
    })),

    // 6. Solutions
    ...SOLUTION_GUIDES.map((s) => ({
      title: s.headline,
      description: s.description,
      url: `${SITE_CONFIG.url}/solutions/${s.slug}`,
      category: 'Solution',
    })),

    // 7. Error Troubleshooting
    ...ERROR_TROUBLESHOOT_DATA.map((e) => ({
      title: `Fix HTTP ${e.httpStatus} (${e.code})`,
      description: e.description,
      url: `${SITE_CONFIG.url}/docs/errors/${e.code}`,
      category: 'Error Fix',
    })),

    // 8. Integrations
    ...INTEGRATION_GUIDES.map((i) => ({
      title: `Connect ${i.name} to GALXAI`,
      description: i.description,
      url: `${SITE_CONFIG.url}/docs/integrations/${i.slug}`,
      category: 'Integration',
    })),

    // 9. OWASP Patterns
    ...SECURITY_PATTERNS_DATA.map((p) => ({
      title: p.headline,
      description: p.description,
      url: `${SITE_CONFIG.url}/security/patterns/${p.slug}`,
      category: 'Security',
    })),

    // 11. Industries
    ...INDUSTRIES_DATA.map((ind) => ({
      title: ind.headline,
      description: ind.description,
      url: `${SITE_CONFIG.url}/industries/${ind.slug}`,
      category: 'Industry',
    })),

    // 12. Alternatives
    ...COMPETITOR_ALTERNATIVES.map((a) => ({
      title: a.headline,
      description: a.description,
      url: `${SITE_CONFIG.url}/alternatives/${a.slug}`,
      category: 'Alternative',
    })),

    // 13. Model Matchups
    ...CURATED_MATCHUPS.map((m) => ({
      title: m.headline,
      description: m.description,
      url: `${SITE_CONFIG.url}/models/vs/${m.slug}`,
      category: 'Matchup',
    })),
  ];

  // Filtering
  const filtered = query
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      )
    : allItems.slice(0, limit);

  const results = filtered.slice(0, limit);

  // Response Format: OpenSearch JSON Array vs Standard JSON
  if (format === 'json') {
    return NextResponse.json(
      {
        query: rawQuery,
        total: results.length,
        suggestions: results,
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // Standard OpenSearch Suggestions Format: [query, [completions], [descriptions], [urls]]
  const openSearchPayload = [
    rawQuery,
    results.map((r) => r.title),
    results.map((r) => r.description),
    results.map((r) => r.url),
  ];

  return NextResponse.json(openSearchPayload, {
    headers: {
      'Content-Type': 'application/x-suggestions+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const GET = withDeveloperAccess(previewGET);
