/** Local, synthetic visual fixture. Never deploy this launcher or its build. */
const fs = require('node:fs');
const path = require('node:path');
if (require.main === module) {
  const { spawn } = require('node:child_process');
  const { randomBytes } = require('node:crypto');
  const root = path.resolve(process.argv[2] || '.');
  if (['.env', '.env.local', '.env.production', '.env.production.local'].some(name => fs.existsSync(path.join(root, name)))) throw new Error('Use an isolated build without dotenv files.');
  if (!fs.existsSync(path.join(root, '.next/BUILD_ID'))) throw new Error('Build the isolated application first.');
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3428', NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.invalid', SUPABASE_URL: 'https://supabase.invalid',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_ci_fixture', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ci_fixture',
    GALX_VAULT_ACTIVE_KEY_VERSION: 'v1', GALX_VAULT_KEY_V1: randomBytes(48).toString('base64url'), GALX_AUDIT_SIGNING_SECRET: randomBytes(48).toString('base64url') };
  const child = spawn(process.execPath, ['--require', __filename, path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3428'], { cwd: root, env, stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('exit', code => { process.exitCode = code ?? 1; });
} else {
  require('./verify-auth-entry-server.cjs');
  const fixtureFetch = globalThis.fetch;
  let mode = 'none';
  globalThis.fetch = async (input, init) => {
    if (mode === 'entry' && String(input).includes('/auth/v1/user')) return Response.json({ msg: 'PRIVATE_AUTH_SENTINEL' }, { status: 503 });
    return fixtureFetch(input, init);
  };
  const { Server } = require('node:http');
  const emit = Server.prototype.emit;
  Server.prototype.emit = function(event, req, res, ...rest) {
    if (event === 'request') {
      const pathname = new URL(req.url, 'http://localhost:3428').pathname;
      if (req.method === 'GET' && ['/__session_fixture/entry', '/__session_fixture/browser'].includes(pathname)) {
        mode = pathname.endsWith('/entry') ? 'entry' : 'browser';
        const user = { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.test', aud: 'authenticated', role: 'authenticated' };
        const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString('base64url')}.valid`;
        const value = 'base64-' + Buffer.from(JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: 4102444800, user })).toString('base64url');
        res.writeHead(303, { 'Cache-Control': 'private, no-store', 'Set-Cookie': `sb-supabase-auth-token=${value}; Path=/; SameSite=Lax`, Location: mode === 'entry' ? '/login?next=/images/library' : '/images' }); res.end(); return true;
      }
      if (req.method === 'POST' && pathname === '/__session_fixture/recover') { mode = 'none'; res.writeHead(204, { 'Cache-Control': 'no-store' }); res.end(); return true; }
      if (req.method === 'GET' && pathname === '/api/auth/session' && mode !== 'none') {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'Retry-After': '1' });
        res.end(JSON.stringify({ valid: false, error: 'Session verification is unavailable. Try again.' })); return true;
      }
    }
    return emit.call(this, event, req, res, ...rest);
  };
}
