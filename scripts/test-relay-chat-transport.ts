import assert from 'node:assert/strict';
import { test } from 'node:test';
import { executeRelayChat, RelayDispatchError } from '../src/core/router/adapters/RelayChatTransport';
import { OpenAIAdapter } from '../src/core/router/adapters/OpenAIAdapter';

const options = { url: 'https://relay.test', key: 'relay-test-key', payload: { model: 'test-model', stream: false }, ttftTimeoutMs: 1000 };
const delta = (text: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: null }] })}\n\n`;
async function fixture(body: string | null, run: () => Promise<void>, admissionStatus = 202, streamUrl = '/v1/jobs/test/stream') {
  const original = globalThis.fetch;
  let cancelled = false;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://relay.test', 'Never send the relay key to another origin');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer relay-test-key');
    assert.equal(init?.redirect, 'error');
    if (url.pathname === '/v1/chat/completions') return Response.json({ id: 'test', streamUrl }, { status: admissionStatus });
    let listener: () => void;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        if (body === null) {
          listener = () => controller.error(init?.signal?.reason);
          init?.signal?.addEventListener('abort', listener, { once: true });
        } else {
          const bytes = new TextEncoder().encode(body);
          // Exercise UTF-8 and SSE delimiters split across network reads.
          for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3));
          controller.close();
        }
      },
      cancel() { cancelled = true; init?.signal?.removeEventListener('abort', listener); }
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try { await run(); } finally { globalThis.fetch = original; }
  return cancelled;
}

test('relay JSON and streaming completions require DONE and preserve output and usage', async () => {
  const data = delta('héllo') + 'data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2,"total_tokens":5}}\n\ndata: [DONE]\n\n';
  await fixture(data, async () => {
    const result = await executeRelayChat(options);
    const json = await result.response.json();
    assert.equal(json.choices[0].message.content, 'héllo');
    assert.equal(json.usage.total_tokens, 5);
    const stream = await executeRelayChat({ ...options, payload: { ...options.payload, stream: true } });
    const text = await stream.response.text();
    assert(text.includes('héllo')); assert(text.includes('[DONE]'));
  });
});

test('relay failures, malformed frames, cancellation and partial EOF cannot become empty successes', async () => {
  for (const body of ['event: error\ndata: {"error":"provider_failed"}\n\n', 'event: cancelled\ndata: {}\n\n', delta('partial'), 'data: not-json\n\n']) {
    await fixture(body, async () => { await assert.rejects(executeRelayChat(options), RelayDispatchError); });
  }
  await fixture(delta('partial') + 'event: error\ndata: {"error":"failed"}\n\n', async () => {
    const result = await executeRelayChat({ ...options, payload: { ...options.payload, stream: true } });
    await assert.rejects(result.response.text(), RelayDispatchError);
  });
});

test('first-output deadline remains active after the 202 and SSE headers; caller abort is honored', async () => {
  await fixture(null, async () => {
    await assert.rejects(executeRelayChat({ ...options, ttftTimeoutMs: 25 }), (error: any) => error instanceof RelayDispatchError && error.reason === 'first_output_timeout');
    const parent = new AbortController();
    const pending = executeRelayChat({ ...options, signal: parent.signal });
    setTimeout(() => parent.abort(), 10);
    await assert.rejects(pending, RelayDispatchError);
  });
});

test('unsafe attachment destinations and relay HTTP failures are rejected', async () => {
  for (const path of ['https://other.test/v1/jobs/test/stream', '/v1/jobs/another/stream', '//other.test/stream']) {
    await fixture('', async () => { await assert.rejects(executeRelayChat(options), RelayDispatchError); }, 202, path);
  }
  for (const status of [401, 403, 500, 503]) {
    await fixture('', async () => { await assert.rejects(executeRelayChat(options), (error: any) => error.reason === `relay_http_${status}`); }, status);
  }
});

test('configured relay errors never invoke direct WebSocket or CLI fallback', async () => {
  const previousUrl = process.env.VM_RELAY_URL, previousKey = process.env.VM_RELAY_API_KEY;
  const original = OpenAIAdapter.executeViaCodexWebSocket;
  let directCalls = 0;
  process.env.VM_RELAY_URL = 'https://relay.test';
  process.env.VM_RELAY_API_KEY = 'relay-test-key';
  OpenAIAdapter.executeViaCodexWebSocket = async () => { directCalls++; throw new Error('Unexpected direct provider dispatch'); };
  try {
    await fixture('', async () => {
      await assert.rejects(OpenAIAdapter.executeChatCompletion({ messages: [{ role: 'user', content: 'test' }] } as any,
        { accessToken: 'provider-token', accountId: 'account', authType: 'oauth' } as any, { id: 'test-model' } as any), RelayDispatchError);
    }, 401);
    assert.equal(directCalls, 0);
    await assert.rejects(executeRelayChat({ ...options, key: '' }), (error: any) => error.reason === 'missing_relay_key');
  } finally {
    OpenAIAdapter.executeViaCodexWebSocket = original;
    if (previousUrl === undefined) delete process.env.VM_RELAY_URL; else process.env.VM_RELAY_URL = previousUrl;
    if (previousKey === undefined) delete process.env.VM_RELAY_API_KEY; else process.env.VM_RELAY_API_KEY = previousKey;
  }
});
