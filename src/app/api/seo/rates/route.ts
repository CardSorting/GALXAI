import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextResponse } from 'next/server';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

async function previewGET() {
  const modelRates = FRONTEND_VISIBLE_MODELS.map((m) => {
    const contextK = Math.round(m.contextWindowTokens / 1000);
    const cachedInput = m.cachedInputPricePer1M ?? m.inputPricePer1M * 0.25;

    return {
      id: m.id,
      name: m.name,
      provider: 'GALXAI',
      category: m.category,
      context_window_tokens: m.contextWindowTokens,
      context_window_k: `${contextK}K`,
      max_output_tokens: m.maxOutputTokens,
      pricing: {
        input_per_1m_usd: m.inputPricePer1M,
        cached_input_per_1m_usd: cachedInput,
        output_per_1m_usd: m.outputPricePer1M,
        retail_list_input_usd: m.listPricePer1MInput ?? m.inputPricePer1M * 1.33,
        discount_percentage: m.discountPercentage ?? 25,
        prompt_caching_rebate_percentage: 75,
      },
      telemetry: {
        avg_ttft_ms: m.category === 'llm' ? 14 : 450,
        streaming_supported: m.supportsStreaming,
      },
      canonical_url: `${SITE_CONFIG.url}/models/${m.id.replace('/', '-')}`,
    };
  });

  return NextResponse.json(
    {
      gateway: 'GALXAI Universal AI Gateway',
      base_url: SITE_CONFIG.apiUrl,
      updated_at: new Date().toISOString(),
      currency: 'USD',
      discount_model: 'Wholesale Token Clearinghouse (0% Gateway Markup)',
      caching_rebate: '100% Pass-Through on Prompts >1,024 Tokens (75% Off)',
      total_models: modelRates.length,
      models: modelRates,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    }
  );
}

export const GET = withDeveloperAccess(previewGET);
