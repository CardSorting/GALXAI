import type { NextRequest } from 'next/server';
import { requireRequestSession } from './request-session';
import { SessionAccessError, type SessionCookie } from './session-http';

export class AccountIdentityError extends SessionAccessError { constructor(_message?: string, cookies: SessionCookie[] = []) { super(401, cookies); } }

/** Account and staff authorization requires an Auth-verified email. Provider metadata is not email verification. */
export async function requireAccountIdentity(req: NextRequest, onCookies?: (cookies: SessionCookie[]) => void) {
  try {
    const actor = await requireRequestSession(req);
    onCookies?.(actor.cookies);
    if (actor.kind !== 'supabase' || !actor.emailConfirmed || !actor.user.email) throw new AccountIdentityError('Sign in with a verified email to view your account.', actor.cookies);
    return { id: actor.user.id, email: actor.user.email.toLowerCase(), name: actor.user.name || actor.user.email };
  } catch (error) {
    if (error instanceof SessionAccessError && error.status === 401) throw new AccountIdentityError('Sign in again to view your account.', error.cookies);
    throw error;
  }
}
