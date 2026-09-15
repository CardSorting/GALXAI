import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { generateCodexToolImage, CODEX_IMAGE_TOOL_ENDPOINT } from '../src/relay/codex-image-tool.js';

const account = { accessToken: 'fixture-token', accountId: 'fixture-account' };
const image = async () => sharp({ create: { width: 16, height: 16, channels: 3, background: '#123456' } }).png().withMetadata().toBuffer();
const signal = () => AbortSignal.timeout(5000);

test('Codex tool uses standalone Images request and returns only re-encoded pixels', async () => {
  const original = await image(); let calls = 0;
  const transport = (async (url, options) => {
    calls++; assert.equal(url, CODEX_IMAGE_TOOL_ENDPOINT);
    assert.equal(options?.method, 'POST'); assert.equal(options?.redirect, 'error');
    assert.equal(options?.signal?.aborted, false);
    const headers = new Headers(options?.headers);
    assert.equal(headers.get('authorization'), 'Bearer fixture-token');
    assert.equal(headers.get('chatgpt-account-id'), 'fixture-account');
    assert.match(headers.get('x-codex-image-turn-id')!, /^[\da-f-]{36}$/);
    assert.deepEqual(JSON.parse(options!.body as string), {
      model: 'gpt-image-2', prompt: 'bee', background: 'auto', quality: 'auto', size: 'auto',
    });
    return Response.json({ data: [{ b64_json: original.toString('base64'), generation_id: 'private-id', revised_prompt: 'private prompt' }], usage: { private: true } });
  }) as typeof fetch;
  const result = await generateCodexToolImage('bee', account, signal(), undefined, transport);
  assert.equal(calls, 1); assert.deepEqual(Object.keys(result), ['b64_json']);
  const output = Buffer.from(result.b64_json, 'base64');
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 16); assert.equal(metadata.height, 16);
  for (const key of ['exif', 'icc', 'iptc', 'xmp'] as const) assert.equal(metadata[key], undefined);
  assert.notDeepEqual(output, original);
});

test('errors preserve only status and retry timing, and never retry synthesis', async () => {
  for (const status of [401, 403, 429, 502]) {
    let calls = 0;
    const transport = (async () => { calls++; return new Response('private upstream token and topology', {
      status, headers: { 'retry-after': '7', 'x-private-credential': 'secret' },
    }); }) as typeof fetch;
    await assert.rejects(generateCodexToolImage('bee', account, signal(), undefined, transport), error => {
      const e = error as any;
      assert.deepEqual(e.upstream, { status, headers: { 'retry-after': '7' } });
      assert.equal(e.message, 'codex_image_request_failed');
      assert(!JSON.stringify(e).includes('secret')); return true;
    });
    assert.equal(calls, 1);
  }
});

test('response limit handles both declared and chunked bodies and cancels overflow', async () => {
  for (const declared of [true, false]) {
    let cancelled = false;
    const transport = (async () => new Response(new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode('x'.repeat(101))); },
      cancel() { cancelled = true; },
    }), { headers: declared ? { 'content-length': '101' } : {} })) as typeof fetch;
    await assert.rejects(generateCodexToolImage('bee', account, signal(), 100, transport), /codex_image_response_limit/);
    assert(cancelled);
  }
});

test('missing images, extra images, URLs and malformed artifacts cannot establish capability', async () => {
  for (const data of [{}, { data: [] }, { data: [{ url: 'https://internal.invalid/file' }] },
    { data: [{ b64_json: 'a' }, { b64_json: 'b' }] }, { data: [{ b64_json: 'not-base64' }] },
    { data: [{ b64_json: Buffer.from([137,80,78,71,13,10,26,10,...new Array(100).fill(0)]).toString('base64') }] }]) {
    await assert.rejects(generateCodexToolImage('bee', account, signal(), undefined, (async () => Response.json(data)) as typeof fetch), /codex_image_invalid/);
  }
  await assert.rejects(generateCodexToolImage('bee', account, signal(), undefined, (async () => new Response('<html>private failure</html>')) as typeof fetch), /codex_image_invalid_response/);
});

test('pre-dispatch cancellation and invalid input make no request', async () => {
  let calls = 0; const transport = (async () => { calls++; return Response.json({}); }) as typeof fetch;
  await assert.rejects(generateCodexToolImage('bee', account, AbortSignal.abort(), undefined, transport));
  for (const limit of [0, -1, Infinity, NaN]) await assert.rejects(generateCodexToolImage('bee', account, signal(), limit, transport));
  await assert.rejects(generateCodexToolImage('', account, signal(), undefined, transport));
  assert.equal(calls, 0);
});

test('in-flight cancellation remains one uncertain dispatch and never returns a late artifact', async () => {
  const controller = new AbortController(); let calls = 0;
  const transport = (async (_url, options) => {
    calls++; assert.equal(options?.signal, controller.signal);
    controller.abort(); return Response.json({ data: [{ b64_json: (await image()).toString('base64') }] });
  }) as typeof fetch;
  await assert.rejects(generateCodexToolImage('bee', account, controller.signal, undefined, transport));
  assert.equal(calls, 1);
});
