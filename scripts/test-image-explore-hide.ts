import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { handleExploreHideMutation } from '../src/lib/images/explore-hide';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const endpoint = 'https://galx.ai/api/images/moderate';
const request = (headers: Record<string, string> = {}) => new NextRequest(endpoint, {
  method: 'POST',
  headers: { origin: 'https://galx.ai', 'content-type': 'application/json', ...headers },
});

test('Explore hide requires a signed-in account before touching the database', async () => {
  const original = GalxAuthEngine.getInstance;
  let queryCalls = 0;
  GalxAuthEngine.getInstance = () => ({
    resolveAuthIdentity: async () => ({
      authenticated: false,
      userId: 'anonymous_developer',
      authType: 'anonymous',
      isPriorityUser: false,
    }),
  }) as any;
  try {
    const response = await handleExploreHideMutation(
      request(),
      { action: 'hide', assetId: 'image-1' },
      (async () => { queryCalls++; return { rows: [] }; }) as any,
    );
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      success: false,
      error: 'Sign in to hide creations from your Explore feed.',
    });
    assert.equal(queryCalls, 0);
  } finally {
    GalxAuthEngine.getInstance = original;
  }
});

test('Explore hide uses the verified viewer, returns an allowlisted DTO, and supports undo', async () => {
  const original = GalxAuthEngine.getInstance;
  const calls: Array<{ query: string; params: unknown[] }> = [];
  GalxAuthEngine.getInstance = () => ({
    resolveAuthIdentity: async () => ({
      authenticated: true,
      userId: 'viewer-1',
      authType: 'session_token',
      isPriorityUser: false,
    }),
  }) as any;
  const query = async <T,>(text: string, params: unknown[]) => {
    calls.push({ query: text, params });
    return { rows: [{ result: { success: true, state: params[2] ? 'hidden' : 'visible', internal_count: 99 } }] } as any as { rows: T[] };
  };
  try {
    const hidden = await handleExploreHideMutation(request(), { action: 'hide', assetId: 'image-1' }, query as any);
    assert.equal(hidden.status, 200);
    assert.deepEqual(await hidden.json(), { success: true, action: 'hidden_for_you', assetId: 'image-1' });
    const restored = await handleExploreHideMutation(request(), { action: 'unhide', assetId: 'image-1' }, query as any);
    assert.equal(restored.status, 200);
    assert.deepEqual(await restored.json(), { success: true, action: 'visible_for_you', assetId: 'image-1' });
    assert.deepEqual(calls.map((call) => call.params), [
      ['viewer-1', 'image-1', true],
      ['viewer-1', 'image-1', false],
    ]);
    assert.match(calls[0].query, /fn_set_image_explore_hide/);
  } finally {
    GalxAuthEngine.getInstance = original;
  }
});

test('hide rate and account-cap responses stay generic and retryable', async () => {
  const original = GalxAuthEngine.getInstance;
  GalxAuthEngine.getInstance = () => ({
    resolveAuthIdentity: async () => ({
      authenticated: true,
      userId: 'viewer-1',
      authType: 'session_token',
      isPriorityUser: false,
    }),
  }) as any;
  try {
    const rateLimited = await handleExploreHideMutation(
      request(),
      { action: 'hide', assetId: 'image-2' },
      (async () => ({ rows: [{ result: { success: false, code: 'rate_limited', retry_after_seconds: 42, private_counter: 7 } }] })) as any,
    );
    assert.equal(rateLimited.status, 429);
    assert.equal(rateLimited.headers.get('retry-after'), '42');
    assert.deepEqual(await rateLimited.json(), {
      success: false,
      error: 'You’re hiding creations quickly. Try again in a few minutes.',
    });

    const capped = await handleExploreHideMutation(
      request(),
      { action: 'hide', assetId: 'image-3' },
      (async () => ({ rows: [{ result: { success: false, code: 'hide_limit', active_count: 500 } }] })) as any,
    );
    assert.equal(capped.status, 409);
    assert.deepEqual(await capped.json(), {
      success: false,
      error: 'Your hidden list is full. Undo a few hides to make room.',
    });
  } finally {
    GalxAuthEngine.getInstance = original;
  }
});

test('the schema closes the old global/anonymous moderation path and bounds personal hides', () => {
  const migration = readFileSync(resolve('supabase/migrations/20260920120000_personal_explore_hide_controls.sql'), 'utf8');
  const privilegeRepair = readFileSync(resolve('supabase/migrations/20260920123000_personal_explore_hide_privilege_repair.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.user_image_explore_hides/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.user_image_explore_hide_limits/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.user_image_explore_hide_limits FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.user_image_explore_hides FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.fn_moderate_hide_community_image/);
  assert.match(migration, /pg_try_advisory_xact_lock/);
  assert.match(migration, /v_active_count >= 500/);
  assert.match(migration, /v_burst_count >= 30/);
  assert.match(migration, /v_daily_count >= 200/);
  assert.match(migration, /burst_count = burst_count \+ 1/);
  assert.match(migration, /daily_count = daily_count \+ 1/);
  assert.match(migration, /does not decrement the abuse ledger/);
  assert.match(migration, /state', 'hidden_client/);
  assert.match(privilegeRepair, /REVOKE ALL ON TABLE public\.user_image_explore_hides\s+FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(privilegeRepair, /GRANT SELECT, INSERT, DELETE ON TABLE public\.user_image_explore_hides TO service_role/);
  assert.match(privilegeRepair, /REVOKE ALL ON TABLE public\.user_image_explore_hide_limits/);
  assert.match(privilegeRepair, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.user_image_explore_hide_limits TO service_role/);
  assert.match(privilegeRepair, /REVOKE ALL ON FUNCTION public\.fn_moderate_hide_community_image/);
});
