import test from 'node:test';
import assert from 'node:assert/strict';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { getSupabaseAdmin, getSupabaseAuthClient, resetSupabaseClients } from '../src/lib/supabase/client';
import { NextRequest } from 'next/server';
import { ImageLibraryRepository } from '../src/lib/supabase/repositories/ImageLibraryRepository';
import { GET as library } from '../src/app/api/images/library/route';
import { GET as asset, PATCH as favorite } from '../src/app/api/images/library/[assetId]/route';
import { BroccoliAuthoritativeGovernor } from '../src/core/broccolidb/BroccoliAuthoritativeGovernor';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
// Reproduce production: a public key in this legacy variable cannot grant admin authority.
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_publishable_test_only';
delete process.env.SUPABASE_SECRET_KEY;
const request = (token: string) => new Request('https://galx.ai/v1/images/generations', { headers: { authorization: `Bearer ${token}` } });
const forged = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'attacker-chosen', exp: 4102444800, scopes: ['*'], sudoUntilMs: 4102444800000 })).toString('base64url')}.forged`;

test('identity requires verified credentials and never trusts client elevation claims', async () => {
  // Use the actual resolver without constructing unrelated persistence services.
  const engine = Object.create(GalxAuthEngine.prototype) as GalxAuthEngine;
  const auth = getSupabaseAuthClient().auth;
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

test('image library and favorites verify sessions without administrator credentials', async t => {
  const engine = Object.create(GalxAuthEngine.prototype) as GalxAuthEngine;
  const originalEngine = GalxAuthEngine.getInstance;
  const originalRepo = ImageLibraryRepository.getInstance;
  const reads: Array<{ userId: string; favorite: boolean | undefined }> = [];
  const writes: string[] = [];
  const secret = 'PRIVATE_IMAGE_AUTH_DIAGNOSTIC';
  const record = { id: 'owned-image', userId: 'verified-user', sessionId: 'session-1', status: 'completed',
    prompt: 'A blue lake', model: secret, aspectRatio: '1:1', dimensions: '1024x1024', quality: 'standard',
    isFavorite: true, tags: [], createdAt: '2026-09-12T00:00:00Z', updatedAt: '2026-09-12T00:00:00Z',
    r2Key: secret, metadata: { private: secret }, publicUrl: `https://private.example/${secret}` };
  GalxAuthEngine.getInstance = () => engine;
  ImageLibraryRepository.getInstance = () => ({
    getLibrary: async (userId: string, options: { isFavorite?: boolean }) => {
      assert.equal(userId, 'verified-user');
      reads.push({ userId, favorite: options.isFavorite });
      return { records: [record], totalCount: 1, nextCursor: null, availableSessions: [],
        stats: { totalImages: 1, totalBytes: 100, favoriteCount: 1, sessionCount: 1, aspectRatios: { '1:1': 1 } } };
    },
    getAsset: async (userId: string, id: string) => userId === record.userId && id === record.id ? record : null,
    toggleFavorite: async (userId: string, id: string) => {
      assert.equal(userId, 'verified-user');
      if (id !== record.id) return null;
      writes.push(userId);
      return record;
    },
  }) as any;
  const headers = { authorization: `Bearer ${forged}`, 'content-type': 'application/json' };
  const params = (assetId: string) => ({ params: Promise.resolve({ assetId }) });
  try {
    for (const credential of ['', 'sb_publishable_test_only']) {
      await t.test(credential ? 'legacy public key is never elevated' : 'no service role configured', async () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = credential;
        resetSupabaseClients();
        assert.throws(() => getSupabaseAdmin(), /admin client requires/);
        const auth = getSupabaseAuthClient().auth;
        const original = auth.getUser;
        let rejected = false;
        auth.getUser = async token => {
          assert.equal(token, forged);
          return rejected ? { data: { user: null }, error: Object.assign(new Error(secret), { status: 401 }) } as any
            : { data: { user: { id: 'verified-user' } }, error: null } as any;
        };
        try {
          assert.equal((await library(new NextRequest('https://galx.ai/api/images/library?userId=attacker-chosen', { headers }))).status, 400);
          for (const query of ['', '?isFavorite=true']) {
            const response = await library(new NextRequest(`https://galx.ai/api/images/library${query}`, { headers }));
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('cache-control'), 'private, no-store');
            const raw = await response.text();
            assert(!raw.includes(secret));
            const body = JSON.parse(raw);
            assert.equal(body.userId, 'verified-user');
            assert.equal(body.records[0].id, 'owned-image');
            assert.equal(body.records[0].r2Key, undefined);
          }
          const update = await favorite(new NextRequest('https://galx.ai/api/images/library/owned-image', {
            method: 'PATCH', headers, body: JSON.stringify({ isFavorite: true, userId: 'attacker-chosen' }),
          }), params('owned-image'));
          assert.equal(update.status, 200);
          assert(!(await update.text()).includes(secret));
          assert.equal((await asset(new NextRequest('https://galx.ai/api/images/library/foreign-image', { headers }), params('foreign-image'))).status, 404);
          assert.equal((await favorite(new NextRequest('https://galx.ai/api/images/library/foreign-image', {
            method: 'PATCH', headers, body: JSON.stringify({ isFavorite: true }),
          }), params('foreign-image'))).status, 404);
          const count = reads.length;
          const writeCount = writes.length;
          rejected = true;
          const denied = await library(new NextRequest('https://galx.ai/api/images/library?isFavorite=true', { headers }));
          assert.equal(denied.status, 401);
          assert(!(await denied.text()).includes(secret));
          assert.equal((await library(new NextRequest('https://galx.ai/api/images/library'))).status, 401);
          assert.equal((await favorite(new NextRequest('https://galx.ai/api/images/library/owned-image', {
            method: 'PATCH', headers, body: JSON.stringify({ isFavorite: true }),
          }), params('owned-image'))).status, 401);
          assert.equal(reads.length, count, 'unverified requests never query the library');
          assert.equal(writes.length, writeCount, 'unverified requests never update favorites');
        } finally { auth.getUser = original; }
      });
    }
    assert.deepEqual(reads.map(read => read.favorite), [undefined, true, undefined, true]);
    assert.deepEqual(writes, ['verified-user', 'verified-user']);
  } finally {
    GalxAuthEngine.getInstance = originalEngine;
    ImageLibraryRepository.getInstance = originalRepo;
    resetSupabaseClients();
  }
});

test('database throttling cannot reject valid sessions; authentication outages are not 401s', async () => {
  const originalFetch=globalThis.fetch, originalGovernor=BroccoliAuthoritativeGovernor.getInstance;
  const originalEngine=GalxAuthEngine.getInstance;
  const engine=Object.create(GalxAuthEngine.prototype) as GalxAuthEngine;
  GalxAuthEngine.getInstance=()=>engine;
  BroccoliAuthoritativeGovernor.getInstance=()=>({canExecuteOutboundQuery:()=>false}) as any;
  let authStatus=200, requests=0;
  globalThis.fetch=async (input,init)=>{
    requests++;
    assert(String(input).includes('/auth/v1/user')); assert(init?.signal);
    return new Response(JSON.stringify(authStatus===200?{id:'verified-user',aud:'authenticated',role:'authenticated'}:{code:'test_error',msg:'PRIVATE_AUTH_OUTAGE'}),{status:authStatus,headers:{'Content-Type':'application/json'}});
  };
  resetSupabaseClients();
  try {
    assert.equal((await engine.resolveAuthIdentity(request(forged))).userId,'verified-user'); assert.equal(requests,1);
    for(const status of [503,429]) {
      authStatus=status;
      const identity=await engine.resolveAuthIdentity(request(forged));
      assert.equal(identity.authenticated,false); assert.equal(identity.error,'AUTH_UNAVAILABLE');
      const response=await library(new NextRequest('https://galx.ai/api/images/library',{headers:{authorization:`Bearer ${forged}`}}));
      assert.equal(response.status,503); assert(!(await response.text()).includes('PRIVATE_AUTH_OUTAGE'));
    }
    authStatus=401;
    assert.equal((await library(new NextRequest('https://galx.ai/api/images/library',{headers:{authorization:`Bearer ${forged}`}}))).status,401);
  } finally { globalThis.fetch=originalFetch;BroccoliAuthoritativeGovernor.getInstance=originalGovernor;GalxAuthEngine.getInstance=originalEngine;resetSupabaseClients(); }
});
