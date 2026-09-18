import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';

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

/**
 * GET /api/chat/tier
 * Returns caller's active seat tier entitlement, allowed models, remaining compute credits, and spend cap status.
 */
async function previewGET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const seatEngine = GalxSeatTierEngine.getInstance();
    const entitlement = await seatEngine.resolveUserSeatTier(authResult);
    const summary = seatEngine.getPublicSummary(entitlement, authResult.authenticated);

    return NextResponse.json(summary, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
        'X-Galx-Seat-Tier': entitlement.tier
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        authenticated: false,
        tier: 'developer',
        tierLabel: 'Solo Developer Seat',
        seatRole: 'developer',
        priorityLane: false,
        maxTokens: 16_384,
        deepReasoning: true,
        monthlyCreditsIncludedUsd: 5.0,
        spendCapUsd: 25.0,
        currentSpendUsd: 0.0,
        remainingSpendUsd: 25.0,
        allowedModels: ['galx-nova', 'galx-nova-image'],
        isCapped: false,
        promptCacheRebatePct: 75,
        concurrencyLimit: 20,
        activeConcurrentStreams: 0,
        zdrRequired: false,
        hipaaCompliant: false,
        fiveHourWindow: {
          percentRemaining: 100,
          usedUnits: 0,
          limitUnits: 30,
          refreshIn: 'fully refreshed',
          refreshMessage: 'You have 100% of your 5-hour limit remaining.',
          resetAtMs: Date.now(),
          isExceeded: false
        },
        weeklyWindow: {
          percentRemaining: 100,
          usedUnits: 0,
          limitUnits: 200,
          refreshIn: 'fully refreshed',
          refreshMessage: 'You have 100% of your weekly limit remaining.',
          resetAtMs: Date.now(),
          isExceeded: false
        }
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'X-Galx-Seat-Tier': 'developer'
        }
      }
    );
  }
}

export const GET = withDeveloperAccess(previewGET);
