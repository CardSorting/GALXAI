import test from 'node:test';
import assert from 'node:assert/strict';
import { generationBody, readGeneration, readLibrary, readPending, readSettings, safeImageUrl } from '../src/components/images/studio-contract';

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
  assert.deepEqual(Object.keys(result.images[0]).sort(), ['createdAt','favorite','id','prompt','quality','ratio','saved','url']);
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
