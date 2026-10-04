import fs from 'node:fs';
import assert from 'node:assert/strict';
import { after } from 'next/dist/server/after/after';
import { AfterContext } from 'next/dist/server/after/after-context';
import { workAsyncStorage } from 'next/dist/server/app-render/work-async-storage.external';
import { invokeNova } from '../../src/lib/nova/inference';
import type { NovaAccess } from '../../src/lib/nova/contract';

// No provider, database, account credentials or network. A delayed file write
// models terminal persistence; the parent models permitted host reclamation.
const [mode, destination] = process.argv.slice(2), start = performance.now();
const state = { mode, durableState: 'absent', registrations: 0, dispatches: 0, writes: 0, committed: false, signalAborted: false, sanitized: false, elapsedMs: 0 };
const persist = () => { state.elapsedMs = Math.round(performance.now() - start); fs.writeFileSync(destination, JSON.stringify(state, null, 2) + '\n'); };
const send = (event: string) => process.send?.({ event });
const control = new AbortController();
const afterContext = new AfterContext({ waitUntil(task) {
  state.registrations++; persist();
  void task.then(() => { persist(); send('host-work-settled'); });
}, onClose() {}, onTaskError() { process.exitCode = 1; } });
const access: NovaAccess = {
  async admit() { assert.equal(state.registrations, 1); state.durableState = 'running'; persist(); return { id: 'synthetic-request', userId: 'synthetic-owner', grantId: 'synthetic-grant' }; },
  async finish(_id, value) {
    state.writes++; persist(); send('cleanup-started');
    await new Promise(resolve => setTimeout(resolve, 250));
    state.durableState = value; state.committed = true; persist();
  },
};
process.on('message', message => { if (message === 'disconnect') control.abort(); });
// AbortSignal.timeout is unref'd in Node. The host remains alive while work is registered.
setInterval(() => {}, 1000);
await workAsyncStorage.run({ afterContext } as any, async () => {
  const response = await invokeNova(new Request('https://fixture.invalid/v1/inference', {
    method: 'POST', signal: control.signal,
    headers: { Authorization: 'Bearer galx_connect_at_' + 'a'.repeat(43), 'Content-Type': 'application/json', 'Idempotency-Key': 'fixture_lifetime_request' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Synthetic only.' }], stream: true }),
  }), 'https://fixture.invalid', access, async (_input, _admission, signal) => {
    state.dispatches++; signal.addEventListener('abort', () => { state.signalAborted = true; persist(); });
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ id: 'PRIVATE_JOB', model: 'PRIVATE_MODEL', choices: [{ delta: { content: 'fixture' }, finish_reason: mode === 'completed' ? 'stop' : null }] }) + '\n\n'));
      if (mode === 'completed') { controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); controller.close(); }
    } }), { headers: { 'Content-Type': 'text/event-stream', 'X-Private': 'PRIVATE_SECRET' } });
  }, after);
  const reader = response.body!.getReader(), first = await reader.read();
  state.sanitized = !/PRIVATE_/.test(new TextDecoder().decode(first.value)) && !response.headers.has('x-private'); persist(); send('stream-observed');
  if (mode === 'completed') while (!(await reader.read()).done) { /* consume validated terminal */ }
  // The other modes intentionally never call stream.cancel(). The request
  // signal must finalize after response handoff without that callback.
});
