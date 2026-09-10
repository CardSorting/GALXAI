import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export class AccountIdentityError extends Error {
  readonly status = 401;
}

/** Dashboard access requires a verified session, never a caller-supplied user ID or API key. */
export async function requireAccountIdentity(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.cookies.get('galx_session')?.value;
  if (token?.startsWith('galx_sess_')) {
    const { GalxAuthEngine } = await import('@/core/auth/GalxAuthEngine');
    const verified = await GalxAuthEngine.getInstance().verifySession(token, true);
    if (verified.valid && verified.claims?.sub && verified.claims.email) {
      return { id: verified.claims.sub, email: verified.claims.email.toLowerCase(), name: verified.claims.name || verified.claims.email };
    }
    throw new AccountIdentityError('Sign in again to view your account.');
  }
  const client = createClient(await cookies());
  const { data, error } = await client.auth.getUser(token || undefined);
  if (error || !data.user?.email || !data.user.email_confirmed_at || data.user.is_anonymous) throw new AccountIdentityError('Sign in with a verified email to view your account.');
  return { id: data.user.id, email: data.user.email.toLowerCase(), name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email };
}
