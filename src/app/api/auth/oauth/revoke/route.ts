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
    const actor = await requireNativeSession(req);
    const { token } = await readSessionBody(req);
    if (typeof token !== 'string' || !token || token.length > 16384) return sessionResponse({ error: 'Invalid token parameter.' }, 400);
    const engine = GalxAuthEngine.getInstance();
    if (token.startsWith('galx_sess_')) {
      const target = await engine.verifySession(token, false);
      if (target.valid && target.session && target.claims?.sub === actor.user.id && target.session.userId === actor.user.id) {
        await engine.revokeSessionById(target.session.id, actor.user.id);
      }
    }
    // Invalid or foreign targets disclose nothing; operational failure is still an error.
    return sessionResponse({ success: true });
  } catch (error) { return sessionFailure(error); }
}
export const POST = withDeveloperAccess(previewPOST);
