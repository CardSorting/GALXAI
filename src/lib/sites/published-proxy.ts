import { siteHostname } from './domains';

export const PUBLISHED_SITE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; sandbox",
};

/** Return the approved public artifact without exposing framework rewrite headers.
 * No incoming credentials, cookies, query parameters or response headers cross this boundary. */
export async function publishedSiteProxy(request: Request, hostname: string, fetcher: typeof fetch = fetch): Promise<Response> {
  const unavailable = () => new Response(request.method === 'HEAD' ? null : 'Site unavailable.', {
    status: 404, headers: { ...PUBLISHED_SITE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  });
  if (!['GET', 'HEAD'].includes(request.method)) return unavailable();
  try {
    siteHostname(hostname);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(6000)]);
    const response = await fetcher(`https://galx.ai/api/sites/published/${hostname}`, {
      method: request.method, redirect: 'error', cache: 'no-store', signal,
    });
    if (response.status !== 200 || response.headers.get('content-type') !== 'text/html; charset=utf-8') {
      await response.body?.cancel(); return unavailable();
    }
    const headers = { ...PUBLISHED_SITE_HEADERS, 'Content-Type': 'text/html; charset=utf-8' };
    if (request.method === 'HEAD') { await response.body?.cancel(); return new Response(null, { headers }); }
    const reader = response.body?.getReader(); if (!reader) return unavailable();
    const chunks: Uint8Array[] = []; let size = 0;
    const cancel = () => { void reader.cancel().catch(() => {}); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      signal.throwIfAborted();
      while (true) {
        const part = await reader.read(); signal.throwIfAborted(); if (part.done) break;
        size += part.value.byteLength;
        if (size > 65536) { await reader.cancel(); return unavailable(); }
        chunks.push(part.value);
      }
    } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
    const body = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(body, { headers });
  } catch { return unavailable(); }
}
