import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';

export const dynamic = 'force-dynamic';

interface SuggestionItem {
  title: string;
  description: string;
  url: string;
  category: string;
}

/**
 * Small, current OpenSearch catalog for the Developer surface.
 *
 * The previous catalog was assembled from retired model, provider and
 * economics pages. Those records contained rates, discounts and operating
 * claims that are not an approved Nova usage contract. Keep suggestions
 * useful, but source them only from current capability and access pages.
 */
const CURRENT_SUGGESTIONS: SuggestionItem[] = [
  {
    title: 'GALX Nova — supported API capability',
    description: 'Managed reasoning and generation through the documented GALX API. Usage is $0.02 per completed message with a default $25 monthly cap.',
    url: `${SITE_CONFIG.url}/docs/api-reference`,
    category: 'Capability',
  },
  {
    title: 'OpenAI-compatible /v1 models',
    description: 'Use the documented GPT-style request format with supported GALX Nova capability identifiers; this listing does not publish usage rates.',
    url: `${SITE_CONFIG.url}/docs/api-reference`,
    category: 'API',
  },
  {
    title: 'GALX Nova Developer Access',
    description: 'A $50/month recurring membership for API access. Usage is billed separately and no usage credits are included.',
    url: `${SITE_CONFIG.url}/developers`,
    category: 'Access',
  },
  {
    title: 'Usage pricing status',
    description: 'Usage is $0.02 per completed message with a default $25 monthly cap. Review the access and usage boundary before building.',
    url: `${SITE_CONFIG.url}${USAGE_PRICING.path}`,
    category: 'Pricing',
  },
  {
    title: 'Prompt construction guidance',
    description: 'Practical guidance for stable instructions, relevant context and current API behavior without a rate estimate.',
    url: `${SITE_CONFIG.url}/docs/examples`,
    category: 'Documentation',
  },
  {
    title: 'Developer API error handling',
    description: 'Handle authentication, access, validation and temporary service errors from the documented API.',
    url: `${SITE_CONFIG.url}/docs/error-handling`,
    category: 'Documentation',
  },
  {
    title: 'GALX Images',
    description: 'Create and explore images in GALX without an API integration.',
    url: `${SITE_CONFIG.url}/images`,
    category: 'Product',
  },
];

/**
 * OpenSearch suggestions and the structured JSON variant used by the
 * Developer surface. No internal model catalog or provider data is serialized.
 */
async function previewGET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get('q') || searchParams.get('query') || '';
  const query = rawQuery.trim().toLowerCase();
  const format = searchParams.get('format');
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '10', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 25)) : 10;

  const filtered = query
    ? CURRENT_SUGGESTIONS.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    )
    : CURRENT_SUGGESTIONS;
  const results = filtered.slice(0, limit);

  if (format === 'json') {
    return NextResponse.json({ query: rawQuery, total: results.length, suggestions: results }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  return NextResponse.json([
    rawQuery,
    results.map(item => item.title),
    results.map(item => item.description),
    results.map(item => item.url),
  ], {
    headers: {
      'Content-Type': 'application/x-suggestions+json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const GET = withDeveloperAccess(previewGET);
