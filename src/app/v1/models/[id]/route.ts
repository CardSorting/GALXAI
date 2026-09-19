import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Universal OpenAI-Compatible GET /v1/models/[id] Endpoint.
 * Ingests canonical model IDs or fuzzy aliases.
 */
async function previewGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const modelSpec = ModelCatalog.resolveModel(id);

  return NextResponse.json({
    id: modelSpec.id,
    object: 'model',
    created: 1735689600,
    owned_by: 'galxai',
    name: modelSpec.name,
    category: modelSpec.category,
    context_window: modelSpec.contextWindowTokens,
    max_output: modelSpec.maxOutputTokens,
    supports_vision: modelSpec.supportsVision,
    supports_reasoning: modelSpec.supportsReasoning,
    supports_streaming: modelSpec.supportsStreaming,
    description: modelSpec.description,
    usage_pricing: { status: USAGE_PRICING.status, rates_published: USAGE_PRICING.ratesPublished, basis: USAGE_PRICING.basis, unit: USAGE_PRICING.unit, path: USAGE_PRICING.path },
    permission: [
      {
        id: `perm-${modelSpec.id}`,
        object: 'model_permission',
        created: 1735689600,
        allow_create_engine: false,
        allow_sampling: true,
        allow_logprobs: true,
        allow_search_indices: false,
        allow_view: true,
        allow_fine_tuning: false,
        organization: '*',
        group: null,
        is_blocking: false
      }
    ]
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    }
  });
}

export const GET = withDeveloperAccess(previewGET);
