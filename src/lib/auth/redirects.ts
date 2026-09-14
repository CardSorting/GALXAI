import { legacyImagePath } from '@/lib/images/navigation';

export const DEFAULT_POST_AUTH_PATH = '/images';

/** Only accept a path within this application, including after URL decoding. */
export function safeAuthRedirect(value: string | null | undefined): string {
  if (!value || value.length > 2048) return DEFAULT_POST_AUTH_PATH;
  let decoded = value;
  try {
    for (let i = 0; i < 3; i++) {
      if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decoded)) return DEFAULT_POST_AUTH_PATH;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      if (i === 2) return DEFAULT_POST_AUTH_PATH;
      decoded = next;
    }
    const url = new URL(value, 'https://galx.invalid');
    const decodedUrl = new URL(decoded, 'https://galx.invalid');
    // An auth page cannot be its own post-login destination (including encoded paths).
    if (/^\/(?:auth|login|signup)(?:\/|$)/.test(decodedUrl.pathname)) return DEFAULT_POST_AUTH_PATH;
    if (url.origin !== 'https://galx.invalid' || decodedUrl.origin !== 'https://galx.invalid') return DEFAULT_POST_AUTH_PATH;
    return legacyImagePath(url.pathname, url.searchParams) ?? `${url.pathname}${url.search}${url.hash}`;
  } catch { return DEFAULT_POST_AUTH_PATH; }
}

/** Keep path separators legible; nested queries/fragments stay correctly encoded. */
export function authEntryPath(destination?: string | null, mode: 'login' | 'signup' = 'login', error?: string): string {
  const next = safeAuthRedirect(destination);
  const query = new URLSearchParams();
  if (next !== DEFAULT_POST_AUTH_PATH) query.set('next', next);
  if (error) query.set('error', publicAuthNoticeCode(error));
  const suffix = query.toString().replace(/%2F/gi, '/');
  return `/${mode}${suffix ? `?${suffix}` : ''}`;
}

function publicAuthNoticeCode(code: string): string {
  return ['session_replaced', 'signed_out', 'session_expired', 'auth_cancelled', 'auth_exchange_failed', 'no_auth_code_provided'].includes(code) ? code : 'auth_failed';
}

export function legacyAuthPath(pathname: string, search: URLSearchParams): string | null {
  const path = pathname.replace(/\/+$/, '');
  if (path !== '/auth/signin' && path !== '/auth/signup') return null;
  const single = (key: string) => search.getAll(key).length === 1 ? search.get(key) : null;
  return authEntryPath(single('next') || single('returnUrl') || single('redirect'), path === '/auth/signup' ? 'signup' : 'login', single('error') || undefined);
}
