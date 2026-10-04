// Private diagnostic only. Imports the unchanged Nova helper. No real authority,
// database, upstream network, new client contract or deployable server.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { Readable } from 'node:stream';
import { once } from 'node:events';
import { invokeNova } from '../../src/lib/nova/inference';
import type { NovaAccess, NovaState } from '../../src/lib/nova/contract';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const encoder = new TextEncoder();
const results: Record<string, unknown>[] = [];
const body = JSON.stringify({ messages: [{ role: 'user', content: 'Synthetic only.' }], stream: true });
const requestHeaders = { Authorization: 'Bearer galx_connect_at_' + 'a'.repeat(43), 'Content-Type': 'application/json', 'Idempotency-Key': 'observation_only_request' };
const frame = (value: unknown) => 'data: ' + JSON.stringify(value) + '\n\n';
const terminal = frame({ choices: [{ delta: { content: 'Done.' }, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n';
function fakeAccess(delayMs = 0, fail = false) {
  const states: NovaState[] = [], registered: Promise<void>[] = [];
  let admitted = 0, committed = false;
  const access: NovaAccess = {
    async admit() { admitted++; assert.equal(registered.length, 1); return { id: '00000000-0000-4000-8000-000000000001', userId: 'synthetic-owner', grantId: 'synthetic-grant' }; },
    async finish(_id, state) { states.push(state); await delay(delayMs); if (fail) throw Error('PRIVATE_STORAGE_DIAGNOSTIC'); committed = true; },
  };
  return { access, states, registered, keepAlive: (p: Promise<void>) => registered.push(p), admitted: () => admitted, committed: () => committed };
}
const req = (signal?: AbortSignal) => new Request('https://fixture.invalid/v1/inference', { method: 'POST', headers: requestHeaders, body, signal });
const response = (text: string) => new Response(text, { headers: { 'Content-Type': 'text/event-stream', 'X-Private-Upstream': 'PRIVATE_SYNTHETIC' } });

// A complete request body emits req.close while its response is still pending.
for (const naive of [true, false]) {
  const a = fakeAccess(), events: unknown[] = [];
  let calls = 0;
  const server = createServer(async (incoming, outgoing) => {
    const abort = new AbortController();
    incoming.on('close', () => { events.push({ event: 'request_close', complete: incoming.complete, responseFinished: outgoing.writableFinished }); if (naive || !incoming.complete) abort.abort(); });
    outgoing.on('close', () => { events.push({ event: 'response_close', finished: outgoing.writableFinished }); if (!outgoing.writableFinished) abort.abort(); });
    const web = new Request('https://fixture.invalid/v1/inference', { method: 'POST', headers: incoming.headers as Record<string, string>, body: Readable.toWeb(incoming), duplex: 'half', signal: abort.signal } as RequestInit);
    const result = await invokeNova(web, 'https://fixture.invalid', a.access, async () => { calls++; await delay(20); return response(terminal); }, a.keepAlive);
    outgoing.writeHead(result.status, Object.fromEntries(result.headers));
    const reader = result.body!.getReader();
    try { for (;;) { const p = await reader.read(); if (p.done) break; if (!outgoing.write(p.value)) await once(outgoing, 'drain'); } outgoing.end(); }
    finally { await reader.cancel().catch(() => {}); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const result = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', headers: requestHeaders, body });
  const text = await result.text();
  await Promise.all(a.registered);
  await new Promise<void>(resolve => server.close(() => resolve()));
  assert(events.some((e: any) => e.event === 'request_close' && e.complete && !e.responseFinished));
  if (naive) { assert.equal(calls, 0); assert.equal(result.status, 400); }
  else { assert.equal(calls, 1); assert.equal(result.status, 200); assert.match(text, /\[DONE\]/); assert.deepEqual(a.states, ['completed']); }
  results.push({ case: naive ? 'naive_request_close_hook_counterexample' : 'response_close_hook_normal_completion', status: result.status, dispatches: calls, states: a.states, events });
}

// A real loopback client disconnect aborts the response-owned request, and the
// owner still waits for a delayed terminal write after the socket has closed.
{
  const a = fakeAccess(120), events: string[] = [];
  let calls = 0, writeAfterClose = false;
  const server = createServer(async (incoming, outgoing) => {
    const abort = new AbortController();
    incoming.on('close', () => { if (!incoming.complete) abort.abort(); });
    outgoing.on('close', () => { events.push('socket_closed'); if (!outgoing.writableFinished) abort.abort(); });
    const web = new Request('https://fixture.invalid/v1/inference', { method: 'POST', headers: incoming.headers as Record<string, string>, body: Readable.toWeb(incoming), duplex: 'half', signal: abort.signal } as RequestInit);
    const result = await invokeNova(web, 'https://fixture.invalid', a.access, async (_input, _admission, signal) => {
      calls++;
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(encoder.encode(frame({ choices: [{ delta: { content: 'Partial.' }, finish_reason: null }] })));
        signal.addEventListener('abort', () => { events.push('execution_aborted'); controller.close(); }, { once: true });
      } }), { headers: { 'Content-Type': 'text/event-stream' } });
    }, a.keepAlive);
    outgoing.writeHead(result.status, Object.fromEntries(result.headers));
    const reader = result.body!.getReader();
    try {
      for (;;) { const p = await reader.read(); if (p.done || outgoing.destroyed) break; outgoing.write(p.value); }
    } finally {
      await reader.cancel().catch(() => {});
      await Promise.all(a.registered);
      writeAfterClose = outgoing.destroyed && a.committed();
      events.push('terminal_persisted');
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) => {
    const client = httpRequest({ hostname: '127.0.0.1', port, path: '/', method: 'POST', headers: requestHeaders }, incoming => {
      incoming.once('data', () => { incoming.destroy(); client.destroy(); resolve(); });
      incoming.on('error', () => {});
    });
    client.on('error', reject); client.end(body);
  });
  for (let i = 0; i < 100 && !writeAfterClose; i++) await delay(10);
  await new Promise<void>(resolve => server.close(() => resolve()));
  assert.equal(calls, 1); assert.deepEqual(a.states, ['unknown']); assert(writeAfterClose);
  results.push({ case: 'disconnect_retains_terminal_owner', dispatches: calls, states: a.states, writeAfterSocketClose: writeAfterClose, events });
}

// Projected public bytes can exceed the upstream two-million-byte read cap.
{
  const a = fakeAccess();
  const input = frame({ choices: [{ delta: {} }] }).repeat(20000) + terminal;
  const bytes = encoder.encode(input); let offset = 0;
  const chunked = new ReadableStream<Uint8Array>({ pull(controller) { if (offset >= bytes.length) controller.close(); else { controller.enqueue(bytes.slice(offset, offset + 16384)); offset += 16384; } } });
  const result = await invokeNova(req(), 'https://fixture.invalid', a.access, async () => new Response(chunked, { headers: { 'Content-Type': 'text/event-stream' } }), a.keepAlive);
  let publicBytes = 0, publicEvents = 0;
  for await (const bytes of result.body!) { publicBytes += bytes.byteLength; publicEvents++; }
  await Promise.all(a.registered);
  assert(Buffer.byteLength(input) < 2_000_000); assert(publicBytes > 2_000_000); assert.deepEqual(a.states, ['completed']);
  results.push({ case: 'wire_limit_is_not_content_limit', upstreamBytes: Buffer.byteLength(input), publicBytes, publicEvents, states: a.states, inference: 'A two-million-byte client wire cap would reject this currently valid response. Choose content, frame and wire budgets separately.' });
}

// The existing public projector consumes comment/empty-choice frames without
// publishing them. Upstream activity does not guarantee a public keepalive.
{
  const a = fakeAccess(); let sourceFrames = 0;
  const source = new ReadableStream<Uint8Array>({ async start(controller) {
    for (let i = 0; i < 5; i++) { controller.enqueue(encoder.encode(': keepalive\n\n' + frame({ choices: [] }))); sourceFrames += 2; await delay(20); }
    controller.enqueue(encoder.encode(terminal)); controller.close();
  } });
  const result = await invokeNova(req(), 'https://fixture.invalid', a.access, async () => new Response(source, { headers: { 'Content-Type': 'text/event-stream' } }), a.keepAlive);
  const reader = result.body!.getReader(); let published = false;
  const first = reader.read().then(part => { published = true; return part; });
  await delay(60); const quietDespiteInput = !published && sourceFrames >= 4;
  assert(quietDespiteInput);
  await first; while (!(await reader.read()).done) { /* consume terminal */ }
  await Promise.all(a.registered);
  results.push({ case: 'upstream_activity_does_not_publish_keepalive', quietDespiteInput, sourceFrames, states: a.states, inference: 'The host needs a public transport keepalive after authorized SSE headers. It must not reset provider execution deadlines or signal completion.' });
}

// A failed terminal persistence attempt cannot be disguised as buffered success.
{
  const a = fakeAccess(10, true);
  const result = await invokeNova(req(), 'https://fixture.invalid', a.access, async () => response(terminal), a.keepAlive);
  const text = await result.text(); await Promise.all(a.registered);
  assert.match(text, /outcome_unconfirmed/); assert.doesNotMatch(text, /\[DONE\]|PRIVATE_STORAGE/); assert.equal(a.states.length, 1);
  results.push({ case: 'terminal_write_failure_no_success_marker', attemptedStates: a.states, committed: a.committed(), publicUnknown: true, automaticReplay: false });
}

const report = { at: new Date().toISOString(), node: process.version, platform: process.platform, architecture: process.arch, network: 'container loopback only; external networking disabled', realDatabase: false, realProvider: false, prototypeOnly: true, cases: results.length, results };
fs.writeFileSync('/evidence/result.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
