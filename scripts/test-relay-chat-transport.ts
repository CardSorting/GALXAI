import assert from 'node:assert/strict';
import { test } from 'node:test';
import { executeRelayChat, RelayDispatchError } from '../src/core/router/adapters/RelayChatTransport';
import { OpenAIAdapter } from '../src/core/router/adapters/OpenAIAdapter';

test('REST image errors retain status/backoff and caller cancellation remains health-neutral', async () => {
  const original = globalThis.fetch;
  const execute = (signal?: AbortSignal) => OpenAIAdapter.executeImageGeneration(
    { prompt: 'test' } as any, { apiKey: 'sk-test-fixture' } as any,
    { id: 'image', upstreamId: 'image' } as any, 'fixture', { signal, timeoutMs: 100 });
  try {
    globalThis.fetch = async () => new Response('Invalid request 401234', { status: 400, headers: { 'Retry-After': '120' } });
    await assert.rejects(execute(), (error: any) => error.status === 400 && error.upstreamHeaders['retry-after'] === '120');
    globalThis.fetch = async (_input, init) => new Response(new ReadableStream({
      start(controller) {
        init?.signal?.addEventListener('abort', () => controller.error(init.signal!.reason), { once: true });
      }
    }));
    const caller = new AbortController();
    const pending = execute(caller.signal);
    caller.abort();
    await assert.rejects(pending, (error: any) => error.status === 499);
  } finally { globalThis.fetch = original; }
});

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

test('image relay errors and deadlines never replay synthesis; valid images are preserved', async () => {
  const previousUrl = process.env.VM_RELAY_URL, previousKey = process.env.VM_RELAY_API_KEY;
  const originalFetch = globalThis.fetch;
  const adapter = OpenAIAdapter as any;
  const originalDirect = adapter.executeImageViaCodexWebSocket;
  let directCalls = 0;
  process.env.VM_RELAY_URL = 'https://relay.test';
  process.env.VM_RELAY_API_KEY = 'relay-test-key';
  adapter.executeImageViaCodexWebSocket = async () => { directCalls++; throw new Error('Unexpected replay'); };
  const execute = () => OpenAIAdapter.executeImageGeneration({ prompt: 'test' } as any,
    { accessToken: 'provider-token', accountId: 'account' } as any,
    { id: 'image-model', upstreamId: 'gpt-image-2' } as any, 'shard', { timeoutMs: 20 });
  try {
    for (const status of [401, 502, 503, 504]) {
      globalThis.fetch = async (_input, init) => {
        assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer relay-test-key');
        assert.equal(init?.redirect, 'error');
        return Response.json({ error: 'provider secret must stay private' }, { status });
      };
      await assert.rejects(execute(), RelayDispatchError);
    }
    globalThis.fetch = async () => Response.json({ data: [] });
    await assert.rejects(execute(), RelayDispatchError);
    globalThis.fetch = async (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
    await assert.rejects(execute(), RelayDispatchError);
    globalThis.fetch = async () => Response.json({ created: 42, data: [{ b64_json: 'dGVzdA==' }] });
    const image = await execute();
    assert.equal(image.data[0].b64_json, 'dGVzdA==');
    assert.equal(image.created, 42);
    assert.equal(directCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    adapter.executeImageViaCodexWebSocket = originalDirect;
    if (previousUrl === undefined) delete process.env.VM_RELAY_URL; else process.env.VM_RELAY_URL = previousUrl;
    if (previousKey === undefined) delete process.env.VM_RELAY_API_KEY; else process.env.VM_RELAY_API_KEY = previousKey;
  }
});


test('relay failures preserve retry authority and task identity without replay or raw provider text', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async (_input, init) => {
      calls++;
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('x-galx-task-id'), 'parent.child');
      assert.equal(headers.get('idempotency-key'), 'step-1');
      assert.equal(headers.get('x-galx-idempotency-scope'), 'scope-1');
      return Response.json({ error: { code: 'relay_admission_unknown', execution_state: 'unknown', message: 'private provider detail' } }, {
        status: 502, headers: { 'Retry-After': '137', 'X-Should-Retry': 'false', 'X-Request-Id': 'request-1', 'X-Galx-Idempotency-Scope': 'scope-1' }
      });
    };
    await assert.rejects(executeRelayChat({ ...options, taskId: 'parent.child', idempotencyKey: 'step-1', idempotencyScope: 'scope-1' }), (error: any) => {
      assert(error instanceof RelayDispatchError);
      assert.equal(error.reason, 'relay_http_502');
      assert.equal(error.status, 502);
      assert.equal(error.upstreamCode, 'relay_admission_unknown');
      assert.equal(error.executionState, 'unknown');
      assert.equal(error.shouldRetry, false);
      assert.equal(error.retryAfterMs, 137000);
      assert.equal(error.requestId, 'request-1');
      assert.equal(error.idempotencyScope, 'scope-1');
      assert(!error.message.includes('private provider'));
      return true;
    });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
