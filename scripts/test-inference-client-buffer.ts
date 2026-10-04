import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bufferInferenceResult } from '../src/sdk/inference-result';
import { withStreamKeepalive } from '../src/lib/nova/keepalive';
const encoder = new TextEncoder();
const chunk = (content = 'Hello', finish: string | null = null, extra = {}) => `data: ${JSON.stringify({ id: 'request-public', object: 'chat.completion.chunk', model: 'galx-nova', private: 'PRIVATE', choices: [{ index: 0, delta: { content, private: 'PRIVATE' }, finish_reason: finish }], ...extra })}\n\n`;
const result = (text: string) => new Response(text, { headers: { 'Content-Type': 'text/event-stream', 'X-Private': 'PRIVATE' } });
test('complete-answer buffering validates the terminal stream and projects an allowlisted result', async () => {
  const r = await bufferInferenceResult(result(': keepalive\n\n' + chunk('Hello ') + chunk('🌎', 'stop') + 'data: [DONE]\n\n'));
  assert.equal(r.status, 200); assert.equal(r.headers.get('x-private'), null);
  const body = await r.json(); assert.equal(body.choices[0].message.content, 'Hello 🌎');
  assert.deepEqual(Object.keys(body).sort(), ['choices','id','model','object']); assert(!JSON.stringify(body).includes('PRIVATE'));
});
test('fragmented UTF-8, CRLF and comment frames survive without buffering the server response', async () => {
  const bytes = encoder.encode((chunk('🌎', 'length') + 'data: [DONE]\n\n').replaceAll('\n', '\r\n'));
  let index = 0;
  const body = new ReadableStream<Uint8Array>({ pull(c) { if (index === bytes.length) c.close(); else c.enqueue(bytes.slice(index, ++index)); } });
  const r = await bufferInferenceResult(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }));
  assert.equal((await r.json()).choices[0].message.content, '🌎');
});
test('missing, conflicting, forged and malformed terminal receipts remain unknown', async () => {
  for (const text of [chunk(), chunk('', 'stop'), 'data: [DONE]\n\n', chunk('', 'stop') + chunk() + 'data: [DONE]\n\n', chunk('', 'stop') + 'data: [DONE]\n\ndata: [DONE]\n\n', chunk('a') + chunk('b', 'stop', { id: 'other' }) + 'data: [DONE]\n\n', chunk('', 'stop', { model: 'PRIVATE_MODEL' }) + 'data: [DONE]\n\n', 'data: {"error":{"message":"PRIVATE"}}\n\n', 'data: invalid\n\n']) {
    const r = await bufferInferenceResult(result(text)); assert.equal(r.status, 502); const b = await r.text(); assert.match(b, /outcome_unconfirmed/); assert(!b.includes('PRIVATE'));
  }
});
test('frame, assembled answer and wire limits fail closed and cancel retrieval', async () => {
  for (const text of [chunk('x'.repeat(256_001), 'stop'), Array.from({ length: 21 }, () => chunk('x'.repeat(100_000))).join(''), ':'.repeat(16_000_001)]) {
    const r = await bufferInferenceResult(result(text)); assert.equal(r.status, 502);
  }
});
test('cancellation ends local buffering without presenting a successful answer', async () => {
  let cancelled = false;
  const abort = new AbortController();
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(encoder.encode(chunk())); }, cancel() { cancelled = true; } });
  const pending = bufferInferenceResult(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }), abort.signal);
  abort.abort(); await assert.rejects(pending, { name: 'AbortError' }); assert(cancelled);
});
test('non-success admission responses pass through without retry or synthetic completion', async () => {
  const denied = Response.json({ error: { code: 'service_busy' } }, { status: 503 });
  assert.equal(await bufferInferenceResult(denied), denied);
  assert.equal((await bufferInferenceResult(Response.json({ private: 'PRIVATE' }))).status, 502);
});
test('quiet streams emit only comments, preserve incremental data and propagate cancellation', async () => {
  let upstream!: ReadableStreamDefaultController<Uint8Array>, cancelled = false;
  const stream = withStreamKeepalive(new ReadableStream<Uint8Array>({ start(c) { upstream = c; }, cancel() { cancelled = true; } }), 5);
  const reader = stream.getReader();
  assert.equal(new TextDecoder().decode((await reader.read()).value), ': keepalive\n\n');
  upstream.enqueue(encoder.encode('data: result\n\n'));
  assert.equal(new TextDecoder().decode((await reader.read()).value), 'data: result\n\n');
  await reader.cancel(); assert(cancelled);
});
test('keepalives never replace a terminal event or manufacture another read/attempt', async () => {
  const stream = withStreamKeepalive(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(encoder.encode('data: [DONE]\n\n')); c.close(); } }), 5);
  assert.equal(await new Response(stream).text(), 'data: [DONE]\n\n');
});
