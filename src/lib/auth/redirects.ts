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
    if (/^\/auth(?:\/|$)/.test(decodedUrl.pathname)) return DEFAULT_POST_AUTH_PATH;
    return url.origin === 'https://galx.invalid' ? `${url.pathname}${url.search}${url.hash}` : DEFAULT_POST_AUTH_PATH;
  } catch { return DEFAULT_POST_AUTH_PATH; }
}
