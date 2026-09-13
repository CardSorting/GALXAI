import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import sharp from 'sharp';
import { NextRequest } from 'next/server';
import { GET as library } from '../src/app/api/images/library/route';
import { GET as details } from '../src/app/api/images/library/[assetId]/route';
import { GET as thumbnail } from '../src/app/v1/images/assets/[token]/thumbnail/route';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { ImageLibraryRepository } from '../src/lib/supabase/repositories/ImageLibraryRepository';
import { GalxR2AssetAdapter } from '../src/workers/cloudflare/GalxR2AssetAdapter';
import { isPublicProductPath } from '../src/lib/security/preview-policy';

test('thumbnail delivery is an explicit public-product path, without exempting arbitrary child routes', () => {
  for (const path of ['/v1/images/assets/token','/v1/images/assets/token/thumbnail']) assert.equal(isPublicProductPath(path), true);
  for (const path of ['/v1/images/assets/token/private','/v1/images/assets/token/thumbnail/private','/v1/images/assets/token/thumbnail/../../private']) assert.equal(isPublicProductPath(path), false);
});

test('raw library and thumbnail HTTP: compact DTOs, full details, sanitization, coalescing, authorization and recovery', async t => {
  const original = [GalxAuthEngine.getInstance, ImageLibraryRepository.getInstance, GalxR2AssetAdapter.getInstance];
  const canary = 'PRIVATE_CANARY_storage_upstream_diagnostic';
  const artifact = await sharp({ create: { width: 1536, height: 1024, channels: 4, background: '#4f46e5' } })
    .withExif({ IFD0: { Software: canary } }).withXmp(`<x:xmpmeta xmlns:x="adobe:ns:meta/">${canary}</x:xmpmeta>`).png().toBuffer();
  let authenticated = true, exists = true, unavailable = false, storageReads = 0, ownerChecks = 0;
  const record = { id: 'scale-image', userId: 'owner', status: 'completed', sessionId: 'default', prompt: 'Beautiful '.repeat(2000),
    aspectRatio: '3:2', isFavorite: false, quality: 'standard', createdAt: '2026-09-01T00:00:00.123456Z', updatedAt: '2026-09-01T00:00:00Z',
    sha256: 'a'.repeat(64), r2Key: canary, model: canary, dimensions: '1536x1024', tags: [], metadata: { future: canary } };
  GalxAuthEngine.getInstance = () => ({ resolveAuthIdentity: async () => ({ authenticated, userId: authenticated ? 'owner' : null }) }) as any;
  ImageLibraryRepository.getInstance = () => ({
    getLibrary: async (owner: string, options: any) => {
      assert.equal(owner, 'owner'); assert.equal(options.includeSummary, false);
      if (unavailable) throw new Error(canary);
      return { records: [record], totalCount: null, stats: null, availableSessions: [], nextCursor: null, previousCursor: null };
    },
    getAsset: async (owner: string, id: string) => {
      ownerChecks++;
      if (unavailable) throw new Error(canary);
      return exists && owner === 'owner' && id === record.id ? record : null;
    },
  }) as any;
  GalxR2AssetAdapter.getInstance = () => ({ getAssetBuffer: async () => { storageReads++; await new Promise(resolve => setTimeout(resolve, 10)); return artifact; } }) as any;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url!, 'http://localhost'); const request = new NextRequest(url);
      const response = url.pathname === '/api/images/library' ? await library(request)
        : url.pathname.startsWith('/api/images/library/') ? await details(request, { params: Promise.resolve({ assetId: url.pathname.split('/').at(-1)! }) })
        : await thumbnail(request, { params: Promise.resolve({ token: url.pathname.split('/')[4] }) });
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
    } catch { res.writeHead(500); res.end('fixture failed'); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const token = GalxCryptoVault.sealImageDownload('owner', record.id);
  const path = `/v1/images/assets/${token}/thumbnail`;
  try {
    await t.test('compact cards use an exact allowlist and details retain the full prompt', async () => {
      const response = await fetch(`${origin}/api/images/library?summary=none&limit=36`);
      assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store');
      const raw = await response.text(); assert(!raw.includes(canary)); const data = JSON.parse(raw);
      assert.equal(data.total, null); assert.equal(data.stats, null); assert.equal(data.records[0].promptPreview.length, 300);
      assert.deepEqual(Object.keys(data.records[0]).sort(), ['aspectRatio','createdAt','id','isFavorite','promptPreview','publicUrl','quality','status','thumbnailUrl'].sort());
      assert(data.records[0].thumbnailUrl.endsWith('/thumbnail')); assert.equal(data.records[0].prompt, undefined);
      const detail = await (await fetch(`${origin}/api/images/library/${record.id}`)).json();
      assert.equal(detail.record.prompt, record.prompt); assert(!JSON.stringify(detail).includes(canary));
    });
    await t.test('thumbnail bytes are resized and freshly encoded, identical requests share storage work', async () => {
      const responses = await Promise.all(Array.from({ length: 100 }, () => fetch(origin + path)));
      for (const response of responses) {
        assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/webp');
        assert.equal(response.headers.get('cache-control'), 'private, no-store');
        const bytes = Buffer.from(await response.arrayBuffer()); assert(bytes.byteLength < 512 * 1024); assert(!bytes.includes(canary));
        const meta = await sharp(bytes).metadata(); assert.equal(meta.width, 512); assert.equal(meta.height, 341);
        for (const key of ['exif','xmp','iptc','comments']) assert.equal((meta as any)[key], undefined);
      }
      assert.equal(storageReads, 1); assert(ownerChecks >= 100, 'authorization is not skipped on a thumbnail cache hit');
    });
    await t.test('expired, foreign and deleted capabilities cannot read warm thumbnails', async () => {
      const invalid = [GalxCryptoVault.sealImageDownload('foreign',record.id), GalxCryptoVault.sealImageDownload('owner',record.id,-1), 'invalid'];
      for (const value of invalid) assert.equal((await fetch(`${origin}/v1/images/assets/${value}/thumbnail`)).status, 404);
      exists = false; assert.equal((await fetch(origin + path)).status, 404); exists = true;
      assert.equal(storageReads, 1);
    });
    await t.test('invalid filters, authentication and storage outages have safe explicit failures', async () => {
      assert.equal((await fetch(`${origin}/api/images/library?summary=none&limit=99999`)).status, 400);
      authenticated = false; assert.equal((await fetch(`${origin}/api/images/library?summary=none`)).status, 401); authenticated = true;
      unavailable = true;
      for (const endpoint of ['/api/images/library?summary=none', path]) {
        const response = await fetch(origin + endpoint); assert.equal(response.status, 503);
        assert.equal(response.headers.get('retry-after'), '3'); assert.equal(response.headers.get('cache-control'), 'private, no-store');
        assert(!(await response.text()).includes(canary));
      }
      unavailable = false; assert.equal((await fetch(origin + path)).status, 200);
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    [GalxAuthEngine.getInstance, ImageLibraryRepository.getInstance, GalxR2AssetAdapter.getInstance] = original as any;
  }
});
