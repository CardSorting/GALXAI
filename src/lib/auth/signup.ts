import type { SupabaseClient } from '@supabase/supabase-js';
import { safeAuthRedirect } from './redirects';

export interface SignupCredentials { email: string; password: string; name?: string; next?: string }

/** Provider diagnostics never become public signup copy. */
export function signupErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  switch (code) {
    case 'weak_password': return 'Choose a stronger password with at least 8 characters.';
    case 'email_address_invalid': return 'Check your email address and try again.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Too many attempts. Wait a minute, then try again.';
    case 'user_already_exists': return 'Try signing in or resetting your password.';
    default: return 'We couldn’t complete that request. Please try again.';
  }
}

export async function registerAccount(auth: Pick<SupabaseClient['auth'], 'signUp'>, credentials: SignupCredentials, origin: string) {
  try {
    const email = credentials.email.trim();
    const { data, error } = await auth.signUp({
      email, password: credentials.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeAuthRedirect(credentials.next))}`,
        data: { full_name: credentials.name || email.split('@')[0], name: credentials.name || email.split('@')[0] },
      },
    });
    if (error) return { error: new Error(signupErrorMessage(error)), data: null };
    if (!data.user) return { error: new Error(signupErrorMessage(null)), data: null };
    return { error: null, data };
  } catch { return { error: new Error(signupErrorMessage(null)), data: null }; }
}
