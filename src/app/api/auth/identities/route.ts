import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { requireSessionMutation, sessionFailure } from '@/lib/auth/session-http';
import { OAuthRepository } from '@/lib/supabase/repositories/OAuthRepository';
import type { ProviderType } from '@/core/contracts/GalxContracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/identities
 * Returns all active OAuth provider identities linked to the authenticated user.
 */
async function previewGET(req: NextRequest) {
  try {
    const identity = await requireAccountIdentity(req);

    const oauthRepo = OAuthRepository.getInstance();
    const identities = await oauthRepo.findIdentitiesByUserId(identity.id);

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
      userId: identity.id,
      identities: sanitized
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) { return sessionFailure(err); }
}

/**
 * DELETE /api/auth/identities?provider=openai
 * Unlinks / disconnects an OAuth provider identity from the authenticated user.
 */
async function previewDELETE(req: NextRequest) {
  try {
    requireSessionMutation(req);
    const identity = await requireAccountIdentity(req);

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') as ProviderType;

    if (!provider || provider.length > 40 || !/^[a-z0-9_-]+$/.test(provider)) {
      return NextResponse.json(
        { error: 'Provider query parameter is required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const oauthRepo = OAuthRepository.getInstance();
    const unlinked = await oauthRepo.unlinkOAuthIdentity(identity.id, provider);

    return NextResponse.json({
      success: unlinked,
      message: unlinked ? 'Connection removed.' : 'Connection not found.'
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) { return sessionFailure(err); }
}

export const GET = withDeveloperAccess(previewGET);
export const DELETE = withDeveloperAccess(previewDELETE);
