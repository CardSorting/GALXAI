import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxModelRouter } from '@/core/router/GalxModelRouter';
import { OAuthRepository } from '@/lib/supabase/repositories/OAuthRepository';
import type { ProviderType } from '@/core/contracts/GalxContracts';

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

/**
 * POST /api/auth/oauth/refresh
 * Triggers single-flight token refresh for the specified or current user's provider connection.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED: Valid session required to refresh tokens' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    let connectionId = body.connectionId || body.connection_id || body.shardId || auth.session?.shardId;

    if (!connectionId) {
      const provider = ((body.provider as string) || auth.claims?.provider || 'openai') as ProviderType;
      const oauthRepo = OAuthRepository.getInstance();
      const identity = await oauthRepo.findIdentityByProvider(auth.userId, provider);
      if (identity && identity.shardId) {
        connectionId = identity.shardId;
      }
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: 'No active provider connection found to refresh' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const refreshed = await authEngine.refreshProviderShardTokens(connectionId);
    if (!refreshed) {
      return NextResponse.json(
        { error: 'Failed to refresh provider OAuth tokens or connection expired' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return NextResponse.json({
      success: true,
      refreshed: true,
      message: 'Provider connection refreshed successfully'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
  } catch (err: any) {
    const sanitized = GalxModelRouter.sanitizeUpstreamError(err?.message || 'Token refresh failed');
    return NextResponse.json(
      { success: false, error: sanitized },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
