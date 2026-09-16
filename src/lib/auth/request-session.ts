import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { getSupabaseAuthClient } from '@/lib/supabase/client';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { sessionBearer, SessionAccessError } from './session-http';
import { sessionProfile } from './session-profile';
import { isAccountSessionActive } from './active-account-session';

export async function requireRequestSession(request: NextRequest) {
  const explicit = sessionBearer(request);
  const hasCookie = request.cookies.getAll().some(c => /^sb-.+-auth-token(?:\.\d+)?$/.test(c.name) && c.value);
  const native = explicit ?? (hasCookie ? undefined : request.cookies.get('galx_session')?.value);
  if (native?.startsWith('galx_sess_')) {
    const verified = await GalxAuthEngine.getInstance().verifySession(native, false);
    if (!verified.valid || !verified.session || !verified.claims?.sub || verified.claims.accountVerified !== true || verified.session.userId !== verified.claims.sub) throw new SessionAccessError(401);
    if (verified.session.id.startsWith('sess_sub_') || !verified.session.scopes?.includes('*')) throw new SessionAccessError(401);
    return { kind: 'native' as const, token: native, session: verified.session, user: sessionProfile({ id: verified.claims.sub, email: verified.claims.email, name: verified.claims.name }), cookies: [] as { name: string; value: string; options: CookieOptions }[] };
  }
  const changes: { name: string; value: string; options: CookieOptions }[] = [];
  const config = getSupabaseConfig();
  if (!explicit && !hasCookie && !native) throw new SessionAccessError(401);
  if (native && !/^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(native)) throw new SessionAccessError(401);
  if (!config.hasDataApiCredential) throw new SessionAccessError(503);
  const client = createServerClient(config.supabaseUrl, config.supabaseAnonKey, { cookies: { getAll: () => request.cookies.getAll(), setAll: values => { changes.push(...values); } },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) }) } });
  const credential = explicit ?? (hasCookie ? undefined : native);
  try {
  const { data, error } = await client.auth.getUser(credential);
  if (error) throw new SessionAccessError(!error.status || error.status === 429 || error.status >= 500 ? 503 : 401);
  if (!data.user?.id || data.user.is_anonymous) throw new SessionAccessError(401);
  const token = credential ?? (await client.auth.getSession()).data.session?.access_token;
  if (!token) throw new SessionAccessError(401);
  if (!await isAccountSessionActive(token)) throw new SessionAccessError(401);
  return { kind: 'supabase' as const, token, session: undefined, emailConfirmed: Boolean(data.user.email_confirmed_at), user: sessionProfile({ id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name || data.user.user_metadata?.full_name }), cookies: changes };
  } catch (error) {
    // A completed refresh is retained even when the subsequent authority read fails.
    throw new SessionAccessError(error instanceof SessionAccessError ? error.status : 503, changes);
  }
}

export async function requireNativeSession(request: NextRequest) {
  const actor = await requireRequestSession(request);
  if (actor.kind !== 'native' || actor.session.id.startsWith('sess_sub_') || !actor.session.scopes?.includes('*')) throw new SessionAccessError(403);
  return actor;
}

export async function revokeRequestSession(actor: Awaited<ReturnType<typeof requireRequestSession>>) {
  if (actor.kind === 'native') {
    if (!await GalxAuthEngine.getInstance().revokeSessionById(actor.session.id, actor.user.id)) throw new SessionAccessError(503);
  } else {
    const { error } = await getSupabaseAuthClient().auth.admin.signOut(actor.token, 'local');
    if (error && ![401, 403, 404].includes(error.status || 0)) throw new SessionAccessError(503);
    if (await isAccountSessionActive(actor.token)) throw new SessionAccessError(503);
  }
}
