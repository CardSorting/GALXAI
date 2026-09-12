import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxCommunityPoolGovernor } from '@/core/governor/GalxCommunityPoolGovernor';


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
async function previewGET(req: NextRequest) {
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    const userId = auth.userId;

    const governor = GalxCommunityPoolGovernor.getInstance();
    const userUsage = governor.getUserMonthlyUsage(userId);

    const isPaid = (auth.apiKey?.computePool === 'priority_dedicated');

    return NextResponse.json({
      success: true,
      freeGrant: {
        monthlyAllowanceUsd: 30.00,
        monthlyUsedUsd: Number(userUsage.monthlyUsedUsd.toFixed(4)),
        remainingUsd: Number(userUsage.remainingGrantUsd.toFixed(4)),
        status: userUsage.remainingGrantUsd > 0 ? 'active' : 'exhausted'
      },
      priorityAccess: isPaid
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}

export const GET = withDeveloperAccess(previewGET);
