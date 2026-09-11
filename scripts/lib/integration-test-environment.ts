import { randomBytes } from 'node:crypto';

/** Run the mutating integration suite only against an explicitly selected local test database. */
export function isolatedIntegrationEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const message = 'Integration tests require GALX_INTEGRATION_DATABASE_URL pointing to a loopback database named galx_integration_test (or galx_integration_test_<suffix>). Production credentials are not used.';
  let url: URL;
  try { url = new URL(env.GALX_INTEGRATION_DATABASE_URL || ''); } catch { throw new Error(message); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['127.0.0.1', '[::1]'].includes(url.hostname)
    || !/^\/galx_integration_test(?:_[a-z0-9_]+)?$/.test(url.pathname)
    || url.search || url.hash) throw new Error(message);
  url.searchParams.set('sslmode', 'disable'); // Fixed local-only policy; never accept caller-supplied routing parameters.
  const next: NodeJS.ProcessEnv = {};
  // A local SQL URL must never coexist with inherited R2, payment, relay or Data API authority.
  for (const key of ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'SystemRoot', 'SYSTEMROOT', 'TSX_TSCONFIG_PATH']) {
    if (env[key] !== undefined) next[key] = env[key];
  }
  Object.assign(next, { GALX_INTEGRATION_DATABASE_URL: env.GALX_INTEGRATION_DATABASE_URL,
    DATABASE_URL: url.href, NODE_ENV: 'test', GALX_VAULT_ACTIVE_KEY_VERSION: 'v1',
    GALX_VAULT_KEY_V1: randomBytes(48).toString('base64url'),
    GALX_AUDIT_SIGNING_SECRET: randomBytes(48).toString('base64url') });
  return next;
}
