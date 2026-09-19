import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '../src/app/api/account/profile/route';
import {
  AccountProfileConflictError,
  AccountProfileRepository,
} from '../src/lib/supabase/repositories/AccountProfileRepository';
import { resetSupabaseClients } from '../src/lib/supabase/client';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_profile_fixture';

const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwcm9maWxlLW93bmVyIn0.profile-fixture-signature';
const user = { id: 'profile-owner', email: 'owner@example.test', email_confirmed_at: '2026-09-19' };

function request(method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('https://galx.ai/api/account/profile', {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function json(response: Response) {
  return { body: await response.json(), response };
}

test('profile HTTP contract authenticates the verified owner and returns only the product DTO', async () => {
  const originalFetch = globalThis.fetch;
  const originalGetInstance = AccountProfileRepository.getInstance;
  const calls: Array<Record<string, unknown>> = [];
  const profile = { displayName: 'Owner', locale: 'en', timezone: 'UTC', revision: 4 };

  AccountProfileRepository.getInstance = (() => ({
    get: async (...args: unknown[]) => {
      calls.push({ operation: 'get', args });
      return { ...profile, profileId: 'PRIVATE_PROFILE_ID', accountClass: 'human' } as any;
    },
    update: async (...args: unknown[]) => {
      calls.push({ operation: 'update', args });
      return { ...profile, revision: 5 };
    },
  })) as typeof AccountProfileRepository.getInstance;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) return Response.json(user);
    if (url.endsWith('/fn_account_session_active')) return Response.json(true);
    throw new Error(`Unexpected auth request: ${url}`);
  };
  resetSupabaseClients();

  try {
    const { body, response } = await json(await GET(request()));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(body, { profile });
    assert.equal(calls[0]?.operation, 'get');
    assert.deepEqual((calls[0]?.args as unknown[]).slice(0, 2), ['profile-owner', 'profile-owner']);

    const update = await PATCH(request('PATCH', {
      revision: 4,
      displayName: 'Updated owner',
      locale: 'es',
      timezone: 'America/Denver',
      ownerKey: 'attacker-controlled-owner',
      profileId: 'attacker-controlled-profile',
    }));
    const updateResult = await json(update);
    assert.equal(updateResult.response.status, 200);
    assert.deepEqual(updateResult.body, { profile: { ...profile, revision: 5 } });
    const updateInput = (calls[1]?.args as unknown[])[0] as Record<string, unknown>;
    assert.equal(updateInput.ownerKey, 'profile-owner');
    assert.equal(updateInput.expectedRevision, 4);
  } finally {
    globalThis.fetch = originalFetch;
    AccountProfileRepository.getInstance = originalGetInstance;
    resetSupabaseClients();
  }
});

test('profile mutations enforce same-origin intent, revision validation, and generic failure responses', async () => {
  const originalFetch = globalThis.fetch;
  const originalGetInstance = AccountProfileRepository.getInstance;
  let updates = 0;
  let mode: 'conflict' | 'failure' = 'conflict';

  AccountProfileRepository.getInstance = (() => ({
    get: async () => ({ displayName: null, locale: 'en', timezone: 'UTC', revision: 1 }),
    update: async () => {
      updates += 1;
      if (mode === 'conflict') throw new AccountProfileConflictError();
      throw new Error('PRIVATE_PROFILE_DATABASE_DIAGNOSTIC');
    },
  })) as typeof AccountProfileRepository.getInstance;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) return Response.json(user);
    if (url.endsWith('/fn_account_session_active')) return Response.json(true);
    throw new Error(`Unexpected auth request: ${url}`);
  };
  resetSupabaseClients();

  try {
    const crossSite = await PATCH(request('PATCH', { revision: 1, displayName: 'x', locale: 'en', timezone: 'UTC' }, { origin: 'https://evil.example' }));
    assert.equal(crossSite.status, 403);
    assert.equal(updates, 0);

    const invalid = await PATCH(request('PATCH', { revision: 0, displayName: 'x', locale: 'en', timezone: 'UTC' }));
    assert.equal(invalid.status, 400);
    assert.equal(updates, 0);

    const conflict = await PATCH(request('PATCH', { revision: 1, displayName: 'x', locale: 'en', timezone: 'UTC' }));
    const conflictResult = await json(conflict);
    assert.equal(conflictResult.response.status, 409);
    assert.deepEqual(conflictResult.body, { error: 'Your profile changed in another tab. Refresh and try again.' });

    mode = 'failure';
    const failure = await PATCH(request('PATCH', { revision: 1, displayName: 'x', locale: 'en', timezone: 'UTC' }));
    const failureResult = await json(failure);
    assert.equal(failureResult.response.status, 503);
    assert.deepEqual(failureResult.body, { error: 'Profile is temporarily unavailable. Try again shortly.' });
    assert.doesNotMatch(JSON.stringify(failureResult.body), /PRIVATE_PROFILE_DATABASE_DIAGNOSTIC/);
  } finally {
    globalThis.fetch = originalFetch;
    AccountProfileRepository.getInstance = originalGetInstance;
    resetSupabaseClients();
  }
});

test('anonymous profile access is rejected before the repository is called', async () => {
  const originalGetInstance = AccountProfileRepository.getInstance;
  AccountProfileRepository.getInstance = (() => ({
    get: async () => { throw new Error('Repository must not be reached'); },
    update: async () => { throw new Error('Repository must not be reached'); },
  })) as typeof AccountProfileRepository.getInstance;
  try {
    const { body, response } = await json(await GET(new NextRequest('https://galx.ai/api/account/profile')));
    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: 'Sign in again to continue.' });
  } finally {
    AccountProfileRepository.getInstance = originalGetInstance;
  }
});
