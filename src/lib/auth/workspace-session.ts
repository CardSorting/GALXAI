import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { isAccountSessionActive } from './active-account-session';

type SessionState = 'authenticated' | 'unauthenticated' | 'unavailable';
interface WorkspaceCookies {
  getAll(): { name: string; value: string }[];
  setAll?(cookies: { name: string; value: string; options: CookieOptions }[]): void;
}

/** Server-only account entry check. Cookie presence and client claims are never authority. */
export async function verifyWorkspaceSession(cookies: WorkspaceCookies): Promise<SessionState> {
  const values = cookies.getAll();
  if (values.some(cookie => cookie.name === 'galx_logout_pending' && cookie.value === '1')) return 'unauthenticated';
  const token = values.find(cookie => cookie.name === 'galx_session')?.value;
  const hasSupabaseSession = values.some(cookie => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name) && cookie.value);
  if (!token && !hasSupabaseSession) return 'unauthenticated';

  let unavailable = false;
  if (hasSupabaseSession || (token && !token.startsWith('galx_sess_'))) {
    try {
      const config = getSupabaseConfig();
      if (!config.hasDataApiCredential) return 'unavailable';
      const client = createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
        cookies: { getAll: () => cookies.getAll(), setAll: values => cookies.setAll?.(values) },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store',
          signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
        }) },
      });
      const { data, error } = await client.auth.getUser(hasSupabaseSession ? undefined : token);
      if (!error && data.user?.id && !data.user.is_anonymous) {
        const verifiedToken = hasSupabaseSession ? (await client.auth.getSession()).data.session?.access_token : token;
        if (verifiedToken && await isAccountSessionActive(verifiedToken)) return 'authenticated';
        return 'unauthenticated';
      }
      unavailable = Boolean(error && (!error.status || error.status === 429 || error.status >= 500));
    } catch { unavailable = true; }
  }

  if (!hasSupabaseSession && token?.startsWith('galx_sess_')) {
    try {
      const { GalxAuthEngine } = await import('@/core/auth/GalxAuthEngine');
      const verified = await GalxAuthEngine.getInstance().verifySession(token, false);
      if (verified.valid && verified.claims?.accountVerified === true && verified.claims.sub && verified.session?.userId === verified.claims.sub && !verified.session.id.startsWith('sess_sub_') && verified.session.scopes?.includes('*')) return 'authenticated';
    } catch { unavailable = true; }
  }
  return unavailable ? 'unavailable' : 'unauthenticated';
}
