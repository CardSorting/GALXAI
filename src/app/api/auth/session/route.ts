import type { NextRequest } from 'next/server';
import { requireRequestSession, revokeRequestSession } from '@/lib/auth/request-session';
import { clearSessionCookies, requireSessionMutation, SessionAccessError, sessionFailure, sessionResponse } from '@/lib/auth/session-http';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Same-origin browser profile. Never return credentials, internal claims or operational objects. */
export async function GET(request: NextRequest) {
  try {
    if (request.cookies.get('galx_logout_pending')?.value === '1') throw new SessionAccessError(401);
    const actor = await requireRequestSession(request);
    const response = sessionResponse({ valid: true, user: actor.user });
    for (const cookie of actor.cookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
    if (actor.kind === 'supabase') response.cookies.set('galx_session', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' });
    return response;
  } catch (error) { return sessionFailure(error); }
}

/** Sign out this browser session. Session IDs and API keys cannot stand in for a credential. */
export async function DELETE(request: NextRequest) {
  try {
    requireSessionMutation(request);
    let actor;
    try { actor = await requireRequestSession(request); }
    catch (error) {
      if (error instanceof SessionAccessError && error.status === 401) return clearSessionCookies(request, sessionFailure(error));
      throw error;
    }
    try { await revokeRequestSession(actor); }
    catch (error) {
      // Verification may have rotated an expired refresh token. Preserve that
      // verified replacement so a temporary revocation outage remains retryable.
      const response = sessionFailure(error);
      for (const cookie of actor.cookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    }
    return clearSessionCookies(request, sessionResponse({ success: true, message: 'Signed out of this browser.' }));
  } catch (error) { return sessionFailure(error); }
}
