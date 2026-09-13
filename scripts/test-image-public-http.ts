import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import sharp from 'sharp';
import { NextRequest } from 'next/server';
import { GET as getAsset } from '../src/app/v1/images/assets/[token]/route';
import { GET as getStream } from '../src/app/v1/images/requests/[id]/stream/route';
import { ImageLibraryRepository } from '../src/lib/supabase/repositories/ImageLibraryRepository';
import { GalxR2AssetAdapter } from '../src/workers/cloudflare/GalxR2AssetAdapter';
import { GalxQueueEventBus } from '../src/core/queue/GalxQueueEventBus';
import { updateSession } from '../src/utils/supabase/middleware';
import { GET as schema } from '../src/app/api/openapi.json/route';
import { logImageFailure } from '../src/lib/security/private-image-diagnostics';
import { POST } from '../src/app/v1/images/generations/route';
import { GET as getTask } from '../src/app/v1/images/requests/[id]/route';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '../src/core/subscription/GalxSeatTierEngine';
import { ImageRequestService } from '../src/lib/images/request-service';
import { galxRouter } from '../src/core/router/GalxModelRouter';
import { ImageCapacityError } from '../src/core/router/ImageCapacityError';
import { RelayDispatchError } from '../src/core/router/adapters/RelayChatTransport';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import { sanitizeImageArtifact } from '../src/lib/security/image-artifact';
import { serveImageRequest } from '../src/sdk/server-image';

const secret = 'PRIVATE_CANARY_shard_relay_checkpoint_deployment';
const forbidden = /PRIVATE_CANARY|shard|relay|checkpoint|deployment|provider|stack|\/private\/|internal\.example|sk-secret|execution|modelUsed/i;
const fixture = await sharp({ create: { width: 8, height: 6, channels: 4, background: { r: 40, g: 80, b: 120, alpha: .5 } } })
  .withExif({ IFD0: { Software: secret, ImageDescription: 'https://internal.example/private/bucket' } })
  .withXmp(`<x:xmpmeta xmlns:x="adobe:ns:meta/">${secret}</x:xmpmeta>`).png().toBuffer();
const result = { created: 1, modelUsed: secret, shardId: secret, execution: { provider: secret }, future: secret,
  data: [{ b64_json: fixture.toString('base64'), url: 'https://internal.example/private/bucket', revised_prompt: secret, worker: secret }] };

async function inspectArtifact(response: Response, format = 'png') {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), `image/${format}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(forbidden.test(bytes.toString('latin1')), false);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, format);
  assert.equal(metadata.width, 8);
  assert.equal(metadata.height, 6);
  for (const key of ['exif', 'xmp', 'iptc', 'comments']) assert.equal((metadata as any)[key], undefined);
  if (format !== 'jpeg') assert.equal(metadata.hasAlpha, true);
}

// The HTTP adapter serializes the actual application Response without interpreting its body.
// All assertions below use a real HTTP client's bytes and headers.
test('raw image HTTP boundary: success, compatibility, errors, async and adversarial fields', async t => {
  const restore = [GalxAuthEngine.getInstance, GalxSeatTierEngine.getInstance, galxRouter.routeImageGeneration, ImageRequestService.getInstance, ImageLibraryRepository.getInstance, GalxR2AssetAdapter.getInstance, GalxQueueEventBus.getInstance];
  let authenticated = true, capped = false, failure: unknown, calls = 0;
  let task: any = { id: 'opaque-task', user_id: 'customer', state: 'queued', asset_ids: ['asset'], queueId: secret, lastError: { message: secret },
    target: { type: 'INTERNAL_MODEL', taskKind: 'image_generation' }, result: { data: result, shardId: secret } };
  GalxAuthEngine.getInstance = () => ({ resolveAuthIdentity: async () => ({ authenticated, userId: authenticated ? 'customer' : undefined }) }) as any;
  GalxSeatTierEngine.getInstance = () => ({ resolveUserSeatTier: async () => ({ isCapped: capped, isPriorityUser: false }) }) as any;
  ImageRequestService.getInstance = () => ({ create: async () => task, resume: () => {}, repository: { get: async () => task } }) as any;
  galxRouter.routeImageGeneration = async () => { calls++; if (failure) throw failure; return result as any; };
  ImageLibraryRepository.getInstance = () => ({ getAsset: async (userId: string, assetId: string) => userId === 'customer' && assetId === 'asset' ? { r2Key: secret } : null }) as any;
  GalxR2AssetAdapter.getInstance = () => ({ getAssetBuffer: async () => fixture }) as any;
  GalxQueueEventBus.getInstance = () => ({ subscribeTask: () => () => {} }) as any;
  const server = createServer(async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const request = new NextRequest(`http://127.0.0.1${req.url}`, { method: req.method, headers: req.headers as any,
        ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) });
      const response = req.method === 'POST' ? await POST(request)
        : req.url?.startsWith('/asset/') ? await getAsset(request, { params: Promise.resolve({ token: req.url.slice(7) }) })
        : req.url?.startsWith('/stream') ? await getStream(request, { params: Promise.resolve({ id: 'opaque-task' }) })
        : await getTask(request, { params: Promise.resolve({ id: 'opaque-task' }) });
      const middleware = await updateSession(new NextRequest('https://galx.ai/v1/images/generations'));
      middleware.headers.forEach((value, key) => { if (!key.startsWith('x-middleware-')) response.headers.set(key, value); });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch { res.writeHead(500); res.end('test harness failure'); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const send = (body: unknown = { prompt: 'a flower' }, headers: Record<string, string> = {}) => fetch(origin, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const checkHeaders = (response: Response) => {
    assert.equal(forbidden.test(JSON.stringify(Object.fromEntries(response.headers))), false);
    for (const header of ['server-timing', 'x-edge-fastpath', 'x-galx-route-classification', 'x-galx-router', 'x-powered-by']) assert.equal(response.headers.get(header), null);
    assert.match(response.headers.get('x-request-id')!, /^[a-f0-9-]{36}$/);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  };
  const checkError = async (response: Response, status: number, code: string) => {
    checkHeaders(response); assert.equal(response.status, status);
    const raw = await response.text(); assert.equal(forbidden.test(raw), false);
    const body = JSON.parse(raw); assert.deepEqual(Object.keys(body), ['error']);
    assert.deepEqual(Object.keys(body.error).sort(), ['code', 'message', 'request_id']); assert.equal(body.error.code, code);
  };
  try {
    await t.test('default binary and conversions discard metadata', async () => {
      for (const output_format of ['png', 'jpeg', 'webp']) {
        const response = await send({ prompt: 'flower', output_format }); checkHeaders(response); await inspectArtifact(response, output_format);
      }
      await inspectArtifact(await send());
    });
    await t.test('JSON is an exact allowlist, including unknown future fields', async () => {
      for (const format of ['b64_json', 'url']) {
        const response = await send({ prompt: 'flower', response_format: format }); checkHeaders(response);
        const raw = await response.text(); assert.equal(forbidden.test(raw), false);
        const json = JSON.parse(raw); assert.deepEqual(Object.keys(json).sort(), ['created', 'data']);
        assert.deepEqual(Object.keys(json.data[0]), [format]);
        const b64 = format === 'url' ? json.data[0].url.split(',')[1] : json.data[0].b64_json;
        await inspectArtifact(new Response(Buffer.from(b64, 'base64'), { headers: { 'content-type': 'image/png' } }));
      }
      assert.equal((await send({ prompt: 'flower' }, { accept: 'application/json' })).headers.get('content-type'), 'application/json');
    });
    await t.test('malformed and unauthorized requests never dispatch', async () => {
      const before = calls;
      for (const body of ['{', null, [], {}, { prompt: 'x', n: 2 }]) await checkError(await send(body), 400, 'invalid_request');
      for (const body of [{ prompt: 'x', model: secret }, { prompt: 'x', output_format: 'svg' }]) await checkError(await send(body), 400, 'unsupported_input');
      authenticated = false; await checkError(await send(), 401, 'unauthorized'); authenticated = true;
      capped = true; await checkError(await send(), 429, 'rate_limited'); capped = false;
      assert.equal(calls, before);
    });
    await t.test('errors, exhausted retry paths, capacity and timeouts are generic', async () => {
      for (const [error, status, code] of [
        [Object.assign(new Error(`${secret} sk-secret /private/container https://internal.example`), { name: 'ProviderException' }), 502, 'generation_failed'],
        [new RelayDispatchError('all_attempts_failed'), 503, 'temporarily_unavailable'],
        [new RelayDispatchError('image_deadline_or_cancelled'), 504, 'timeout'],
        [new ImageCapacityError(Date.now() + 30000), 503, 'temporarily_unavailable'],
        [Object.assign(new Error(secret), { status: 429 }), 429, 'rate_limited'],
      ] as const) {
        failure = error; const before = calls; const response = await send();
        assert.equal(response.headers.get('x-should-retry'), 'false');
        await checkError(response, status, code); assert.equal(calls, before + 1);
      }
      failure = undefined;
    });
    await t.test('async creation and retrieval expose customer state only', async () => {
      const response = await send({ prompt: 'flower' }, { prefer: 'respond-async' });
      assert.equal(response.status, 202); const body = await response.json();
      assert.deepEqual(Object.keys(body).sort(), ['id', 'status', 'task_url']);
      assert.equal(forbidden.test(JSON.stringify(body)), false);
      const pending = await fetch(origin); assert.equal(pending.status, 202);
      assert.deepEqual(await pending.json(), { id: task.id, status: 'queued' });
      task.state = 'completed'; await inspectArtifact(await fetch(origin));
      const snapshot = await (await fetch(`${origin}?snapshot=true`)).json();
      assert.equal(forbidden.test(JSON.stringify(snapshot)), false);
      assert.deepEqual(Object.keys(snapshot.task).sort(), ['id', 'result', 'status']);
      const streamResponse = await fetch(`${origin}/stream`); checkHeaders(streamResponse);
      assert.equal(streamResponse.headers.get('content-type'), 'text/event-stream');
      const stream = await streamResponse.text(); assert.equal(forbidden.test(stream), false);
      assert.match(stream, /event: progress/); assert.match(stream, /"status":"completed"/);
      const token = GalxCryptoVault.sealImageDownload('customer', 'asset');
      await inspectArtifact(await fetch(`${origin}/asset/${token}`));
      await checkError(await fetch(`${origin}/asset/invalid-token`), 404, 'not_found');
      task.result.data = { data: [{ asset_id: 'asset', url: 'https://internal.example/private/bucket' }], shardId: secret };
      await inspectArtifact(await fetch(origin));
      task.result.data = result;
      task.response_format = 'url';
      const links = await (await fetch(origin, { headers: { accept: 'application/json' } })).json();
      assert.deepEqual(Object.keys(links.data[0]), ['url']);
      assert(links.data[0].url.startsWith('https://galx.ai/v1/images/assets/'));
      assert.equal(forbidden.test(JSON.stringify(links)), false);
      task.output_format = 'jpeg'; await inspectArtifact(await fetch(origin), 'jpeg');
      task.output_format = undefined;
      task.state = 'failed'; await checkError(await fetch(origin), 502, 'generation_failed');
      task.user_id = 'someone-else'; await checkError(await fetch(origin), 404, 'not_found');
    });
  } finally {
    [GalxAuthEngine.getInstance, GalxSeatTierEngine.getInstance, galxRouter.routeImageGeneration, ImageRequestService.getInstance, ImageLibraryRepository.getInstance, GalxR2AssetAdapter.getInstance, GalxQueueEventBus.getInstance] = restore as any;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('artifact decoder rejects nonimages and metadata is removed in every supported source format', async () => {
  for (const format of ['png', 'jpeg', 'webp'] as const) {
    const contaminated = await sharp(fixture).withMetadata().withXmp(`<x:xmpmeta xmlns:x="adobe:ns:meta/">${secret}</x:xmpmeta>`).toFormat(format).toBuffer();
    const artifact = await sanitizeImageArtifact(contaminated);
    assert.equal(artifact.bytes.includes(Buffer.from(secret)), false);
    assert.equal((await sharp(artifact.bytes).metadata()).xmp, undefined);
  }
  for (const bad of [Buffer.from('not an image'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')]) await assert.rejects(sanitizeImageArtifact(bad));
});

test('download capability is opaque, authenticated, expiring and purpose bound', () => {
  const token = GalxCryptoVault.sealImageDownload('customer', 'asset');
  assert.deepEqual(GalxCryptoVault.openImageDownload(token), { userId: 'customer', assetId: 'asset' });
  assert.equal(Buffer.from(token, 'base64url').includes(Buffer.from('customer')), false);
  const corrupted = Buffer.from(token, 'base64url'); corrupted[20] ^= 1;
  assert.equal(GalxCryptoVault.openImageDownload(corrupted.toString('base64url')), undefined);
  assert.equal(GalxCryptoVault.openImageDownload(GalxCryptoVault.sealImageDownload('customer', 'asset', -1)), undefined);
  assert.equal(GalxCryptoVault.openImageDownload('not-a-valid-capability'), undefined);
  assert.equal(GalxCryptoVault.openImageDownload(GalxCryptoVault.sealAffinityTicket('private-shard')), undefined);
});

test('SDK server adapters sanitize outputs and never fabricate success on failure', async () => {
  const client = { images: { generate: async () => result } } as any;
  const request = () => new Request('https://example.test', { method: 'POST', body: JSON.stringify({ prompt: 'flower' }) });
  await inspectArtifact(await serveImageRequest(client, request()));
  client.images.generate = async () => { throw new Error(secret); };
  const response = await serveImageRequest(client, request());
  assert.equal(response.status, 502); assert.equal(forbidden.test(await response.text()), false);
});


test('OpenAPI defines binary output and closes every JSON object', async () => {
  const spec = await (await schema()).json();
  const outputs = spec.paths['/images/generations'].post.responses;
  assert.deepEqual(Object.keys(outputs['200'].content).sort(), ['application/json', 'image/jpeg', 'image/png', 'image/webp']);
  for (const output of Object.values(outputs) as any[]) {
    const shape = output.content['application/json'].schema;
    const visit = (node: any) => {
      if (node.type === 'object') assert.equal(node.additionalProperties, false);
      if (node && typeof node === 'object') for (const child of Object.values(node)) if (typeof child === 'object') visit(child);
    };
    visit(shape);
  }
});

test('private diagnostics omit arbitrary provider message payloads and credentials', () => {
  const original = console.error; const entries: any[] = [];
  console.error = (...args) => { entries.push(args); };
  try {
    logImageFailure('opaque-id', Object.assign(new Error('my private prompt Bearer arbitrary-secret sk-secret password=secret'), { status: 503 }));
    const text = JSON.stringify(entries);
    assert.doesNotMatch(text, /private prompt|arbitrary-secret|sk-secret|password=secret/);
    assert.match(text, /opaque-id/); assert.match(text, /503/); assert.match(text, /frames/);
  } finally { console.error = original; }
});

test('alternate gateway projects JSON and maps upstream HTML failures', async () => {
  const { GalxEdgeGateway } = await import('../src/workers/cloudflare/GalxEdgeGateway');
  const originalFetch = globalThis.fetch;
  try {
    const gateway = new GalxEdgeGateway({ SUPABASE_URL: 'https://unused.example' });
    globalThis.fetch = async (_url, init) => {
      assert.equal(init?.redirect, 'manual');
      return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json', 'x-galx-shard': secret } });
    };
    const request = () => new Request('https://api.galx.ai/v1/images/generations', { method: 'POST', headers: { authorization: 'Bearer customer' }, body: '{"prompt":"flower"}' });
    const response = await gateway.handleRequest(request());
    assert.equal(response.headers.get('x-galx-shard'), null);
    const json = await response.json();
    assert.deepEqual(Object.keys(json).sort(), ['created', 'data']);
    assert.deepEqual(Object.keys(json.data[0]), ['b64_json']);
    globalThis.fetch = async () => new Response(`<html>${secret}</html>`, { status: 502, headers: { 'content-type': 'text/html' } });
    const error = await gateway.handleRequest(request());
    assert.equal(error.status, 503); assert.equal(forbidden.test(await error.text()), false);
    for (const status of [301,302,303,307,308]) {
      let calls = 0;
      globalThis.fetch = async (_url, init) => {
        calls++; assert.equal(init?.redirect, 'manual');
        return new Response(JSON.stringify(result), {status, headers:{'content-type':'application/json',location:'https://untrusted.example/collect'}});
      };
      const redirect = await gateway.handleRequest(request());
      assert.equal(redirect.status,503); assert.equal(redirect.headers.get('location'),null); assert.equal(calls,1);
      assert.doesNotMatch(await redirect.text(),/untrusted|collect/);
    }
  } finally { globalThis.fetch = originalFetch; }
});
