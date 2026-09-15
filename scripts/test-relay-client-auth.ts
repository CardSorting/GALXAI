import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OpenAIAdapter } from '../src/core/router/adapters/OpenAIAdapter.js';

test('chat, stream attachment and image requests use relay credentials without forwarding provider credentials', async () => {
  const originalFetch = globalThis.fetch;
  const previous = { url: process.env.VM_RELAY_URL, key: process.env.VM_RELAY_API_KEY };
  process.env.VM_RELAY_URL = 'http://relay.test';
  process.env.VM_RELAY_API_KEY = 'relay-test-key';
  const paths: string[] = [];
  globalThis.fetch = async (input, init) => {
    const target = new URL(String(input));
    assert.equal(target.origin, 'http://relay.test');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), 'Bearer relay-test-key');
    assert.equal(headers.get('chatgpt-account-id'), null);
    assert.equal(headers.get('openai-account'), null);
    paths.push(target.pathname);
    if (target.pathname === '/v1/chat/completions') return Response.json({ id: 'test-job', streamUrl: '/v1/jobs/test-job/stream' }, { status: 202 });
    if (target.pathname.endsWith('/stream')) return new Response('data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
    if (target.pathname === '/v1/images/generations') return Response.json({ created: 1, data: [{ b64_json: 'dGVzdA==' }], execution: { routingMode: 'codex_image_tool_alias', executionModel: 'gpt-image-2', tool: 'image_gen.imagegen', privateField: 'must-not-escape' } });
    throw new Error('Unexpected destination');
  };
  try {
    const secret = { accessToken: 'provider-secret-must-not-leave', accountId: 'provider-account', authType: 'oauth' } as any;
    const model = { id: 'test-model', upstreamId: 'test-model' } as any;
    const chat = await OpenAIAdapter.executeChatCompletion({ messages: [{ role: 'user', content: 'hello' }], stream: true } as any, secret, model);
    assert.equal(chat.response.status, 200);
    await chat.response.text();
    const image = await OpenAIAdapter.executeImageGeneration({ prompt: 'test' } as any, secret, model);
    assert.deepEqual(image.execution, { requestedModel: 'test-model', executionModel: 'gpt-image-2', routingMode: 'codex_image_tool_alias', tool: 'image_gen.imagegen', imageModelSelection: 'provider_managed' });
    assert(!JSON.stringify(image).includes('must-not-escape'));
    assert.deepEqual(paths, ['/v1/chat/completions', '/v1/jobs/test-job/stream', '/v1/images/generations']);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous.url === undefined) delete process.env.VM_RELAY_URL; else process.env.VM_RELAY_URL = previous.url;
    if (previous.key === undefined) delete process.env.VM_RELAY_API_KEY; else process.env.VM_RELAY_API_KEY = previous.key;
  }
});
