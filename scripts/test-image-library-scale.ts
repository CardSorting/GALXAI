import test from 'node:test';
import assert from 'node:assert/strict';
import { BroccoliBoundedCache, BroccoliReadBusy, BroccoliReadCoordinator } from '../src/core/broccolidb/broccolidb-bounded-cache';
import { BroccoliImageLibraryBuffer } from '../src/core/broccolidb/BroccoliImageLibraryBuffer';
import { appendCreations, readImageDetail, readLibrary, RECENT_IMAGE_LIMIT, type StudioImage } from '../src/components/images/studio-contract';
import { decodeLibraryCursor, encodeLibraryCursor, readImageLibraryQuery, InvalidImageLibraryQuery } from '../src/lib/images/library-cursor';
import { readBoundedObjectBody } from '../src/core/storage/bounded-object-body';
import { GalxUnifiedR2StorageManager } from '../src/core/storage/GalxUnifiedR2StorageManager';
import { gzipSync } from 'node:zlib';

const row = (id: string): StudioImage => ({ id, url: `/v1/images/assets/${id}`, prompt: `Image ${id}`, ratio: '1:1', quality: 'standard', createdAt: '', favorite: false, saved: false });
test('10000 completions retain a bounded recent working set and an explicit selection', () => {
  let images: StudioImage[] = [];
  for (let n = 0; n < 10000; n += 4) images = appendCreations(images, Array.from({ length: 4 }, (_, index) => row(String(n + index))), '0');
  assert.equal(images.length, RECENT_IMAGE_LIMIT); assert.equal(images[0].id, '0'); assert.equal(images.at(-1)?.id, '9999');
  assert(Buffer.byteLength(JSON.stringify(images)) < 100000);
  const huge = { ...row('large'), prompt: 'p'.repeat(32000), url: 'data:image/png;base64,' + 'a'.repeat(4000000) };
  images = appendCreations([], Array.from({ length: 30 }, (_, n) => ({ ...huge, id: `large-${n}` })));
  assert(images.length <= 2); assert.equal(images.at(-1)?.id, 'large-29');
});
test('card metadata stays bounded; detail parsing cannot reuse a truncated prompt or foreign id', () => {
  const record = { id: 'one', status: 'completed', promptPreview: 'preview', publicUrl: '/v1/images/assets/token' };
  const image = readLibrary({ success: true, records: [record] }).images[0];
  assert.equal(image.detailsLoaded, false); assert.equal(image.thumbnailUrl, '/v1/images/assets/token/thumbnail');
  assert.throws(() => readImageDetail({ success: true, record }, 'one'));
  assert.throws(() => readImageDetail({ success: true, record: { ...record, prompt: 'Full' } }, 'other'));
  assert.equal(readImageDetail({ success: true, record: { ...record, prompt: 'Full' } }, 'one').prompt, 'Full');
  assert.throws(() => readLibrary({ success: true, records: Array(10000).fill(record) }));
});
test('LRU cache bounds serialized bytes, entries, indices, expiry and oversized replacements', () => {
  let now = 0;
  const cache = new BroccoliBoundedCache<{ owner: string; value: string }>('fixture', { entries: 3, bytes: 100, ttlMs: 10 }, () => now);
  cache.table.createIndex('owner');
  for (let n = 0; n < 10000; n++) cache.put(String(n), { owner: String(n), value: 'test' });
  assert(cache.size <= 3); assert(cache.retainedBytes <= 100); assert.equal(cache.table.query({ where: { owner: '0' } }).length, 0);
  const recent = '9999'; assert(cache.get(recent));
  cache.put('extra', { owner: 'extra', value: 'test' }); assert(cache.get(recent));
  assert.equal(cache.put(recent, { owner: 'extra', value: 'x'.repeat(101) }), false);
  now = 11; assert.equal(cache.size, 0); assert.equal(cache.retainedBytes, 0); assert.equal(cache.table.count(), 0);
});
test('100 identical reads coalesce; unrelated reads have bounded concurrency and overload recovery', async () => {
  const reads = new BroccoliReadCoordinator(2, 4);
  let release!: () => void, calls = 0, active = 0, maximum = 0;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const work = async () => { calls++; maximum = Math.max(maximum, ++active); await barrier; active--; return 42; };
  const same = Array.from({ length: 100 }, () => reads.run('same', work));
  const rest = [reads.run('two', work), reads.run('three', work), reads.run('four', work)];
  await assert.rejects(reads.run('overflow', work), BroccoliReadBusy);
  release(); assert((await Promise.all([...same, ...rest])).every(value => value === 42));
  assert.equal(calls, 4); assert.equal(maximum, 2);
  await assert.rejects(reads.run('failure', async () => { throw new Error('failure'); }));
  assert.equal(await reads.run('recovered', async () => 7), 7);
});
test('page cache coalesces actual repository calls and failed reads never become empty success', async () => {
  const buffer = new (BroccoliImageLibraryBuffer as any)();
  let calls = 0;
  const page = { records: [], stats: null, totalCount: null, availableSessions: [], nextCursor: null };
  buffer.queryAuthoritativePage = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return page; };
  await Promise.all(Array.from({ length: 100 }, () => buffer.queryLibrary('owner', { includeSummary: false })));
  assert.equal(calls, 1);
  buffer.queryAuthoritativePage = async () => null;
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try { await assert.rejects(buffer.queryLibrary('uncached-owner', { includeSummary: false }), /unavailable/); }
  finally { process.env.NODE_ENV = previous; }
});
test('pending-write pressure never evicts unsaved records and stale reads cannot refill invalidated pages', async () => {
  const buffer = new (BroccoliImageLibraryBuffer as any)();
  buffer.flushBatch = async () => 0;
  for (let n = 0; n < 128; n++) buffer.enqueueRecord({ id: String(n), userId: 'owner', createdAt: '', prompt: 'test' });
  assert.throws(() => buffer.enqueueRecord({ id: 'overflow', userId: 'owner' }), /capacity/);
  assert.equal(buffer.writeQueue.size, 128); assert.equal(buffer.writeQueue.get('0').prompt, 'test');
  let release!: () => void;
  buffer.queryAuthoritativePage = () => new Promise(resolve => { release = () => resolve({ records: [], stats: null, totalCount: null, availableSessions: [], nextCursor: null }); });
  const pending = buffer.queryLibrary('other', { includeSummary: false });
  buffer.invalidateUserQueryCache('other'); release(); await pending;
  assert.equal(buffer.queryPageCache.size, 0);
  clearTimeout(buffer.flushTimer);
});
test('cursor validation preserves microseconds and rejects malformed, changed-scope and excessive queries', () => {
  const cursor = { createdAt: '2026-09-01T00:00:00.123456+00:00', id: 'image', scope: 'owner-and-filter' };
  assert.equal(decodeLibraryCursor(encodeLibraryCursor(cursor), cursor.scope)?.createdAt, cursor.createdAt);
  assert.throws(() => decodeLibraryCursor(encodeLibraryCursor(cursor), 'foreign'), InvalidImageLibraryQuery);
  for (const query of ['limit=10000','limit=-1','limit=NaN','sort=random','summary=private','isFavorite=yes','cursor=bad','limit=36&limit=4','userId=foreign',`search=${'x'.repeat(201)}`]) {
    assert.throws(() => readImageLibraryQuery(new URLSearchParams(query)), InvalidImageLibraryQuery, query);
  }
});

test('storage bodies stop on byte overflow or abort instead of retaining an unbounded stream', async () => {
  let cancelled = false;
  const oversized = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(10)); }, cancel() { cancelled = true; } });
  await assert.rejects(readBoundedObjectBody(oversized, { maxBytes: 16, signal: new AbortController().signal }), /limit/);
  assert(cancelled);
  const controller = new AbortController(); cancelled = false;
  const stalled = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const pending = readBoundedObjectBody(stalled, { maxBytes: 16, signal: controller.signal });
  controller.abort(); await assert.rejects(pending); assert(cancelled);
  assert.equal((await readBoundedObjectBody(new Response('valid').body, { maxBytes: 5, signal: new AbortController().signal })).toString(), 'valid');
});

test('expired queued reads never start later and release admission for recovery', async () => {
  const reads = new BroccoliReadCoordinator(1, 2, 5);
  let release!: () => void, called = false;
  const active = reads.run('active', () => new Promise<void>(resolve => { release = resolve; }));
  await assert.rejects(reads.run('queued', async () => { called = true; }), BroccoliReadBusy);
  release(); await active; assert.equal(called, false);
  assert.equal(await reads.run('recovery', async () => 'ready'), 'ready');
});

test('bounded storage accepts HTTP-decoded gzip but rejects expansion bombs and oversized cache hits', async () => {
  const manager = new (GalxUnifiedR2StorageManager as any)();
  manager.resolveBucket = () => ({ bucketName: 'isolated-fixture' }); manager.isConfigured = () => true;
  const bounds = { maxBytes: 16, signal: new AbortController().signal };
  manager.executeSigV4Get = async () => ({ data: Buffer.from('already decoded'), isGzipped: true, contentType: 'image/webp' });
  assert.equal((await manager.getObject('images', 'decoded', false, bounds)).data.toString(), 'already decoded');
  await assert.rejects(manager.getObject('images', 'decoded', true, { ...bounds, maxBytes: 4 }), /limit/);
  manager.executeSigV4Get = async () => ({ data: gzipSync('x'.repeat(10000)), isGzipped: true, contentType: 'image/webp' });
  await assert.rejects(manager.getObject('images', 'bomb', false, bounds));
});
