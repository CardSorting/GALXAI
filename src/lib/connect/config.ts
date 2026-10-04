/** Server configuration only. Clients are reviewed registrations, never caller-supplied metadata. */
export const CONNECT_SCOPE = 'inference:invoke';
export type ConnectClient = { id: string; name: string; kind: 'browser' | 'native'; redirectUris: string[]; origins: string[] };
export type ConnectConfig = { issuer: string; resource: string; clients: ConnectClient[] };

export { canonicalRequestOrigin as requestOrigin } from '../security/request-origin';

export class ConnectError extends Error {
  constructor(readonly code: 'invalid_request' | 'invalid_client' | 'invalid_scope' | 'invalid_target' | 'invalid_grant' | 'access_denied' | 'temporarily_unavailable', readonly status = 400) {
    super(code); this.name = 'ConnectError';
  }
}
export function trustedUrl(value: string): URL {
  const url = new URL(value);
  if (url.username || url.password || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('Invalid Connect URL configuration');
  return url;
}
export function connectConfig(): ConnectConfig {
  if (process.env.GALX_CONNECT_ENABLED !== '1') throw new ConnectError('temporarily_unavailable', 503);
  const issuer = trustedUrl(process.env.GALX_CONNECT_ORIGIN || 'https://galx.ai');
  const resource = trustedUrl(process.env.GALX_NOVA_RESOURCE || 'https://nova.galx.ai');
  if (issuer.pathname !== '/' || issuer.search || resource.pathname !== '/' || resource.search) throw new Error('Invalid Connect origin');
  const input: unknown = JSON.parse(process.env.GALX_CONNECT_CLIENTS || '[]');
  if (!Array.isArray(input) || input.length > 100) throw new Error('Invalid client registry');
  const ids = new Set<string>();
  const clients: ConnectClient[] = input.map(c => {
    if (!c || typeof c.id !== 'string' || !/^[a-zA-Z0-9_-]{3,80}$/.test(c.id) || ids.has(c.id) || typeof c.name !== 'string' || c.name.length < 1 || c.name.length > 100 || /[\u0000-\u001f\u007f]/.test(c.name) || !['native','browser'].includes(c.kind) || !Array.isArray(c.redirectUris) || !c.redirectUris.length || c.redirectUris.length > 10 || !Array.isArray(c.origins) || c.origins.length > 10) throw new Error('Invalid client registration');
    ids.add(c.id);
    const redirectUris = c.redirectUris.map((uri: unknown) => {
      if (typeof uri !== 'string' || uri.length > 1500) throw new Error('Invalid redirect URI');
      const u = trustedUrl(uri);
      if (u.search || u.href !== uri) throw new Error('Redirects must be canonical URLs without query strings');
      return uri;
    });
    const origins = c.origins.map((value: unknown) => {
      if (typeof value !== 'string') throw new Error('Invalid origin');
      const u = trustedUrl(value);
      if (u.origin !== value) throw new Error('Invalid origin');
      return value;
    });
    if (c.kind === 'native' && origins.length) throw new Error('Native clients do not register browser origins');
    if (c.kind === 'browser' && (!origins.length || redirectUris.some((uri: string) => !origins.includes(new URL(uri).origin)))) throw new Error('Browser redirect origin must be registered');
    return { id: c.id, name: c.name, kind: c.kind, redirectUris, origins };
  });
  return { issuer: issuer.origin, resource: resource.origin, clients };
}
export function clientById(config: ConnectConfig, id: string | null): ConnectClient {
  const client = config.clients.find(c => c.id === id);
  if (!client) throw new ConnectError('invalid_client');
  return client;
}
export function validRedirect(client: ConnectClient, uri: string): boolean {
  if (client.redirectUris.includes(uri)) return true;
  // RFC 8252 permits an ephemeral port only for a registered IP loopback redirect.
  if (client.kind !== 'native') return false;
  try {
    const u = trustedUrl(uri);
    if (u.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(u.hostname) || u.search || u.href !== uri) return false;
    return client.redirectUris.some(value => { const registered = new URL(value); return registered.protocol === u.protocol && registered.hostname === u.hostname && registered.pathname === u.pathname; });
  } catch { return false; }
}
export function requireClientOrigin(request: Request, client: ConnectClient): void {
  const origin = request.headers.get('origin');
  if (origin !== null && !client.origins.includes(origin)) throw new ConnectError('access_denied', 403);
}
export function uniqueParams(params: URLSearchParams, allowed: string[]): void {
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) throw new ConnectError('invalid_request');
}
