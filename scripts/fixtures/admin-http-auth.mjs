/** Isolated browser-test process only. This file is never imported by application code. */
import { readFileSync } from 'node:fs';
const db = new URL(process.env.DATABASE_URL || 'about:blank');
if (process.env.GALX_ADMIN_HTTP_FIXTURE !== '1' || db.hostname !== '127.0.0.1' || db.pathname !== '/galx_integration_test') throw new Error('Admin browser fixture requires an isolated loopback database.');
const identities = JSON.parse(readFileSync(process.env.GALX_ADMIN_HTTP_IDENTITIES, 'utf8'));
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.pathname === '/auth/v1/user' && url.hostname.endsWith('.supabase.co')) {
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));
    const actor = identities[headers.get('authorization')?.replace(/^Bearer\s+/i, '')];
    return new Response(JSON.stringify(actor ? { id: actor.id, email: actor.email, email_confirmed_at: '2026-09-01T12:00:00Z', is_anonymous: false, app_metadata: {}, user_metadata: { name: actor.name, role: 'owner' }, aud: 'authenticated', created_at: '2026-09-01T12:00:00Z' } : { message: 'Invalid fixture session' }), { status: actor ? 200 : 401, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error('Outbound network is disabled in the admin browser fixture.');
};
