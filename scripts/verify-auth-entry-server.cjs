/** Synthetic localhost fixture only. Never deploy this server or its build. */
const fs = require('node:fs');
const path = require('node:path');
if (require.main === module) {
  const { spawn } = require('node:child_process');
  const { randomBytes } = require('node:crypto');
  const root = path.resolve(process.argv[2] || '.');
  if (['.env', '.env.local', '.env.production', '.env.production.local'].some(name => fs.existsSync(path.join(root, name)))) throw new Error('Use an isolated validation build without dotenv files.');
  const buildConfig = JSON.parse(fs.readFileSync(path.join(root, '.next/required-server-files.json'), 'utf8'));
  if (!buildConfig || !fs.existsSync(path.join(root, '.next/BUILD_ID'))) throw new Error('An isolated production build is required.');
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3427', NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.invalid', SUPABASE_URL: 'https://supabase.invalid',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_ci_fixture', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ci_fixture',
    GALX_VAULT_ACTIVE_KEY_VERSION: 'v1', GALX_VAULT_KEY_V1: randomBytes(48).toString('base64url'), GALX_AUDIT_SIGNING_SECRET: randomBytes(48).toString('base64url') };
  const child = spawn(process.execPath, ['--require', __filename, path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3427'], { cwd: root, env, stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('exit', code => { process.exitCode = code ?? 1; });
} else {
  const revoked = new Set();
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url || String(input));
    const credential = new Headers(init?.headers || input.headers).get('authorization') || '';
    if (url.hostname === 'supabase.invalid' && url.pathname === '/auth/v1/logout') { revoked.add(credential); return new Response(null, { status: 204 }); }
    if (url.hostname === 'supabase.invalid' && url.pathname === '/rest/v1/rpc/fn_account_session_active') {
      if (credential.endsWith('.lookup-unavailable')) return Response.json({ error: 'PRIVATE_AUTH_SENTINEL' }, { status: 503 });
      return Response.json(!revoked.has(credential) && !credential.endsWith('.revoked'));
    }
    if (url.hostname === 'supabase.invalid' && url.pathname === '/auth/v1/user') {
      const authorization = new Headers(init?.headers || input.headers).get('authorization') || '';
      if (authorization.endsWith('.unavailable')) return Response.json({ code: 'unavailable', msg: 'PRIVATE_AUTH_SENTINEL' }, { status: 503 });
      if (['.valid', '.revoked', '.lookup-unavailable'].some(suffix => authorization.endsWith(suffix))) return Response.json({ id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', is_anonymous: false, email: 'fixture@example.test', email_confirmed_at: '2026-09-13T00:00:00Z' });
      return Response.json({ code: 'bad_jwt', msg: 'PRIVATE_AUTH_SENTINEL' }, { status: 401 });
    }
    throw new Error('External network disabled in isolated HTTP fixture');
  };
}
