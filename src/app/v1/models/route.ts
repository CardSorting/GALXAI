import { NextResponse } from 'next/server';
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
 * Universal OpenAI-Compatible GET /v1/models Endpoint.
 */
export async function GET() {
  const models = ModelCatalog.getSupportedModels().map(m => ({
    id: m.id,
    object: 'model',
    created: 1735689600,
    owned_by: m.provider === 'openai' ? 'openai-codex' : 'xai-grok',
    name: m.name,
    category: m.category,
    context_window: m.contextWindowTokens,
    max_output: m.maxOutputTokens,
    pricing: {
      input_per_1m: m.inputPricePer1M,
      output_per_1m: m.outputPricePer1M
    },
    supports_vision: m.supportsVision,
    supports_reasoning: m.supportsReasoning,
    supports_streaming: m.supportsStreaming,
    description: m.description,
    permission: [
      {
        id: `perm-${m.id}`,
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
  }));

  return NextResponse.json(
    {
      object: 'list',
      data: models
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'x-galx-cached': 'edge-swr'
      }
    }
  );
}
