import test from 'node:test';
import assert from 'node:assert/strict';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { getSupabaseAdmin } from '../src/lib/supabase/client';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_test_only';
const request = (token: string) => new Request('https://galx.ai/v1/images/generations', { headers: { authorization: `Bearer ${token}` } });
const forged = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'attacker-chosen', exp: 4102444800, scopes: ['*'], sudoUntilMs: 4102444800000 })).toString('base64url')}.forged`;

test('identity requires verified credentials and never trusts client elevation claims', async () => {
  // Use the actual resolver without constructing unrelated persistence services.
  const engine = Object.create(GalxAuthEngine.prototype) as GalxAuthEngine;
  const auth = getSupabaseAdmin().auth;
  const original = auth.getUser;
  try {
    auth.getUser = async () => ({ data: { user: null }, error: new Error('private authentication diagnostic') }) as any;
    for (const token of [forged, '00000000-0000-4000-8000-000000000000', 'usr_test', 'user_test', 'session_test', 'dev_test', 'openai_test', 'github_test']) {
      assert.equal((await engine.resolveAuthIdentity(request(token))).authenticated, false);
      assert.equal((await engine.resolveAuthIdentity(new Request(`https://galx.ai/v1/images/generations?token=${encodeURIComponent(token)}`))).authenticated, false);
      assert.equal((await engine.resolveAuthIdentity(new Request('https://galx.ai/v1/images/generations', { headers: { cookie: `galx_session=${encodeURIComponent(token)}` } }))).authenticated, false);
    }
    auth.getUser = async () => { throw new Error('private outage'); };
    assert.equal((await engine.resolveAuthIdentity(request(forged))).authenticated, false);
    auth.getUser = async token => {
      assert.equal(token, forged);
      return { data: { user: { id: 'verified-user', user_metadata: { scopes: ['*'], sudo: true } } }, error: null } as any;
    };
    const identity = await engine.resolveAuthIdentity(request(forged));
    assert.equal(identity.authenticated, true);
    assert.equal(identity.userId, 'verified-user');
    assert.equal(identity.isSudoElevated, false);
    assert.equal(identity.isPriorityUser, false);
    assert.equal(identity.claims, undefined);
    const encoded = `base64-${Buffer.from(JSON.stringify({ access_token: forged })).toString('base64url')}`;
    const midpoint = Math.floor(encoded.length / 2);
    for (const cookie of [
      `sb-test-auth-token=${encoded}`,
      `sb-test-auth-token.1=${encoded.slice(midpoint)}; sb-test-auth-token.0=${encoded.slice(0, midpoint)}`,
    ]) {
      const session = await engine.resolveAuthIdentity(new Request('https://galx.ai/v1/images/generations', { headers: { cookie } }));
      assert.equal(session.authenticated, true);
      assert.equal(session.userId, 'verified-user');
      assert.equal(session.isSudoElevated, false);
    }
  } finally { auth.getUser = original; }
});
