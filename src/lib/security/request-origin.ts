/** Server-only deployment policy. Request metadata cannot select a trust mode.
 * Direct deployments retain their native authority. The private Mac listener
 * uses exact configured HTTPS virtual hosts; forwarded metadata is never an
 * authority source. The listener is not authentication: route authorization,
 * browser-origin checks and delegated grants still apply independently. */
export function canonicalRequestUrl(request: Request, env: NodeJS.ProcessEnv = process.env): URL {
  // NextRequest's accessor normalizes loopback IPs; retain the native authority.
  const url = new URL(Reflect.get(Request.prototype, 'url', request));
  const mode = env.GALX_REQUEST_ORIGIN_MODE || 'direct';
  if (mode === 'direct') return url;
  if (mode !== 'mac-loopback-v1' || env.GALX_SELF_HOST_AUTHORITY !== '0.0.0.0:3000'
      || url.host !== env.GALX_SELF_HOST_AUTHORITY || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid request origin.');
  }
  const origins = [env.NEXT_PUBLIC_APP_URL, env.GALX_CONNECT_ORIGIN, env.GALX_NOVA_RESOURCE].map(value => {
    if (!value) throw new Error('Invalid request origin.');
    const origin = new URL(value);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
      throw new Error('Invalid request origin.');
    }
    return origin;
  });
  const canonical = origins.find(origin => origin.host === request.headers.get('host')?.toLowerCase());
  if (!canonical) throw new Error('Invalid request origin.');
  // Mutate authority rather than resolving a path that could begin with //.
  url.protocol = canonical.protocol;
  url.hostname = canonical.hostname;
  url.port = canonical.port;
  return url;
}

export function canonicalRequestOrigin(request: Request): string {
  try { return canonicalRequestUrl(request).origin; } catch { return ''; }
}
