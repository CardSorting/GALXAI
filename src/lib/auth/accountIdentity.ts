import type { NextRequest } from 'next/server';
import { requireRequestSession } from './request-session';
import { SessionAccessError } from './session-http';

export class AccountIdentityError extends SessionAccessError { constructor(_message?: string) { super(401); } }

/** Account and staff authorization requires an Auth-verified email. Provider metadata is not email verification. */
export async function requireAccountIdentity(req: NextRequest) {
  try {
    const actor = await requireRequestSession(req);
    if (actor.kind !== 'supabase' || !actor.emailConfirmed || !actor.user.email) throw new AccountIdentityError('Sign in with a verified email to view your account.');
    return { id: actor.user.id, email: actor.user.email.toLowerCase(), name: actor.user.name || actor.user.email };
  } catch (error) {
    if (error instanceof SessionAccessError && error.status === 401) throw new AccountIdentityError('Sign in again to view your account.');
    throw error;
  }
}
