/** Finite entry points with independent handler authorization, never a namespace bypass. */
const routes = new Set(['/connect', '/connect/consent', '/oauth/authorize', '/oauth/token', '/oauth/revoke', '/api/connect/consent', '/api/connect/connections', '/v1/inference', '/.well-known/oauth-authorization-server', '/.well-known/oauth-protected-resource']);
export const isConnectPath = (path: string) => routes.has(path.replace(/\/+$/, '') || '/');
