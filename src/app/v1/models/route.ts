import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';

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
 * Resolves caller Seat Tier to annotate tier model allowances and spend caps.
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

    let requiredTier = 'developer';
    if (m.category === 'image') {
      requiredTier = 'enterprise';
    }

    return {
      id: m.id,
      object: 'model',
      created: 1735689600,
      owned_by: 'galxai',
      name: m.name,
      category: m.category,
      context_window: m.contextWindowTokens,
      max_output: m.maxOutputTokens,
      pricing: {
        input_per_1m: m.inputPricePer1M,
        output_per_1m: m.outputPricePer1M,
        cached_input_per_1m: m.cachedInputPricePer1M || 0
      },
      supports_vision: m.supportsVision,
      supports_reasoning: m.supportsReasoning,
      supports_streaming: m.supportsStreaming,
      description: m.description,
      seat_governance: {
        allowed_for_seat: isAllowed,
        required_seat_tier: requiredTier,
        user_current_tier: entitlement.tier,
        user_seat_role: entitlement.role
      },
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
      seat_tier: {
        tier: entitlement.tier,
        tier_label: entitlement.tierLabel,
        role: entitlement.role,
        is_capped: entitlement.isCapped,
        remaining_spend_usd: Math.max(0, entitlement.spendCapUsd - entitlement.currentSpendUsd),
        prompt_cache_rebate_pct: entitlement.promptCacheRebatePct
      }
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-transform',
        'X-Galx-Seat-Tier': entitlement.tier,
        'X-Galx-Seat-Role': entitlement.role
      }
    }
  );
}

export const GET = withDeveloperAccess(previewGET);
