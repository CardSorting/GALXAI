import { withDeveloperAccess } from '@/lib/security/developer-access';
import type { NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { OAuthRepository } from '@/lib/supabase/repositories/OAuthRepository';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { readSessionBody, requireSessionMutation, sessionFailure, sessionResponse } from '@/lib/auth/session-http';
import type { ProviderType } from '@/core/contracts/GalxContracts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function previewPOST(req: NextRequest) {
  try {
    requireSessionMutation(req);
    const actor = await requireAccountIdentity(req), body = await readSessionBody(req);
    if (body.provider !== undefined && (typeof body.provider !== 'string' || body.provider.length > 40)) return sessionResponse({ error: 'Check the connection.' }, 400);
    // Resolve the owned connection, never a caller-supplied internal connection identifier.
    const identity = await OAuthRepository.getInstance().findIdentityByProvider(actor.id, (body.provider || 'openai') as ProviderType);
    if (!identity?.shardId || identity.userId !== actor.id) return sessionResponse({ error: 'Connection not found.' }, 404);
    const refreshed = await GalxAuthEngine.getInstance().refreshProviderShardTokens(identity.shardId);
    return sessionResponse(refreshed ? { success: true, refreshed: true } : { error: 'Reconnect this account to continue.' }, refreshed ? 200 : 409);
  } catch (error) { return sessionFailure(error); }
}
export const POST = withDeveloperAccess(previewPOST);
