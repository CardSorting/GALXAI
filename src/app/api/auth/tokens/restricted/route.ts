import { withDeveloperAccess } from '@/lib/security/developer-access';
import type { NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { requireNativeSession } from '@/lib/auth/request-session';
import { requireSessionMutation, sessionFailure, sessionResponse, readSessionBody } from '@/lib/auth/session-http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function previewPOST(req: NextRequest) {
  try {
    requireSessionMutation(req);
    const actor = await requireNativeSession(req), body = await readSessionBody(req);
    if (!Array.isArray(body.scopes) || !body.scopes.length || body.scopes.length > 32 || body.scopes.some(scope => typeof scope !== 'string' || !/^[a-zA-Z0-9:*_.-]{1,100}$/.test(scope))
      || (body.ttlMs !== undefined && (typeof body.ttlMs !== 'number' || !Number.isSafeInteger(body.ttlMs) || body.ttlMs < 1000 || body.ttlMs > 86400000))
      || (body.name !== undefined && (typeof body.name !== 'string' || body.name.length > 100))) return sessionResponse({ error: 'Check the requested permissions and token lifetime.' }, 400);
    const result = await GalxAuthEngine.getInstance().createRestrictedToken(actor.token, { scopes: body.scopes as string[], ttlMs: body.ttlMs as number | undefined, name: body.name as string | undefined });
    if (!result.success) return sessionResponse({ error: 'The requested token could not be issued.' }, 403);
    return sessionResponse({ success: true, token: result.token, scopes: result.scopes, expiresAtMs: result.expiresAtMs });
  } catch (error) { return sessionFailure(error); }
}
export const POST = withDeveloperAccess(previewPOST);
