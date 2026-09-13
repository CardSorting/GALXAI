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
    const actor = await requireNativeSession(req), { token } = await readSessionBody(req);
    if (typeof token !== 'string' || token.length > 16384 || !token.startsWith('galx_sess_')) return sessionResponse({ active: false });
    const target = await GalxAuthEngine.getInstance().verifySession(token, false);
    if (!target.valid || !target.session || target.claims?.sub !== actor.user.id || target.session.userId !== actor.user.id) return sessionResponse({ active: false });
    return sessionResponse({ active: true, token_type: 'Bearer', sub: actor.user.id, exp: Math.floor(target.session.expiresAtMs / 1000), scope: (target.claims.scopes || []).join(' ') });
  } catch (error) { return sessionFailure(error); }
}
export const POST = withDeveloperAccess(previewPOST);
