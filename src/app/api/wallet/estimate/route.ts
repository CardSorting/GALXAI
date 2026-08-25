import { NextRequest, NextResponse } from 'next/server';
import { EXCLUSIVE_MODEL_CATALOG, ModelCatalog } from '@/core/router/ModelCatalog';
import { TokenCostCalculator } from '@/core/pricing/TokenCostCalculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      modelId = 'gpt-5.6-sol',
      dailyRequests = 100,
      avgPromptTokens = 1500,
      avgCompletionTokens = 400,
      avgCachedPct = 40,
      currentBalance = 114.59
    } = body;

    const resolvedModel = ModelCatalog.resolveModel(modelId);
    const cachedTokens = Math.round((avgPromptTokens * (avgCachedPct || 0)) / 100);

    const unitCost = TokenCostCalculator.calculateCost(resolvedModel, {
      promptTokens: avgPromptTokens,
      completionTokens: avgCompletionTokens,
      cachedTokens
    });

    const requestsPerDay = Math.max(1, Number(dailyRequests));
    const requestsPerMonth = requestsPerDay * 30;

    const dailyCostUsd = Number((unitCost.totalCostUsd * requestsPerDay).toFixed(4));
    const monthlyCostUsd = Number((dailyCostUsd * 30).toFixed(2));
    const retailMonthlyUsd = Number((unitCost.retailTotalCostUsd * requestsPerMonth).toFixed(2));
    const monthlySavingsUsd = Number(Math.max(0, retailMonthlyUsd - monthlyCostUsd).toFixed(2));

    const balance = Number(currentBalance) || 114.59;
    const runwayDays = dailyCostUsd > 0 ? Math.floor(balance / dailyCostUsd) : 999;
    const totalRequestCapacity = unitCost.totalCostUsd > 0 ? Math.floor(balance / unitCost.totalCostUsd) : 999999;

    // Determine recommended top-up pack based on monthly burn
    let recommendedPack = { amount: 50, bonusGrant: 12.50, totalCredit: 62.50 };
    if (monthlyCostUsd > 250) {
      recommendedPack = { amount: 250, bonusGrant: 125.00, totalCredit: 375.00 };
    } else if (monthlyCostUsd > 100) {
      recommendedPack = { amount: 100, bonusGrant: 50.00, totalCredit: 150.00 };
    }

    return NextResponse.json({
      success: true,
      model: {
        id: resolvedModel.id,
        name: resolvedModel.name,
        discountPercentage: resolvedModel.discountPercentage
      },
      workload: {
        dailyRequests: requestsPerDay,
        monthlyRequests: requestsPerMonth,
        avgPromptTokens,
        avgCompletionTokens,
        avgCachedTokens: cachedTokens,
        cachedPercentage: avgCachedPct
      },
      perRequest: {
        costUsd: unitCost.totalCostUsd,
        promptCostUsd: unitCost.promptCostUsd,
        cachedCostUsd: unitCost.cachedCostUsd,
        completionCostUsd: unitCost.completionCostUsd,
        savingsUsd: unitCost.totalSavingsUsd,
        retailEquivalentUsd: unitCost.retailTotalCostUsd
      },
      projections: {
        dailyCostUsd,
        monthlyCostUsd,
        retailMonthlyUsd,
        monthlySavingsUsd,
        savingsPercentage: unitCost.savingsPercentage,
        currentBalance: balance,
        runwayDays,
        totalRequestCapacity
      },
      recommendation: {
        recommendedPack,
        message: `At ${requestsPerDay.toLocaleString()} daily queries on ${resolvedModel.name}, your monthly spend is ~$${monthlyCostUsd.toFixed(2)}. Your $${balance.toFixed(2)} balance lasts ~${runwayDays} days.`
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate estimate' },
      { status: 500 }
    );
  }
}
