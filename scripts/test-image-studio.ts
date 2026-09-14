import test from 'node:test';
import assert from 'node:assert/strict';
import { readPendingGenerations, generationStatusFailure, MAX_ACTIVE_GENERATIONS, appendCreations, generationBody, readGeneration, readLibrary, readPending, readSettings, safeImageUrl, studioError } from '../src/components/images/studio-contract';

test('studio accepts owned raster artifacts and rejects remote, active, and malformed URLs', () => {
  for (const value of ['https://evil.test/image.png', '//evil.test/image.png', 'javascript:alert(1)', 'data:image/svg+xml;base64,AAAA',
    'https://galx.ai@evil.test/v1/images/assets/token', '/v1/images/assets/../../api/private', '/v1/images/assets/token?x=y',
    'https://galx.ai/v1/images/assets/token#private', null, {}, 4]) assert.equal(safeImageUrl(value), null);
  assert.equal(safeImageUrl('https://galx.ai/v1/images/assets/opaque.token'), '/v1/images/assets/opaque.token');
  assert.equal(safeImageUrl('/v1/images/assets/opaque_token'), '/v1/images/assets/opaque_token');
  assert.equal(safeImageUrl('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
});
test('library projection discards unexpected fields, unsafe URLs, and invalid dates', () => {
  const record = { id: 'image-1', publicUrl: 'https://galx.ai/v1/images/assets/token', prompt: 'A blue vase', status: 'completed',
    model: 'private-model', shardId: 'private-shard', r2Key: 'private-storage', quality: 'secret', createdAt: 'invalid', aspectRatio: 'bad', internal: { secret: 'hidden' } };
  const result = readLibrary({ success: true, total: 2, nextCursor: 'next', records: [record, { ...record, publicUrl: 'https://evil.test/image.png' }] });
  assert.equal(result.images.length, 1);
  assert.deepEqual(Object.keys(result.images[0]).sort(), ['createdAt','detailsLoaded','favorite','id','prompt','quality','ratio','saved','thumbnailUrl','url']);
  assert.equal(result.images[0].createdAt, '');
  assert.equal(result.images[0].ratio, '1:1');
  assert.doesNotMatch(JSON.stringify(result), /private-|secret|hidden/);
  assert.throws(() => readLibrary({ success: true, records: {} }));
});
test('generation output is projected and never renders upstream messages or malformed artifacts', () => {
  const settings = readSettings({ prompt: 'A vase', quality: 'hd', ratio: '3:2', count: 2 });
  const images = readGeneration({ data: [{ b64_json: 'iVBORw0KGgo=', revised_prompt: 'private secret' }], private: 'secret' }, settings, 'receipt');
  assert.equal(images[0].prompt, 'A vase');
  assert.equal(images[0].url, 'data:image/png;base64,iVBORw0KGgo=');
  assert.doesNotMatch(JSON.stringify(images), /private|secret/);
  for (const value of [{ data: [] }, { data: [{ b64_json: 'PHN2Zz4=' }] }, { data: [{ url: 'https://evil.test/asset' }] }, { data: Array(5).fill({}) }]) assert.throws(() => readGeneration(value, settings, 'receipt'));
});
test('draft and receipt recovery restrict settings and construct a minimal request', () => {
  const settings = readSettings({ prompt: '  A vase  ', ratio: '3:2', quality: 'hd', count: 2, secret: 'not-public' });
  assert.deepEqual(generationBody(settings), { model: 'openai-gpt-image-latest', prompt: 'A vase', n: 2, size: '1536x1024', quality: 'hd', response_format: 'url' });
  assert.equal(readSettings({ count: 100, quality: 'ultra', ratio: '100:1' }).count, 1);
  assert.equal(readSettings({ prompt: 'a'.repeat(40_000) }).prompt.length, 32_000);
  assert.equal(readPending({ id: '../api/private', startedAt: Date.now(), settings }), null);
  assert.equal(readPending({ id: 'receipt', startedAt: Infinity, settings }), null);
  assert.deepEqual(readPending({ id: 'receipt', startedAt: 123, settings, private: true }), { id: 'receipt', startedAt: 123, settings });
});

test('the session gallery accumulates completed batches and deduplicates repeated receipts without losing distinct images', () => {
  const first = readGeneration({ data: [{ b64_json: 'iVBORw0KGgo=' }, { b64_json: 'iVBORw0KGgo=' }] }, readSettings({ prompt: 'First batch', count: 2 }), 'first');
  const second = readGeneration({ data: [{ b64_json: 'iVBORw0KGgo=' }] }, readSettings({ prompt: 'Second batch' }), 'second');
  const gallery = appendCreations([], first);
  const combined = appendCreations(gallery, [...first, ...second, ...second]);
  assert.deepEqual(combined.map(image => image.id), ['first-0', 'first-1', 'second-0']);
  assert.deepEqual(gallery, first, 'completion does not mutate the previous gallery');
  assert.deepEqual(appendCreations(combined, first), combined, 'recovering an already observed receipt does not add cards');
});


test('permission denial never tells an authenticated user to sign in again', () => {
  assert.match(studioError(401), /Sign in again/);
  for (const status of [403, 429, 500, 503]) assert.doesNotMatch(studioError(status), /expired|sign in/i);
  assert.match(studioError(403), /account/);
});

test('time estimation and progress calculation provide predictable bounds and phases', async () => {
  const { estimateGenerationSeconds, calculateGenerationProgress } = await import('../src/components/images/studio-contract');
  const standardEstimate = estimateGenerationSeconds({ prompt: 'test', ratio: '1:1', quality: 'standard', count: 1 });
  const hdEstimate = estimateGenerationSeconds({ prompt: 'test', ratio: '16:9', quality: 'hd', count: 2 });
  assert(standardEstimate >= 14 && standardEstimate <= 16);
  assert(hdEstimate > standardEstimate);

  const start = calculateGenerationProgress(1, standardEstimate, 'queued');
  assert.equal(start.phase.key, 'queued');
  assert(start.percent >= 5 && start.percent <= 20);
  assert.equal(start.remainingSeconds, standardEstimate - 1);

  const mid = calculateGenerationProgress(5, standardEstimate);
  assert.equal(mid.phase.key, 'synthesizing');
  assert(mid.percent > start.percent && mid.percent < 90);

  const late = calculateGenerationProgress(standardEstimate + 5, standardEstimate);
  assert(late.percent >= 92 && late.percent <= 98);
  assert.equal(late.remainingSeconds, 0);
  assert.match(late.statusText, /almost ready/i);
});



test('status retrieval retries transient errors without treating them as generation rejection', () => {
  for (const status of [408, 429, 500, 502, 503, 504]) assert.equal(generationStatusFailure(status, {error:{message:'private diagnostic'}}), 'retry');
  assert.equal(generationStatusFailure(503, {error:{code:'generation_not_started'}}), 'not-started');
  assert.equal(generationStatusFailure(502, {error:{code:'generation_failed'}}), 'unconfirmed');
  assert.equal(generationStatusFailure(401, {}), 'auth');
  assert.equal(generationStatusFailure(404, {}), 'unconfirmed');
  assert.equal(generationStatusFailure(200, {error:{code:'generation_not_started'}}), 'retry');
});
test('reload retains bounded independent requests including paused uncertain outcomes', () => {
  const tasks = Array.from({length:12}, (_,i) => ({id:`task-${i}`,startedAt:123,settings:{prompt:`Prompt ${i}`},paused:true,internal:'secret'}));
  const restored=readPendingGenerations(tasks);
  assert.equal(restored.length,MAX_ACTIVE_GENERATIONS);
  assert.equal(restored[0].paused,true);
  assert.doesNotMatch(JSON.stringify(restored), /secret|internal/);
  assert.equal(readPendingGenerations([tasks[0],tasks[0]]).length,1);
  assert.equal(readPendingGenerations(tasks[0]).length,1);
  assert.deepEqual(readPendingGenerations(null),[]);
});
