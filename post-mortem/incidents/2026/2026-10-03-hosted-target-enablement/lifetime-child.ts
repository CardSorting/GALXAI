import fs from 'node:fs';
import { invokeNova } from '../../src/lib/nova/inference';
import type { NovaAccess, NovaState } from '../../src/lib/nova/contract';

// Isolated lifecycle experiment, not a replacement Nova build or database test.
// The parent may reclaim the process only after async terminal persistence starts.
const [mode, destination] = process.argv.slice(2);
const state = { mode, durableState: 'absent', dispatches: 0, providerFailures: 0,
  upstreamCancelled: false, signalAborted: false, cleanupStarted: false,
  cleanupCommitted: false, responseSanitized: false };
const persist = () => fs.writeFileSync(destination, JSON.stringify(state, null, 2) + '\n');
const send = (event: string) => process.send?.({ event });
const access: NovaAccess = {
  async admit() { state.durableState = 'running'; persist(); return { id: 'synthetic-request', userId: 'synthetic-owner', grantId: 'synthetic-grant' }; },
  async finish(_id: string, value: NovaState) {
    state.cleanupStarted = true; persist(); send('cleanup-started');
    // A bounded asynchronous storage write. No real database or account is used.
    await new Promise(resolve => setTimeout(resolve, 250));
    state.durableState = value; state.cleanupCommitted = true; persist();
  },
};

async function main() {
  const request = new Request('https://nova.fixture.invalid/v1/inference', {
    method: 'POST', headers: { Authorization: 'Bearer galx_connect_at_' + 'a'.repeat(43),
      'Content-Type': 'application/json', 'Idempotency-Key': 'synthetic_request_001' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Synthetic fixture only.' }], stream: true }),
  });
  const response = await invokeNova(request, 'https://nova.fixture.invalid', access, async (_input, _admission, signal) => {
    state.dispatches++; persist();
    const data = JSON.stringify({ id: 'PRIVATE_PROVIDER_ID', model: 'PRIVATE_MODEL', private: 'PRIVATE_DIAGNOSTIC',
      choices: [{ delta: { content: 'fixture' }, finish_reason: mode === 'complete' ? 'stop' : null }] });
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: ' + data + '\n\n'));
        if (mode === 'complete') { controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); controller.close(); }
      },
      cancel() { state.upstreamCancelled = true; state.signalAborted = signal.aborted; persist(); },
    });
    return new Response(source, { headers: { 'Content-Type': 'text/event-stream', 'X-Private-Upstream': 'PRIVATE_HEADER' } });
  });
  if (mode === 'complete') {
    const body = await response.text();
    state.responseSanitized = !/PRIVATE_|X-Private/i.test(body) && !response.headers.has('x-private-upstream');
  } else {
    const reader = response.body!.getReader();
    const first = await reader.read();
    state.responseSanitized = !/PRIVATE_/i.test(new TextDecoder().decode(first.value)) && !response.headers.has('x-private-upstream');
    persist(); send('stream-observed');
    await reader.cancel();
  }
  persist(); send('finished'); process.disconnect?.();
}
main().catch(error => { send('fixture-error'); process.exitCode = 1; console.error(error.name); });
