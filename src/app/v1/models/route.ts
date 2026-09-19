import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
    }
  });
}

/**
 * Universal OpenAI-Compatible GET /v1/models Endpoint.
 * Returns supported capability descriptors only. Pricing, spend caps and
 * routing/governance state are not part of the public model contract.
 */
async function previewGET(req: NextRequest) {
  const authEngine = GalxAuthEngine.getInstance();
  const authResult = await authEngine.resolveAuthIdentity(req);

  const seatEngine = GalxSeatTierEngine.getInstance();
  const entitlement = await seatEngine.resolveUserSeatTier(authResult);

  const models = ModelCatalog.getSupportedModels().map((m) => {
    const isAllowed = entitlement.allowedModels.some(
      (allowed) => allowed === m.id || m.id.includes(allowed) || allowed.includes(m.id)
    );

    return {
      id: m.id,
      object: 'model',
      created: 1735689600,
      owned_by: 'galxai',
      name: m.name,
      category: m.category,
      context_window: m.contextWindowTokens,
      max_output: m.maxOutputTokens,
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
          allow_sampling: isAllowed,
          allow_logprobs: true,
          allow_search_indices: false,
          allow_view: true,
          allow_fine_tuning: false,
          organization: entitlement.orgName || '*',
          group: null,
          is_blocking: !isAllowed
        }
      ]
    };
  });

  return NextResponse.json(
    {
      object: 'list',
      data: models,
      usage_pricing: { status: USAGE_PRICING.status, rates_published: USAGE_PRICING.ratesPublished, basis: USAGE_PRICING.basis, unit: USAGE_PRICING.unit, path: USAGE_PRICING.path }
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-transform',
      }
    }
  );
}

export const GET = withDeveloperAccess(previewGET);
