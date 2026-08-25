import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { OAuthRepository } from '@/lib/supabase/repositories/OAuthRepository';
import type { ProviderType } from '@/core/contracts/GalxContracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * GET /api/auth/identities
 * Returns all active OAuth provider identities linked to the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const identity = await authEngine.resolveAuthIdentity(req);

    if (!identity.authenticated || !identity.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const oauthRepo = OAuthRepository.getInstance();
    const identities = await oauthRepo.findIdentitiesByUserId(identity.userId);

    // Sanitize secrets before returning to client
    const sanitized = identities.map((id) => ({
      id: id.id,
      provider: id.provider,
      providerAccountId: id.providerAccountId,
      email: id.email,
      displayName: id.displayName,
      status: id.status,
      expiresAtMs: id.expiresAtMs,
      lastRefreshedAtMs: id.lastRefreshedAtMs,
      createdAtMs: id.createdAtMs
    }));

    return NextResponse.json({
      success: true,
      userId: identity.userId,
      identities: sanitized
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

/**
 * DELETE /api/auth/identities?provider=openai
 * Unlinks / disconnects an OAuth provider identity from the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const identity = await authEngine.resolveAuthIdentity(req);

    if (!identity.authenticated || !identity.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') as ProviderType;

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider query parameter is required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const oauthRepo = OAuthRepository.getInstance();
    const unlinked = await oauthRepo.unlinkOAuthIdentity(identity.userId, provider);

    return NextResponse.json({
      success: unlinked,
      message: unlinked ? `Successfully unlinked provider '${provider}'` : `No active identity found for provider '${provider}'`
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
