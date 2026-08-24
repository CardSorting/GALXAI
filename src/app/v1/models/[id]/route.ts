import { NextRequest, NextResponse } from 'next/server';
import { ModelCatalog } from '@/core/router/ModelCatalog';

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
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const modelSpec = ModelCatalog.resolveModel(id);

  return NextResponse.json({
    id: modelSpec.id,
    object: 'model',
    created: 1735689600,
    owned_by: modelSpec.provider === 'openai' ? 'openai-codex' : 'xai-grok',
    name: modelSpec.name,
    category: modelSpec.category,
    context_window: modelSpec.contextWindowTokens,
    max_output: modelSpec.maxOutputTokens,
    pricing: {
      input_per_1m: modelSpec.inputPricePer1M,
      output_per_1m: modelSpec.outputPricePer1M,
      cached_input_per_1m: modelSpec.cachedInputPricePer1M
    },
    supports_vision: modelSpec.supportsVision,
    supports_reasoning: modelSpec.supportsReasoning,
    supports_streaming: modelSpec.supportsStreaming,
    description: modelSpec.description,
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
      'x-galx-cached': 'edge-swr'
    }
  });
}
