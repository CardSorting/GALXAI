import test from 'node:test';
import assert from 'node:assert/strict';
import { monitorOrigin, monitorTicket, monitorAvailable, runtimeAvailable, runtimeOwnershipFresh, handoffDeadline, monitorHandoff } from './lib/relay-local-access.mjs';

test('launcher accepts only fixed destinations and never sends a mismatched credential', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return Response.json({}); };
  for (const pool of ['https://other.example', '../retired', 'Premium', '', 'premium?role=viewer']) {
    assert.throws(() => monitorOrigin(pool));
    await assert.rejects(monitorTicket(pool, { pool, operatorToken: 'secret' }, fetcher));
  }
  await assert.rejects(monitorTicket('premium', { pool: 'retired', operatorToken: 'peer-secret' }, fetcher));
  assert.equal(calls, 0);
});

test('launcher binds its short-lived ticket to the selected loopback origin and operator role', async () => {
  for (const pool of ['premium']) {
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
  for (const fetcher of [async () => { throw Error(); }, async () => Response.json({ ok: true }, { status: 503 }), async () => Response.json({})]) assert.equal(await monitorAvailable('premium', fetcher), false);
  assert.equal(await monitorAvailable('premium', async (_url, options) => { assert.equal(options.redirect, 'error'); return Response.json({ ok: true }); }), true);
});

test('cold startup respects the existing ownership fence and rejects uncertain timestamps', () => {
  const now = Date.parse('2026-09-15T18:00:00Z');
  assert.equal(handoffDeadline('2026-09-15T17:59:40Z', now), now + 41000);
  assert.equal(handoffDeadline('2026-09-15T17:58:00Z', now), now);
  assert.equal(handoffDeadline(null, now), now);
  assert.throws(() => handoffDeadline('invalid', now));
  assert.throws(() => handoffDeadline('2026-09-15T19:00:00Z', now));
});

test('runtime handoff uses private control evidence and rejects missing or foreign authority', async () => {
  await runtimeAvailable('premium', async url => { assert.equal(url, 'http://127.0.0.1:13301/health/live'); return Response.json({ ok: true }); });
  const config={pool:'premium',installationId:'own'};
  await assert.rejects(monitorHandoff('premium',config,async()=>({pool:'retired',installationId:'peer',lastSeenAt:null})),/installation changed/);
  await assert.rejects(monitorHandoff('premium',config,async()=>({pool:'premium',role:'operator'})),/installation changed/);
  await assert.rejects(monitorHandoff('premium',config,async()=>({...config})),/could not be verified/);
  await assert.rejects(monitorHandoff('premium',config,async()=>({...config,lastSeenAt:123})),/could not be verified/);
  const last=new Date().toISOString();
  assert.equal(await monitorHandoff('premium',config,async()=>({...config,lastSeenAt:last})),Date.parse(last)+61000);
  assert((await monitorHandoff('premium',config,async()=>({...config,lastSeenAt:null})))<=Date.now());
});

test('a live listener with expired ownership is not a connected runtime', async () => {
  const now = Date.parse('2026-10-07T18:00:00Z');
  const config = {pool:'premium',installationId:'own'};
  assert.equal(await runtimeAvailable('premium', async () => Response.json({ok:true})), true);
  for (const age of [0, 10000, 44999, 45000, 61000, 3 * 86400000]) {
    assert.equal(await runtimeOwnershipFresh('premium', config, async () => ({...config,lastSeenAt:new Date(now-age).toISOString()}), now), age < 45000);
  }
  assert.equal(await runtimeOwnershipFresh('premium', config, async () => ({...config,lastSeenAt:null}), now), false);
  assert.equal(await runtimeOwnershipFresh('premium', config, async () => ({...config,lastSeenAt:new Date(now+1000).toISOString()}), now), false);
  for (const status of [
    {...config,lastSeenAt:'invalid'}, {...config,lastSeenAt:123}, {...config},
    {...config,lastSeenAt:new Date(now+6000).toISOString()},
    {...config,installationId:'foreign',lastSeenAt:new Date(now).toISOString()},
  ]) await assert.rejects(runtimeOwnershipFresh('premium', config, async () => status, now));
  await assert.rejects(runtimeOwnershipFresh('premium', config, async () => { throw Error('control unavailable'); }, now));
});
