import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GalxConnection } from '../src/sdk/connect';
const options = { clientId: 'studio', issuer: 'https://galx.test', resource: 'https://nova.test', redirectUri: 'https://studio.test/callback' };
const token = { access_token: 'galx_connect_at_' + 'a'.repeat(43), refresh_token: 'galx_connect_rt_' + 'b'.repeat(43), expires_in: 300, token_type: 'Bearer', scope: 'inference:invoke' };
async function connected(fetch: typeof globalThis.fetch, expires = 300) {
  const client = new GalxConnection({ ...options, fetch });
  const auth = new URL((await client.connect())!);
  const callback = new URL(options.redirectUri); callback.search = new URLSearchParams({ state: auth.searchParams.get('state')!, code: 'c'.repeat(43), iss: options.issuer }).toString();
  await client.connect(callback.href); return client;
}
test('default browser fetch keeps its global receiver across exchange, inference and revocation', async t => {
  const original = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = async function (this: unknown, input) {
    assert.equal(this, globalThis, 'Browser fetch must not receive the connection object as its receiver');
    const path = new URL(String(input)).pathname; paths.push(path);
    return path === '/oauth/token' ? Response.json(token) : new Response(null);
  } as typeof fetch;
  t.after(() => { globalThis.fetch = original; });
  const client = new GalxConnection(options), authorization = new URL((await client.connect())!);
  await client.connect(`${options.redirectUri}?${new URLSearchParams({ code: 'c'.repeat(43), state: authorization.searchParams.get('state')!, iss: options.issuer })}`);
  await client.invoke([{ role: 'user', content: 'Create' }]);
  await client.disconnect();
  assert.deepEqual(paths, ['/oauth/token', '/v1/inference', '/oauth/revoke']);
});
test('PKCE, state, issuer and registered callback are enforced without exposing credentials', async () => {
  let calls = 0;
  const c = await connected(async () => { calls++; return Response.json(token); });
  assert(c.connected); assert.equal(calls, 1); assert.equal(JSON.stringify(c), '{}');
  for (const change of ['state','iss','origin','duplicate']) {
    const client = new GalxConnection({ ...options, fetch: async () => { throw new Error('must not call'); } });
    const auth = new URL((await client.connect())!);
    assert.equal(auth.searchParams.get('code_challenge_method'), 'S256'); assert.equal(auth.searchParams.get('code_challenge')?.length, 43);
    const url = new URL(options.redirectUri); url.search = new URLSearchParams({ code: 'c'.repeat(43), state: auth.searchParams.get('state')!, iss: options.issuer }).toString();
    if (change === 'origin') url.hostname = 'evil.test'; else if (change === 'duplicate') url.searchParams.append('code','a'.repeat(43)); else url.searchParams.set(change,'bad');
    await assert.rejects(client.connect(url.href)); assert(!client.connected);
  }
});
test('runtime uses bearer-only direct inference, never retries busy or unknown outcomes, and disconnects separately', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const c = await connected(async (input, init) => {
    calls.push({ url: String(input), init });
    if (String(input).endsWith('/token')) return Response.json(token);
    if (String(input).endsWith('/revoke')) return new Response(null);
    return Response.json({ error: { code: 'outcome_unconfirmed', execution_state: 'unknown' } }, { status: 503 });
  });
  const r = await c.invoke([{ role: 'user', content: 'Create' }]); assert.equal(r.status, 503); assert(c.connected);
  assert.equal(calls.filter(c => c.url.includes('/inference')).length, 1);
  const invoke = calls.find(c => c.url.includes('/inference'))!;
  assert.equal(invoke.init?.credentials, 'omit'); assert.equal(new Headers(invoke.init?.headers).get('authorization'), 'Bearer ' + token.access_token);
  assert.doesNotMatch(String(invoke.init?.body), /galx_connect_|refresh_token/);
  await c.disconnect(); assert(!c.connected); assert.equal(calls.filter(c => c.url.includes('/revoke')).length, 1);
});
test('concurrent calls rotate once; a lost rotation response requires a new connection instead of token reuse', async () => {
  let tokens = 0, invokes = 0;
  const c = await connected(async input => {
    if (String(input).endsWith('/token')) { tokens++; if (tokens === 1) return Response.json({ ...token, expires_in: 1 }); await new Promise(resolve => setTimeout(resolve, 10)); throw new Error('lost acknowledgement'); }
    invokes++; return new Response('unexpected');
  });
  const results = await Promise.allSettled([c.invoke([{ role: 'user', content: 'one' }]), c.invoke([{ role: 'user', content: 'two' }])]);
  assert(results.every(r => r.status === 'rejected')); assert.equal(tokens, 2); assert.equal(invokes, 0); assert(!c.connected);
});
test('pending storage contains PKCE only and is removed before exchanging a one-use code', async () => {
  const values = new Map<string,string>();
  const storage = { getItem: (k: string) => values.get(k) || null, setItem: (k: string,v: string) => { values.set(k,v); }, removeItem: (k: string) => { values.delete(k); } };
  const first = new GalxConnection({ ...options, pendingStorage: storage }); const auth = new URL((await first.connect())!);
  assert.equal(values.size, 1);
  const second = new GalxConnection({ ...options, pendingStorage: storage, fetch: async () => { assert.equal(values.size, 0); return Response.json(token); } });
  await second.connect(`${options.redirectUri}?${new URLSearchParams({ code: 'c'.repeat(43), state: auth.searchParams.get('state')!, iss: options.issuer })}`);
  assert(second.connected); assert.equal(values.size, 0);
});

test('complete-answer and streaming clients each submit once over SSE, with terminal validation in the default mode', async () => {
  let submissions = 0;
  const wire = 'data: ' + JSON.stringify({ id: 'request-public', object: 'chat.completion.chunk', model: 'galx-nova', choices: [{ index: 0, delta: { content: 'A result.' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n';
  const client = await connected(async (input, init) => {
    if (String(input).endsWith('/token')) return Response.json(token);
    submissions++; assert.equal(JSON.parse(String(init?.body)).stream, true);
    assert.equal(init?.redirect, 'error'); assert.equal(init?.credentials, 'omit');
    return new Response(wire, { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const complete = await client.invoke([{ role: 'user', content: 'Create' }]);
  assert.equal((await complete.json()).choices[0].message.content, 'A result.'); assert.equal(submissions, 1);
  const stream = await client.invoke([{ role: 'user', content: 'Create' }], { stream: true });
  assert.match(stream.headers.get('content-type')!, /text\/event-stream/); assert.equal(await stream.text(), wire); assert.equal(submissions, 2);
});
