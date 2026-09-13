import { sessionProfile, type SessionProfile } from './session-profile';
export const LOGOUT_STATE_KEY = 'galx_auth_logout_state';
export const OWNER_HINT_KEY = 'galx_custom_auth_user';

/** Cancels superseded verification; a late response can never undo sign-out/account switching. */
export class SessionRequestFence {
  private revision = 0;
  private controller?: AbortController;
  begin() { this.invalidate(); const revision = this.revision; this.controller = new AbortController(); return { signal: this.controller.signal, current: () => revision === this.revision && !this.controller?.signal.aborted }; }
  invalidate() { this.revision++; this.controller?.abort(); }
}
export function readSessionProfile(value: unknown): { user: SessionProfile } | null {
  const result = value as { valid?: unknown; user?: Record<string, unknown> } | null;
  if (result?.valid !== true || !result.user || typeof result.user.id !== 'string' || !result.user.id) return null;
  return { user: sessionProfile({ id: result.user.id, email: result.user.email, name: result.user.name }) };
}
export function logoutState(): string | null {
  let marker: string | null = null;
  try { marker = localStorage.getItem(LOGOUT_STATE_KEY); } catch { /* Fall back to the server-entry marker. */ }
  return marker || (document.cookie.split(';').some(value => value.trim() === 'galx_logout_pending=1') ? 'pending' : null);
}
export function markLogout(value: 'pending' | 'complete' | null) {
  try { if (value) localStorage.setItem(LOGOUT_STATE_KEY, value); else localStorage.removeItem(LOGOUT_STATE_KEY); } catch { /* Cookie still gates server entry when storage is unavailable. */ }
  document.cookie = `galx_logout_pending=${value === 'pending' ? '1' : ''}; Path=/; SameSite=Lax; Max-Age=${value === 'pending' ? 2592000 : 0}${location.protocol === 'https:' ? '; Secure' : ''}`;
}
export function rememberOwner(user: SessionProfile | null) {
  // A non-secret hint for existing account-scoped outbox storage, never an identity source.
  try { if (user) localStorage.setItem(OWNER_HINT_KEY, JSON.stringify({ id: user.id })); else localStorage.removeItem(OWNER_HINT_KEY); } catch { /* Current tab identity remains in memory. */ }
}
