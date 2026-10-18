import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { DEFAULT_POST_AUTH_PATH, safeAuthRedirect, authRecoveryPath } from '@/lib/auth/redirects';
import { canonicalRequestUrl } from '@/lib/security/request-origin';
import { accountClientOptions } from '@/lib/auth/account-client-options';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Request-scoped PKCE exchange, independent of the application's data-query circuit. */
export async function GET(request: NextRequest) {
  let url: URL;
  try { url = canonicalRequestUrl(request); }
  catch { return NextResponse.json({ error: 'Request not allowed.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } }); }
  const { searchParams, origin } = url;
  const next = safeAuthRedirect(searchParams.get('next') || searchParams.get('redirect') || searchParams.get('returnUrl') || DEFAULT_POST_AUTH_PATH);
  const changes: { name: string; value: string; options: CookieOptions }[] = [];
  const redirect = (path: string) => {
    const response = NextResponse.redirect(`${origin}${path}`);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Referrer-Policy', 'no-referrer');
    for (const cookie of changes) response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  };
  // Only authored notice codes reach the URL; provider errors and codes stay private.
  if (searchParams.has('error')) return redirect(authRecoveryPath(next, 'auth_cancelled'));
  const code = searchParams.getAll('code');
  if (code.length !== 1 || !code[0] || code[0].length > 8192) return redirect(authRecoveryPath(next, 'no_auth_code_provided'));

  try {
    const config = getSupabaseConfig();
    if (!config.hasDataApiCredential) throw new Error('Sign-in unavailable');
    const deadline = AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]);
    const supabase = createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
      ...accountClientOptions(),
      cookies: { getAll: () => request.cookies.getAll(), setAll: values => { changes.push(...values); } },
      global: { fetch: (input, init) => {
        const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
        signal.throwIfAborted();
        return fetch(input, { ...init, cache: 'no-store', signal });
      } },
    });
    // This mutation is never automatically replayed by application recovery.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code[0]);
    if (error || !data.session) return redirect(authRecoveryPath(next, 'auth_exchange_failed'));
    const response = redirect(next);
    for (const name of ['galx_session', 'galx_user_role']) {
      response.cookies.set(name, '', { path: '/', maxAge: 0, sameSite: 'lax', secure: url.protocol === 'https:', httpOnly: true });
    }
    return response;
  } catch {
    return redirect(authRecoveryPath(next, 'auth_exchange_failed'));
  }
}
