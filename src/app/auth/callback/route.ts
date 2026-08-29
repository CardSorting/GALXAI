import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Standard Supabase SSR OAuth Callback Route Handler.
 * Exchanges authorization code for Supabase session and sets secure auth cookies.
 * Completely siloed from backend routing and Substrate services.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || searchParams.get('redirect') || searchParams.get('returnUrl') || '/chat';
  const errorParam = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  // Handle upstream OAuth provider denial or cancellation
  if (errorParam) {
    const errorQuery = new URLSearchParams({
      error: errorParam,
      ...(errorDesc ? { error_description: errorDesc } : {})
    }).toString();
    return NextResponse.redirect(`${origin}/auth/signin?${errorQuery}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const forwardedHost = request.headers.get('x-forwarded-host');

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to the sign in page with an exchange failure notice
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_exchange_failed`);
}
