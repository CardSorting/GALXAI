import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRegistryApiPageReader, registryPage, RegistryApiUnavailableError } from '../src/relay/registry-api-reader';
import { RegistryEgressGuard, RegistryEgressLimitError } from '../src/relay/registry-egress-guard';
import { REGISTRY_COLUMNS, ShardRegistrySync, readRegistryApiDelta, type RegistryRow } from '../src/relay/shard-registry-sync';
import { ShardProjectionReader } from '../src/lib/supabase/repositories/ShardProjectionReader';

const source = Array.from({ length: 56 }, (_, index) => ({
  ...Object.fromEntries(REGISTRY_COLUMNS.map(column => [column, null])), id: `shard-${index}`,
  user_id: 'owner', registry_revision: 1, created_at: '2026-09-09', encrypted_ciphertext: 'cipher'.repeat(100),
})) as RegistryRow[];

function fixtureFetch(onFetch: () => void, pageCap = 64): typeof fetch {
  return async (input, init) => {
    onFetch();
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://fixture.invalid');
    assert.equal(new Headers(init?.headers).get('prefer'), 'count=exact');
    assert.equal(new Headers(init?.headers).get('authorization'), null, 'opaque secret keys are not JWT bearer tokens');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.cache, 'no-store');
    const ids = url.searchParams.get('id');
    const matching = ids ? source.filter(row => (JSON.parse(`[${ids.slice(4, -1)}]`) as string[]).includes(row.id)) : source;
    const offset = Number(url.searchParams.get('offset'));
    const batch = matching.slice(offset, offset + pageCap).map(row =>
      Object.fromEntries(url.searchParams.get('select')!.split(',').map(column => [column, row[column]])));
    return Response.json(batch, { headers: { 'content-range': batch.length
      ? `${offset}-${offset + batch.length - 1}/${matching.length}` : `*/${matching.length}` } });
  };
}

test('each physical REST page consumes a permit; exact ranges keep cold/warm reads within budget', async () => {
  let now = 100_000, requests = 0;
  const guard = new RegistryEgressGuard({ now: () => now });
  const sync = new ShardRegistrySync(known => readRegistryApiDelta(known,
    createRegistryApiPageReader(guard, { url: 'https://fixture.invalid', key: 'sb_secret_fixture',
      fetch: fixtureFetch(() => requests++) })));
  assert.equal((await sync.read()).length, 56);
  assert.equal(requests, 4, 'one manifest, two changed-ID pages, one confirmation');
  assert.equal(guard.snapshot().requests, requests);
  await assert.rejects(sync.read(), RegistryEgressLimitError);
  assert.equal(requests, 4, 'budget rejection precedes fetch');
  now += 6000;
  assert.equal((await sync.read()).length, 56);
  assert.equal(requests, 6, 'an unchanged poll needs only two exact manifests');
  assert.equal(guard.snapshot().requests, requests);
});

test('server page caps cannot bypass the physical request burst', async () => {
  let requests = 0;
  const guard = new RegistryEgressGuard({ now: () => 1 });
  await assert.rejects(readRegistryApiDelta(new Map(), createRegistryApiPageReader(guard, {
    url: 'https://fixture.invalid', key: 'sb_secret_fixture', fetch: fixtureFetch(() => requests++, 1),
  })), RegistryEgressLimitError);
  assert.equal(requests, 4);
  assert.equal(guard.snapshot().requests, 4);
});

test('the cumulative snapshot byte ceiling does not reset between pages', async () => {
  let requests = 0;
  const guard = new RegistryEgressGuard({ now: () => 1, policy: { maxResponseBytes: 8192, burstBytes: 65536 } });
  const page = createRegistryApiPageReader(guard, { url: 'https://fixture.invalid', key: 'sb_secret_fixture',
    fetch: async () => { requests++; return Response.json([{ id: 'a', data: 'x'.repeat(4500) }]); } });
  await page('id,data', 0);
  await assert.rejects(page('id,data', 1), RegistryEgressLimitError);
  assert.equal(requests, 1, 'remaining snapshot allowance is checked before another origin request');
});

test('only consistent exact ranges prove EOF, including zero-row responses', () => {
  assert.equal(registryPage([{ id: 'a' }], '0-0/2', 0).complete, false);
  assert.equal(registryPage([{ id: 'b' }], '1-1/2', 1).complete, true);
  assert.equal(registryPage([{ id: 'a' }], '0-0/*', 0).complete, false);
  assert.equal(registryPage([{ id: 'a' }], null, 0).complete, false);
  assert.equal(registryPage([], '*/0', 0).complete, true);
  for (const range of ['1-1/2', '0-2/3', '*/1', '0-0/0', 'invalid', '0-0/2049']) {
    assert.throws(() => registryPage([{ id: 'a' }], range, 0), /range|budget/);
  }
  assert.throws(() => registryPage([], '*/1', 0), /range/);
});

test('the snapshot deadline spans pages rather than restarting per request', async () => {
  let requests = 0;
  const page = createRegistryApiPageReader(new RegistryEgressGuard(), {
    url: 'https://fixture.invalid', key: 'sb_secret_fixture', timeoutMs: 5,
    fetch: async () => { requests++; return Response.json([]); },
  });
  await page('id', 0);
  await new Promise(resolve => setTimeout(resolve, 15));
  await assert.rejects(page('id', 1), { name: 'TimeoutError' });
  assert.equal(requests, 1);
});

test('429 Retry-After is retained, errors are cancelled and upstream diagnostics stay private', async t => {
  const now = 2_000_000; t.mock.method(Date, 'now', () => now);
  for (const header of ['120', new Date(now + 120_000).toUTCString()]) {
    let cancelled = false;
    const page = createRegistryApiPageReader(new RegistryEgressGuard(), { url: 'https://fixture.invalid', key: 'sb_secret_fixture',
      fetch: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }),
        { status: 429, headers: { 'retry-after': header } }),
    });
    await assert.rejects(page('id', 0), error => error instanceof RegistryApiUnavailableError && error.retryAtMs === now + 120_000);
    assert(cancelled);
  }
});

test('a stalled response body is cancelled by the same snapshot deadline', async () => {
  let cancelled = false;
  const page = createRegistryApiPageReader(new RegistryEgressGuard(), { url: 'https://fixture.invalid',
    key: 'sb_secret_fixture', timeoutMs: 5,
    fetch: async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('[')); },
      cancel() { cancelled = true; },
    })),
  });
  await Promise.all([assert.rejects(page('id', 0), { name: 'TimeoutError' }),
    new Promise(resolve => setTimeout(resolve, 15))]);
  assert(cancelled);
});

const config = () => ({ databaseUrl: undefined, supabaseUrl: 'https://fixture.invalid',
  supabaseAnonKey: '', supabaseServiceRoleKey: 'sb_secret_fixture', hasAdminCredential: true,
  hasDataApiCredential: true, isConfigured: true, poolSize: 1, requestTimeoutMs: 5000 });

test('one failed coalesced read has one backoff; retry hints suppress all owner-scope traffic', async t => {
  let now = 10_000, requests = 0, status = 503;
  t.mock.method(Date, 'now', () => now);
  const reader = new ShardProjectionReader({ config, guard: new RegistryEgressGuard({ now: () => now }),
    fetch: async () => {
      requests++;
      return status === 200 ? Response.json([], { headers: { 'content-range': '*/0' } })
        : new Response(null, { status, headers: status === 429 ? { 'retry-after': '120' } : {} });
    },
  });
  await Promise.all(Array.from({ length: 40 }, () => assert.rejects(reader.read('owner'))));
  assert.equal(requests, 1);
  await assert.rejects(reader.read('other-owner'), /backing off/);
  assert.equal(requests, 1);
  now += 1000; status = 200;
  assert.deepEqual(await reader.read('owner'), [], 'coalesced errors did not multiply a one-second backoff');
  now += 6000; status = 429;
  await assert.rejects(reader.read('owner'), RegistryApiUnavailableError);
  const before = requests;
  now += 119_000;
  await assert.rejects(reader.read('other-owner'), /backing off/);
  assert.equal(requests, before);
  now += 1000; status = 200;
  assert.deepEqual(await reader.read('other-owner'), []);
});

test('unmeasured successful operations do not refund unknown egress', async () => {
  const guard = new RegistryEgressGuard({ now: () => 1 });
  await guard.run(async () => 'unmeasured');
  assert.equal(guard.snapshot().accountedBytes, 256 * 1024 + 1024);
  await guard.run(async (_, charge) => charge(0), { maxResponseBytes: 4096 });
  assert.equal(guard.snapshot().accountedBytes, 256 * 1024 + 2048);
});

test('a late success from another owner cannot erase an origin Retry-After', async t => {
  let requests = 0, now = 100_000;
  t.mock.method(Date, 'now', () => now);
  let release!: (response: Response) => void, confirmStarted!: () => void;
  const started = new Promise<void>(resolve => { confirmStarted = resolve; });
  const reader = new ShardProjectionReader({ config,
    guard: new RegistryEgressGuard({ now: () => now, policy: { burstBytes: 4 * 1024 * 1024, requestBurst: 12 } }),
    fetch: async input => {
      requests++;
      if (new URL(String(input)).searchParams.get('user_id') === 'eq.limited') {
        return new Response(null, { status: 429, headers: { 'retry-after': '120' } });
      }
      if (requests === 2) return new Promise<Response>(resolve => { release = resolve; confirmStarted(); });
      return Response.json([], { headers: { 'content-range': '*/0' } });
    },
  });
  const pending = reader.read('slow');
  await started;
  await assert.rejects(reader.read('limited'), RegistryApiUnavailableError);
  release(Response.json([], { headers: { 'content-range': '*/0' } }));
  assert.deepEqual(await pending, []);
  await assert.rejects(reader.read('another'), /backing off/);
  assert.equal(requests, 3);
  now += 120_000;
  assert.deepEqual(await reader.read('another'), []);
});
