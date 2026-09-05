import assert from 'node:assert/strict';
import {
  GALX_AGENT_PROTOCOL_VERSION,
  GalxBrowserAgentClient,
  GalxBrowserAgentError,
  parseGalxSseStream,
} from '../src/sdk/browser-agent';

interface CapturedRequest {
  url: string;
  init?: RequestInit;
  body?: Record<string, any>;
}

function eventStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

const captured: CapturedRequest[] = [];
let bootstrapCalls = 0;
const mockFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  if (url === '/api/client/bootstrap') {
    bootstrapCalls++;
    return Response.json({
      protocolVersion: GALX_AGENT_PROTOCOL_VERSION,
      deployment: {
        id: 'dpl_test_42',
        environment: 'preview',
        skewProtectionEnabled: true,
      },
      agent: {
        interactiveEndpoint: '/v1/chat/completions',
        transport: 'sse',
        sessionModes: ['new', 'continue', 'stateless'],
        maxInteractiveDurationSeconds: 300,
      },
      security: { sameOrigin: true, providerKeysAcceptedInBrowser: false },
    });
  }

  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  captured.push({ url, init, body });
  const sessionId = body?.conversation_id || '';
  return new Response(eventStream([
    'id: 1\nevent: response.output_text.delta\ndata: {"type":"response.output_text.delta","sequence_number":1,"delta":"hello"}\n',
    '\nid: 2\ndata: {"choices":[{"delta":{"content":" world"}}]}\n\n',
    'event: response.completed\ndata: {"type":"response.completed"}\n\n',
    'data: [DONE]\n\n',
  ]), {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'x-galx-conversation-id': sessionId,
    },
  });
};

async function collectText(iterable: AsyncIterable<any>): Promise<string> {
  let text = '';
  for await (const event of iterable) {
    if (event.type === 'text_delta') text += event.text;
  }
  return text;
}

const client = new GalxBrowserAgentClient({
  fetch: mockFetch,
  getAccessToken: () => 'user_access_token',
});
const sessionA = client.startSession();
const sessionB = client.startSession();
assert.notEqual(sessionA.sessionId, sessionB.sessionId, 'One browser client must multiplex independent sessions.');

const message = [{ role: 'user' as const, content: 'hello' }];
assert.equal(await collectText(sessionA.stream({ messages: message })), 'hello world');
assert.equal(await collectText(sessionB.stream({ messages: message })), 'hello world');
assert.equal(await collectText(sessionA.stream({ messages: message })), 'hello world');

assert.equal(bootstrapCalls, 1, 'Deployment bootstrap should be cached per client instance.');
assert.deepEqual(captured.map((request) => request.body?.session_mode), ['new', 'new', 'continue']);
assert.deepEqual(
  captured.map((request) => request.body?.conversation_id),
  [sessionA.sessionId, sessionB.sessionId, sessionA.sessionId],
);
assert.ok(captured.every((request) => request.init?.credentials === 'same-origin'));
assert.ok(captured.every((request) => (request.init?.headers as Record<string, string>)['X-Deployment-Id'] === 'dpl_test_42'));
assert.ok(captured.every((request) => (request.init?.headers as Record<string, string>).Authorization === 'Bearer user_access_token'));
assert.ok(captured.every((request) => {
  const headers = request.init?.headers as Record<string, string>;
  return headers['Idempotency-Key'] === request.body?.turn_id;
}));

const statelessEvents = client.streamTurn({ messages: message, sessionMode: 'stateless' });
assert.equal(await collectText(statelessEvents), 'hello world');
assert.equal(captured.at(-1)?.body?.conversation_id, undefined);
assert.equal(captured.at(-1)?.body?.session_mode, 'stateless');

await assert.rejects(
  async () => {
    const invalid = new GalxBrowserAgentClient({
      fetch: mockFetch,
      headers: { Authorization: 'Bearer provider_secret' },
    });
    await invalid.getBootstrap();
  },
  (error: unknown) => error instanceof GalxBrowserAgentError && error.code === 'privileged_browser_header_rejected',
);

const mismatchClient = new GalxBrowserAgentClient({
  bootstrapEndpoint: false,
  fetch: async () => new Response(eventStream(['data: [DONE]\n\n']), {
    headers: {
      'content-type': 'text/event-stream',
      'x-galx-conversation-id': 'session_wrong',
    },
  }),
});
await assert.rejects(
  () => collectText(mismatchClient.resumeSession('session_expected').stream({ messages: message })),
  (error: unknown) => error instanceof GalxBrowserAgentError && error.code === 'session_identity_mismatch',
);

const parsedBlocks = [];
for await (const event of parseGalxSseStream(eventStream([
  ': keepalive\r\nid: 7\r\nevent: note\r\ndata: line one\r\n',
  'data: line two\r\n\r\n',
]))) {
  parsedBlocks.push(event);
}
assert.deepEqual(parsedBlocks, [{ event: 'note', id: '7', data: 'line one\nline two' }]);

console.log('Browser agent deployment client tests passed (sessions, protocol pinning, SSE, and secret boundary).');
