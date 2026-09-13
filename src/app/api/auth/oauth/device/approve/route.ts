import { withDeveloperAccess } from '@/lib/security/developer-access';
import type { NextRequest } from 'next/server';
import { GalxOAuthManager } from '@/core/auth/GalxOAuthManager';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { requireNativeSession } from '@/lib/auth/request-session';
import { readSessionBody, requireSessionMutation, sessionFailure, sessionResponse } from '@/lib/auth/session-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function previewPOST(req: NextRequest) {
  try {
    requireSessionMutation(req);
    const actor = await requireNativeSession(req), body = await readSessionBody(req);
    const code = body.userCode || body.user_code;
    if (typeof code !== 'string' || !/^[a-zA-Z0-9-]{4,20}$/.test(code.trim())) return sessionResponse({ error: 'Check the device code.' }, 400);
    // The new device receives its own bounded credential, never this browser's token.
    const engine = GalxAuthEngine.getInstance();
    const grant = await engine.createRestrictedToken(actor.token, { scopes: actor.session.scopes || [], ttlMs: 86400000, name: 'Device access' });
    if (!grant.success || !grant.token) return sessionResponse({ error: 'Device authorization is unavailable. Try again.' }, 503);
    const approved = await GalxOAuthManager.getInstance().approveDeviceCode(code.trim(), grant.token, undefined, actor.user.id);
    if (!approved) await engine.revokeSession(grant.token, 'Device code was not approved');
    return sessionResponse(approved ? { success: true, message: 'Device authorized. You can return to your terminal.' } : { error: 'This device code is invalid or expired.' }, approved ? 200 : 400);
  } catch (error) { return sessionFailure(error); }
}
export const POST = withDeveloperAccess(previewPOST);
