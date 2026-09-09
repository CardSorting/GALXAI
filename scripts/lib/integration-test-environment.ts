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
  const next = { ...env, DATABASE_URL: url.href, NODE_ENV: 'test' };
  // The Data API must not fall back to the production project while SQL uses a test DB.
  for (const key of Object.keys(next)) if (/^(NEXT_PUBLIC_)?SUPABASE_/.test(key)) delete next[key];
  return next;
}
