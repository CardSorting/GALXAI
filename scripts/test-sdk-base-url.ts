import assert from 'node:assert/strict';
import { GalxAIClientCore } from '../src/sdk/client';
import { GALX_API_BASE_URL } from '../src/sdk/base-url';

const names = ['GALXAI_BASE_URL', 'GALX_BASE_URL', 'NEXT_PUBLIC_GALXAI_BASE_URL', 'NEXT_PUBLIC_GALX_BASE_URL', 'OPENAI_BASE_URL', 'NEXT_PUBLIC_GALX_EDGE_URL', 'GALX_EDGE_URL'];
const saved = new Map(names.map(name => [name, process.env[name]]));
try {
  for (const name of names) delete process.env[name];
  const core = () => new GalxAIClientCore({ apiKey: 'test-only', maxRetries: 0 });
  assert.equal(core().baseURL, 'https://galx.ai/v1');
  process.env.NEXT_PUBLIC_GALX_EDGE_URL = 'https://api.galx.ai';
  process.env.GALX_EDGE_URL = 'https://api-staging.galx.ai';
  assert.equal(core().baseURL, GALX_API_BASE_URL, 'Worker deployment settings must not redirect SDK traffic.');
  process.env.GALXAI_BASE_URL = 'http://localhost:3000/v1/';
  assert.equal(core().baseURL, 'http://localhost:3000/v1');
  assert.equal(new GalxAIClientCore({ apiKey: 'test-only', baseURL: 'https://custom.example/v1/' }).baseURL, 'https://custom.example/v1');
  delete process.env.GALXAI_BASE_URL;
  let actualUrl = '';
  const client = new GalxAIClientCore({ apiKey: 'test-only', maxRetries: 0, fetch: async input => {
    actualUrl = String(input);
    return new Response(JSON.stringify({ object: 'list', data: [] }), { headers: { 'content-type': 'application/json' } });
  } });
  await client.request('/models');
  assert.equal(actualUrl, 'https://galx.ai/v1/models');
  console.log('PASS: canonical base URL, Worker-setting isolation, explicit overrides, and request URL composition.');
} finally {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
}
