import { safeAuthRedirect } from './redirects';

/** Labels and notices are authored copy, never arbitrary URLs or provider diagnostics. */
export function authDestinationLabel(destination: string): string {
  const path = new URL(safeAuthRedirect(destination), 'https://galx.invalid').pathname;
  if (/^\/sites(?:\/|$)/.test(path)) return 'Sites';
  if (/^\/images(?:\/|$)/.test(path) || path === '/library') return 'Images';
  if (/^\/billing(?:\/|$)/.test(path)) return 'your account';
  if (/^\/admin(?:\/|$)/.test(path)) return 'your workspace';
  if (path === '/developers') return 'developer preview';
  return 'GALX';
}

export function authNotice(code?: string | null): string | null {
  if (!code) return null;
  if (code === 'session_replaced') return 'For your security, sign in again with your GALX account. You’ll return to where you left off.';
  if (code === 'signed_out') return 'You’re signed out of this browser.';
  if (code === 'session_expired') return 'Sign in again to continue where you left off.';
  if (code === 'auth_cancelled') return 'Sign-in was cancelled. Choose a sign-in method to try again.';
  if (['auth_exchange_failed', 'no_auth_code_provided'].includes(code)) return 'This sign-in link could not be used. Try signing in again.';
  return 'Sign-in could not be completed. Please try again.';
}

export function signInErrorMessage(error: unknown, method: 'password' | 'provider' | 'link'): string {
  const value = error as { status?: unknown; code?: unknown; name?: unknown } | null;
  if (value?.status === 429 || value?.code === 'over_request_rate_limit' || value?.code === 'over_email_send_rate_limit') {
    return 'Too many attempts. Wait a moment, then try again.';
  }
  if (value?.name === 'AuthRetryableFetchError' || value?.name === 'TypeError' || (typeof value?.status === 'number' && value.status >= 500)) {
    return 'We couldn’t connect. Check your connection and try again.';
  }
  if (method === 'password') return 'We couldn’t sign you in. Check your email and password, or use another sign-in method.';
  if (method === 'link') return 'We couldn’t send a sign-in link. Try again in a moment, or use your password.';
  return 'That sign-in attempt didn’t finish. Try again, or choose another method.';
}
