import { getSupabaseConfig } from '@/lib/supabase/config';

/** Authenticated Data API checks the same JWT against its live, owner-bound session.
 * No process cache or general database circuit may grant stale account authority.
 * Call only after getUser has verified this credential and rejected anonymous users.
 */
export async function isAccountSessionActive(token: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config.hasDataApiCredential) throw new Error('AUTH_UNAVAILABLE');
  const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/fn_account_session_active`, {
    method: 'POST',
    headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}', cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) return false;
  // Missing migration, denied grant, transport error or malformed result is an
  // unavailable verifier, never a valid grant or evidence the user signed out.
  if (!response.ok) throw new Error('AUTH_UNAVAILABLE');
  const active: unknown = await response.json();
  if (typeof active !== 'boolean') throw new Error('AUTH_UNAVAILABLE');
  return active;
}
