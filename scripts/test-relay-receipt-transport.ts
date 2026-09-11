import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { readRelayReceipt } from '../src/core/router/adapters/RelayChatTransport';

test('receipt reads enforce identity, terminal evidence, body bounds and a public field allowlist', async () => {
  const valid = { id: 'job', status: 'completed', output: 'hello', usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }, retainedUntil: Date.now()+86400000 };
  let result: any = valid, requests = 0, redirect = false;
  const server = http.createServer((req, res) => {
    requests++; assert.equal(req.method, 'GET'); assert.equal(req.url, '/v1/jobs/job/receipt'); assert.equal(req.headers.authorization, 'Bearer fixture');
    if (redirect) { res.writeHead(302, { location: '/must-not-follow' }); res.end(); return; }
    res.writeHead(200, { 'content-type': 'application/json', 'x-private': 'must-not-escape' }); res.end(JSON.stringify(result));
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const options = { url: `http://127.0.0.1:${(server.address() as any).port}`, key: 'fixture', jobId: 'job', signal: AbortSignal.timeout(10000) };
  try {
    result = { ...valid, token: 'private', usage: { ...valid.usage, internal: 'private' } };
    assert.deepEqual(await readRelayReceipt(options), valid);
    for (const changed of [{ id: 'other' }, { status: 'not_started' }, { status: 'unknown' }, { retainedUntil: Date.now()-1 },
      { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 99 } }, { usage: {} }, { usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } },
      { output: 'a'.repeat(12001) }, { padding: 'a'.repeat(96001) }]) {
      result = { ...valid, ...changed };
      await assert.rejects(readRelayReceipt(options), e => e instanceof Error && !e.message.includes('private'));
    }
    result = { ...valid, status: 'not_started', output: null, usage: null };
    assert.equal((await readRelayReceipt(options)).status, 'not_started');
    redirect = true; const before = requests; await assert.rejects(readRelayReceipt(options)); assert.equal(requests, before+1);
  } finally { await new Promise<void>(r => server.close(() => r())); }
});

test('receipt references reject path traversal, credentials and nonlocal cleartext origins before fetching', async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Unexpected fetch'); };
  const base = { url: 'https://relay.example', key: 'fixture', jobId: 'job', signal: new AbortController().signal };
  try {
    for (const changed of [{ url: 'http://relay.example' }, { url: 'https://secret@relay.example' },
      { url: 'https://relay.example/path' }, { url: 'https://relay.example?token=private' },
      { jobId: '../other' }, { jobId: 'other/receipt' }, { jobId: '%2e%2e' }, { key: '' }]) await assert.rejects(readRelayReceipt({ ...base, ...changed }));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});
