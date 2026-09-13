import { withDeveloperAccess } from '@/lib/security/developer-access';
import type { NextRequest } from 'next/server';
import { GalxOAuthManager } from '@/core/auth/GalxOAuthManager';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { readSessionBody, sessionFailure, sessionResponse } from '@/lib/auth/session-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function previewPOST(req: NextRequest) {
  try {
    const body = await readSessionBody(req), code = body.device_code || body.deviceCode;
    if (typeof code !== 'string' || code.length > 1024 || !code) return sessionResponse({ error: 'invalid_request' }, 400);
    const result = await GalxOAuthManager.getInstance().pollDeviceToken(code);
    if (result.success) {
      const token = result.data?.access_token;
      if (typeof token !== 'string' || !token.startsWith('galx_sess_')) return sessionResponse({ error: 'invalid_grant' }, 400);
      const verified = await GalxAuthEngine.getInstance().verifySession(token, false);
      if (!verified.valid || !verified.session) return sessionResponse({ error: 'invalid_grant' }, 400);
      return sessionResponse({ access_token: token, token_type: 'Bearer', expires_in: Math.max(0, Math.floor((verified.session.expiresAtMs - Date.now()) / 1000)) });
    }
    const allowed = ['authorization_pending', 'slow_down', 'expired_token', 'access_denied'];
    return sessionResponse({ error: allowed.includes(result.error || '') ? result.error : 'invalid_grant', ...(Number.isSafeInteger(result.interval) && result.interval! > 0 ? { interval: result.interval } : {}) }, 400);
  } catch (error) { return sessionFailure(error); }
}
export const POST = withDeveloperAccess(previewPOST);
