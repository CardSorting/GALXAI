import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { DEFAULT_POST_AUTH_PATH, safeAuthRedirect, authEntryPath } from '@/lib/auth/redirects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Standard Supabase SSR OAuth Callback Route Handler.
 * Exchanges authorization code for Supabase session and sets secure auth cookies.
 * Supports Google & GitHub OAuth PKCE exchange, sanitization, and Edge session hydration.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') || searchParams.get('redirect') || searchParams.get('returnUrl') || DEFAULT_POST_AUTH_PATH;
  const errorParam = searchParams.get('error');

  // Sanitize next destination: prevent open redirects or protocol injection
  const next = safeAuthRedirect(rawNext);

  // Handle upstream OAuth provider denial or cancellation
  if (errorParam) {
    return NextResponse.redirect(`${origin}${authEntryPath(next, 'login', 'auth_cancelled')}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      .catch(() => ({ data: null, error: new Error('Session exchange unavailable') }));

    if (!error && data?.session) {
      // Supabase SSR cookies are canonical. Retire legacy token and role aliases.
      const isHttps = origin.startsWith('https:');

      try {
        cookieStore.set('galx_session', '', {
          path: '/',
          maxAge: 0,
          sameSite: 'lax',
          secure: isHttps,
          httpOnly: true,
        });
        cookieStore.set('galx_user_role', '', {
          path: '/',
          maxAge: 0,
          sameSite: 'lax',
          secure: isHttps,
          httpOnly: true,
        });
      } catch {
        // Fallback if cookieStore write encounters a restricted context
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    if (error) {
      console.error('[OAuth Callback] Code exchange error:', error.message);
      return NextResponse.redirect(`${origin}${authEntryPath(next, 'login', 'auth_exchange_failed')}`);
    }
  }

  // Return the user to the sign in page with an exchange failure notice
  return NextResponse.redirect(`${origin}${authEntryPath(next, 'login', 'no_auth_code_provided')}`);
}
