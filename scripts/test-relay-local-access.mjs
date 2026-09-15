import test from 'node:test';
import assert from 'node:assert/strict';
import { monitorOrigin, monitorTicket, monitorAvailable, runtimeAvailable, handoffDeadline, monitorHandoff } from './lib/relay-local-access.mjs';

test('launcher accepts only fixed destinations and never sends a mismatched credential', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return Response.json({}); };
  for (const pool of ['https://other.example', '../standard', 'Premium', '', 'premium?role=viewer']) {
    assert.throws(() => monitorOrigin(pool));
    await assert.rejects(monitorTicket(pool, { pool, operatorToken: 'secret' }, fetcher));
  }
  await assert.rejects(monitorTicket('premium', { pool: 'standard', operatorToken: 'peer-secret' }, fetcher));
  assert.equal(calls, 0);
});

test('launcher binds its short-lived ticket to the selected loopback origin and operator role', async () => {
  for (const pool of ['premium', 'standard']) {
    const url = await monitorTicket(pool, { pool, operatorToken: 'synthetic' }, async (url, options) => {
      assert.equal(url, monitorOrigin(pool) + '/session/ticket');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, 'Bearer synthetic');
      return Response.json({ ticket: 'a'.repeat(64), role: 'operator' });
    });
    assert.equal(url, monitorOrigin(pool) + '/#ticket=' + 'a'.repeat(64) + '&role=operator');
    assert(!url.includes('synthetic'));
  }
});

test('untrusted replies never become launcher URLs or diagnostic output', async () => {
  for (const payload of [{ ticket: 'https://evil.example', role: 'operator' }, { ticket: 'a'.repeat(64), role: 'viewer' }, { ticket: 'a'.repeat(65), role: 'operator' }]) {
    await assert.rejects(monitorTicket('premium', { pool: 'premium', operatorToken: 'secret' }, async () => Response.json(payload)), /invalid sign-in link/);
  }
  await assert.rejects(monitorTicket('premium', { pool: 'premium', operatorToken: 'secret' }, async () => Response.json({ private: 'never-display' }, { status: 503 })), error => !error.message.includes('never-display'));
});

test('unavailable or redirected health never reports available', async () => {
  for (const fetcher of [async () => { throw Error(); }, async () => Response.json({ ok: true }, { status: 503 }), async () => Response.json({})]) assert.equal(await monitorAvailable('standard', fetcher), false);
  assert.equal(await monitorAvailable('standard', async (_url, options) => { assert.equal(options.redirect, 'error'); return Response.json({ ok: true }); }), true);
});

test('cold startup respects the existing ownership fence and rejects uncertain timestamps', () => {
  const now = Date.parse('2026-09-15T18:00:00Z');
  assert.equal(handoffDeadline('2026-09-15T17:59:40Z', now), now + 41000);
  assert.equal(handoffDeadline('2026-09-15T17:58:00Z', now), now);
  assert.equal(handoffDeadline(null, now), now);
  assert.throws(() => handoffDeadline('invalid', now));
  assert.throws(() => handoffDeadline('2026-09-15T19:00:00Z', now));
});

test('runtime health uses its own fixed port and handoff reads validate identity and revoke their session', async () => {
  await runtimeAvailable('standard', async url => { assert.equal(url, 'http://127.0.0.1:13302/health/live'); return Response.json({ ok: true }); });
  let revoked = false;
  await assert.rejects(monitorHandoff('premium', { pool: 'premium', operatorToken: 'synthetic', installationId: 'own' }, async (url, options) => {
    if (url.endsWith('/session/ticket')) return Response.json({ ticket: 'a'.repeat(64), role: 'operator' });
    if (options.method === 'DELETE') { revoked = true; return Response.json({}); }
    if (url.endsWith('/session')) return Response.json({}, { headers: { 'set-cookie': 'scoped=synthetic; HttpOnly' } });
    assert.equal(options.headers.Cookie, 'scoped=synthetic');
    return Response.json({ pool: 'standard', installationId: 'peer', lastSeenAt: null });
  }), /installation changed/);
  assert(revoked);
});
