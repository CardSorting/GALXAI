import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import { TokenCostCalculator } from '@/core/pricing/TokenCostCalculator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '30d'; // '24h' | '7d' | '30d' | '90d'
    const dimension = searchParams.get('dimension') || 'all';

    // Model-level usage dataset with mathematically verified pricing breakdowns
    const modelBreakdowns = [
      {
        modelId: 'galx-nova',
        name: 'GALX Nova',
        category: 'Frontier Reasoning & Coding',
        promptTokens: 88_000_000,
        cachedTokens: 40_000_000,
        completionTokens: 15_400_000,
        totalTokens: 103_400_000,
        requestCount: 27_000,
        avgLatencyMs: 145,
        spendUsd: 36.00,
        retailEquivalentUsd: 50.40,
        savingsUsd: 14.40,
        savingsPercentage: 28.6,
        color: 'amber'
      },
      {
        modelId: 'galx-nova-image',
        name: 'GALX Nova-image',
        category: 'Frontier Visual Synthesis',
        promptTokens: 4_000,
        cachedTokens: 0,
        completionTokens: 120,
        totalTokens: 4_120,
        requestCount: 120,
        avgLatencyMs: 820,
        spendUsd: 2.40,
        retailEquivalentUsd: 3.20,
        savingsUsd: 0.80,
        savingsPercentage: 25.0,
        color: 'emerald'
      }
    ];

    const totalSpend = modelBreakdowns.reduce((acc, m) => acc + m.spendUsd, 0);
    const totalTokens = modelBreakdowns.reduce((acc, m) => acc + m.totalTokens, 0);
    const totalSavings = modelBreakdowns.reduce((acc, m) => acc + m.savingsUsd, 0);
    const totalRequests = modelBreakdowns.reduce((acc, m) => acc + m.requestCount, 0);

    // Compute percentage of total spend for each model
    const byModel = modelBreakdowns.map(m => ({
      ...m,
      spendPercentage: Number(((m.spendUsd / totalSpend) * 100).toFixed(1))
    }));

    // API Key breakdown
    const byKey = [
      {
        id: 'key_cursor_dev',
        name: 'Cursor IDE / Coding Assistant',
        prefix: 'galx_live_d819',
        spendUsd: 18.50,
        requests: 14_820,
        tokens: 64_000_000,
        lastActive: '2 mins ago',
        spendPercentage: Number(((18.50 / totalSpend) * 100).toFixed(1)),
        color: 'amber'
      },
      {
        id: 'key_prod_api',
        name: 'Production API Backend',
        prefix: 'galx_live_p401',
        spendUsd: 14.20,
        requests: 9_400,
        tokens: 31_200_000,
        lastActive: '12s ago',
        spendPercentage: Number(((14.20 / totalSpend) * 100).toFixed(1)),
        color: 'cyan'
      },
      {
        id: 'key_agent_fleet',
        name: 'Agent Swarm / LangChain Fleet',
        prefix: 'galx_live_lc99',
        spendUsd: 5.70,
        requests: 2_900,
        tokens: 8_204_120,
        lastActive: '15 mins ago',
        spendPercentage: Number(((5.70 / totalSpend) * 100).toFixed(1)),
        color: 'indigo'
      }
    ];

    // Modality breakdown: Input vs Cached Reads vs Generation
    const byModality = {
      promptTokens: {
        tokens: 88_004_000,
        spendUsd: 21.80,
        label: 'Input / Prompt Processing',
        description: 'Standard prompt token processing billed at discounted wholesale rates'
      },
      cachedTokens: {
        tokens: 40_000_000,
        spendUsd: 3.40,
        rebateSavedUsd: 10.20,
        label: 'Prompt Caching Read Hits',
        description: '75%-80% prompt caching rebate applied automatically to repetitive context'
      },
      completionTokens: {
        tokens: 15_400_120,
        spendUsd: 13.20,
        label: 'Output Generation & Reasoning',
        description: 'Frontier thinking tokens and generated completions'
      }
    };

    // Time-series trend for charts (Daily buckets over last 14 days)
    const timeSeries = [
      { date: 'Aug 10', spend: 1.80, tokens: 6.2, requests: 1200, savings: 0.72 },
      { date: 'Aug 11', spend: 2.10, tokens: 7.4, requests: 1450, savings: 0.84 },
      { date: 'Aug 12', spend: 2.90, tokens: 9.8, requests: 1980, savings: 1.16 },
      { date: 'Aug 13', spend: 2.40, tokens: 8.1, requests: 1620, savings: 0.96 },
      { date: 'Aug 14', spend: 3.10, tokens: 10.5, requests: 2100, savings: 1.24 },
      { date: 'Aug 15', spend: 2.80, tokens: 9.2, requests: 1840, savings: 1.12 },
      { date: 'Aug 16', spend: 1.40, tokens: 4.8, requests: 920, savings: 0.56 },
      { date: 'Aug 17', spend: 1.60, tokens: 5.4, requests: 1050, savings: 0.64 },
      { date: 'Aug 18', spend: 3.40, tokens: 11.6, requests: 2320, savings: 1.36 },
      { date: 'Aug 19', spend: 3.90, tokens: 13.2, requests: 2640, savings: 1.56 },
      { date: 'Aug 20', spend: 3.60, tokens: 12.1, requests: 2410, savings: 1.44 },
      { date: 'Aug 21', spend: 4.20, tokens: 14.5, requests: 2890, savings: 1.68 },
      { date: 'Aug 22', spend: 3.10, tokens: 10.8, requests: 2150, savings: 1.24 },
      { date: 'Aug 23', spend: 2.10, tokens: 7.0, requests: 1410, savings: 0.84 }
    ];

    return NextResponse.json({
      success: true,
      timeframe,
      totals: {
        totalSpendUsd: Number(totalSpend.toFixed(2)),
        totalTokens,
        totalSavingsUsd: Number(totalSavings.toFixed(2)),
        totalRequests,
        averageCostPerRequestUsd: Number((totalSpend / totalRequests).toFixed(6)),
        overallSavingsPercentage: Number(((totalSavings / (totalSpend + totalSavings)) * 100).toFixed(1))
      },
      byModel,
      byKey,
      byModality,
      timeSeries
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch usage analytics' },
      { status: 500 }
    );
  }
}
