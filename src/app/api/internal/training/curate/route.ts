import { NextRequest, NextResponse } from 'next/server';
import { GalxSyntheticCuratorEngine, type SprintId } from '@/core/training/GalxSyntheticCuratorEngine';
import { GalxInternalAuthGuard } from '@/core/auth/GalxInternalAuthGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/internal/training/curate
 * Returns real-time status of active or recent synthetic curation sprint.
 */
export async function GET(req: NextRequest) {
  try {
    const authGuard = GalxInternalAuthGuard.getInstance();
    const authResult = await authGuard.verifyInternalRequest(req);

    if (!authResult.authorized) {
      return authGuard.createUnauthorizedResponse(authResult);
    }

    const curator = GalxSyntheticCuratorEngine.getInstance();
    const status = curator.getStatus();

    return NextResponse.json(status, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/internal/training/curate
 * Triggers execution of a synthetic curation sprint or preflight canary probe.
 */
export async function POST(req: NextRequest) {
  try {
    const authGuard = GalxInternalAuthGuard.getInstance();
    const authResult = await authGuard.verifyInternalRequest(req);

    if (!authResult.authorized) {
      return authGuard.createUnauthorizedResponse(authResult);
    }

    let sprintId: SprintId = 'sprint_1A';
    let sampleTarget: number | undefined = undefined;
    let maxDurationMinutes: number | undefined = undefined;
    let isCanary = false;
    let isDryRun = false;

    try {
      const body = await req.json();
      if (body?.sprintId) sprintId = body.sprintId;
      if (body?.sampleTarget) sampleTarget = Number(body.sampleTarget);
      if (body?.maxDurationMinutes) maxDurationMinutes = Number(body.maxDurationMinutes);
      if (body?.canary) isCanary = Boolean(body.canary);
      if (body?.dryRun) isDryRun = Boolean(body.dryRun);
    } catch {}

    const curator = GalxSyntheticCuratorEngine.getInstance();

    // 1. Canary Preflight Execution (Sprint 0)
    if (isCanary || sprintId === 'sprint_0') {
      const canaryResult = await curator.executePreflightCanary();
      return NextResponse.json(
        {
          success: true,
          mode: 'preflight_canary',
          canary: canaryResult,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        }
      );
    }

    // 2. 2.5-Hour Operational Sprint Execution (Sprint 1A, etc.)
    const sprintResult = await curator.executeSprint({
      sprintId,
      sampleTarget,
      maxDurationMinutes,
      dryRun: isDryRun,
    });

    return NextResponse.json(
      {
        success: true,
        mode: isDryRun ? 'dry_run' : 'production_sprint',
        result: sprintResult,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to execute synthetic curation sprint' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/internal/training/curate
 * Gracefully halts and freezes the active sprint with atomic checkpointing.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authGuard = GalxInternalAuthGuard.getInstance();
    const authResult = await authGuard.verifyInternalRequest(req);

    if (!authResult.authorized) {
      return authGuard.createUnauthorizedResponse(authResult);
    }

    const curator = GalxSyntheticCuratorEngine.getInstance();
    curator.halt();

    return NextResponse.json(
      {
        success: true,
        message: 'Active curation sprint signaled to halt gracefully and commit checkpoint.',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to halt sprint' },
      { status: 500 }
    );
  }
}
