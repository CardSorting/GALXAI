import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxCommunityPoolGovernor } from '@/core/governor/GalxCommunityPoolGovernor';
import { GalxLumiQoSPoolGovernor } from '@/core/governor/GalxLumiQoSPoolGovernor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key, x-galx-key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * GET /api/compute/pool
 * Returns real-time health metrics of the shared community compute pool and the user's monthly $30 free compute grant.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    const userId = auth.authenticated ? auth.userId : 'anonymous_developer';

    const governor = GalxCommunityPoolGovernor.getInstance();
    const dailyMetrics = governor.getDailyPoolMetrics();
    const userUsage = governor.getUserMonthlyUsage(userId);

    const lumiGovernor = GalxLumiQoSPoolGovernor.getInstance();
    const lumiMetrics = lumiGovernor.getPoolMetrics();

    const isPaid = (auth.apiKey?.computePool === 'priority_dedicated');

    return NextResponse.json({
      success: true,
      pool: isPaid ? 'priority_dedicated' : 'shared_community',
      freeGrant: {
        monthlyAllowanceUsd: 30.00,
        monthlyUsedUsd: Number(userUsage.monthlyUsedUsd.toFixed(4)),
        remainingUsd: Number(userUsage.remainingGrantUsd.toFixed(4)),
        status: userUsage.remainingGrantUsd > 0 ? 'active' : 'exhausted'
      },
      dailyCommunityPool: {
        capacityUsd: dailyMetrics.budgetCapUsd,
        spendTodayUsd: Number(dailyMetrics.totalSpendUsd.toFixed(2)),
        percentUtilized: dailyMetrics.percentUtilized,
        isExhausted: dailyMetrics.isExhausted,
        resetsAt: new Date(dailyMetrics.resetsAtMs).toISOString(),
        resetsInSeconds: dailyMetrics.resetsInSeconds
      },
      lumiQosPool: {
        poolName: lumiMetrics.poolName,
        activeStreams: lumiMetrics.totalActiveStreams,
        maxConcurrency: lumiMetrics.maxConcurrencyLimit,
        concurrencyUtilizationPct: lumiMetrics.concurrencyUtilizationPct,
        congestionState: lumiMetrics.congestionState,
        reservedVipFloorPct: lumiMetrics.reservedVipFloorPct,
        totalRequestsServed5h: lumiMetrics.totalRequestsServed5h,
        totalRequestsThrottled5h: lumiMetrics.totalRequestsThrottled5h,
        isSheddingLoad: lumiMetrics.isSheddingLoad,
        resetsInSeconds: lumiMetrics.resetsInSeconds
      },
      dedicatedPriority: {
        active: isPaid,
        benefits: [
          'Direct GPU priority routing with zero queueing',
          '5,000 RPM high-concurrency throughput',
          'Immunity to shared community daily limits',
          '99.99% sovereign SLA'
        ]
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
