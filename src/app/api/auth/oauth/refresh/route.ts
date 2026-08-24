import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';

/**
 * POST /api/auth/oauth/refresh
 * Triggers single-flight token refresh for the specified or current user's provider shard.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated) {
      return NextResponse.json({ error: 'UNAUTHORIZED: Valid session required to refresh tokens' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const shardId = body.shardId || auth.session?.shardId;

    if (!shardId) {
      return NextResponse.json({ error: 'Shard ID is required' }, { status: 400 });
    }

    const refreshed = await authEngine.refreshProviderShardTokens(shardId);
    if (!refreshed) {
      return NextResponse.json({ error: 'Failed to refresh provider shard tokens or no refresh token available' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      shardId,
      message: 'Provider OAuth token refreshed successfully'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
