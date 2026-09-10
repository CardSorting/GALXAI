import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { DEFAULT_POST_AUTH_PATH, safeAuthRedirect } from '@/lib/auth/redirects';

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
    const errorQuery = new URLSearchParams({
      error: 'auth_cancelled',
      next,
    }).toString();
    return NextResponse.redirect(`${origin}/auth/signin?${errorQuery}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      .catch(() => ({ data: null, error: new Error('Session exchange unavailable') }));

    if (!error && data?.session) {
      // Sync local fast-path session cookies for Edge middleware compatibility
      const isHttps = origin.startsWith('https:');
      const maxAge = 2592000; // 30 days
      const userRole = data.user?.user_metadata?.role || 'developer';

      try {
        cookieStore.set('galx_session', data.session.access_token, {
          path: '/',
          maxAge,
          sameSite: 'lax',
          secure: isHttps,
          httpOnly: false,
        });
        cookieStore.set('galx_user_role', userRole, {
          path: '/',
          maxAge,
          sameSite: 'lax',
          secure: isHttps,
          httpOnly: false,
        });
      } catch {
        // Fallback if cookieStore write encounters a restricted context
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    if (error) {
      console.error('[OAuth Callback] Code exchange error:', error.message);
      const errParams = new URLSearchParams({
        error: 'auth_exchange_failed',
        next
      });
      return NextResponse.redirect(`${origin}/auth/signin?${errParams.toString()}`);
    }
  }

  // Return the user to the sign in page with an exchange failure notice
  return NextResponse.redirect(`${origin}/auth/signin?error=no_auth_code_provided&next=${encodeURIComponent(next)}`);
}
