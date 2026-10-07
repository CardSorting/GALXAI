/** Historical command name retained; this is an isolated storage contract test.
 * The runner owns the disposable PostgreSQL database; object HTTP is synthetic.
 * Never load dotenv, generate billable images or purge a production session here.
 */
import './lib/require-isolated-integration-env';
import './lib/integration-no-network';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import sharp from 'sharp';

// No real credentials or HTTP: exercise the signed storage transport with a
// closed in-memory fixture, including the missing-configuration boundary.
const envKeys = ['R2_PRIVATE_IMAGES_BUCKET_NAME', 'R2_ASSETS_BUCKET_NAME',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const;
const oldEnv = new Map(envKeys.map(key => [key, process.env[key]]));
process.env.R2_PRIVATE_IMAGES_BUCKET_NAME = 'private-image-fixture';
process.env.R2_ASSETS_BUCKET_NAME = 'public-asset-fixture';
const previousFetch = globalThis.fetch;
const objects = new Map<string, { bytes: Buffer; headers: Headers }>();
let requests = 0;
globalThis.fetch = async (input, init) => {
  requests++;
  const url = new URL(String(input));
  assert.equal(url.origin, 'https://fixture-account.r2.cloudflarestorage.com');
  const headers = new Headers(init?.headers);
  assert.match(headers.get('authorization') || '', /^AWS4-HMAC-SHA256 Credential=fixture-access\//);
  const objectPath = decodeURIComponent(url.pathname);
  assert.match(objectPath, /^\/(?:private-image|public-asset)-fixture\//);
  if (url.searchParams.get('list-type') === '2') {
    assert.equal(init?.method, 'GET');
    const prefix = `${objectPath}${url.searchParams.get('prefix') || ''}`;
    const entries = [...objects].filter(([key]) => key.startsWith(prefix));
    const xml = entries.map(([key, object]) => `<Contents><Key>${key.slice(objectPath.length)}</Key><Size>${object.bytes.length}</Size><LastModified>2026-10-07T00:00:00Z</LastModified><ETag>fixture-etag</ETag></Contents>`).join('');
    return new Response(`<ListBucketResult>${xml}<IsTruncated>false</IsTruncated></ListBucketResult>`);
  }
  if (init?.method === 'PUT') {
    assert(objectPath.startsWith('/private-image-fixture/private/'));
    assert(![...headers.keys()].some(key => key.startsWith('x-amz-meta-')));
    if (headers.get('content-type') === 'image/png') assert.equal(headers.get('cache-control'), 'private, no-store');
    const bytes = Buffer.from(init.body as Uint8Array);
    objects.set(objectPath, { bytes, headers: new Headers({ 'content-type': headers.get('content-type')!,
      'content-length': String(bytes.length), etag: 'fixture-etag' }) });
    return new Response(null, { headers: { etag: 'fixture-etag' } });
  }
  assert(['GET', 'HEAD'].includes(init?.method || ''), 'Unexpected fixture storage operation');
  const object = objects.get(objectPath);
  if (!object) return new Response(null, { status: 404 });
  return new Response(init?.method === 'HEAD' ? null : new Uint8Array(object.bytes), { headers: object.headers });
};
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
globalThis.__galx_pg_pool = pool;
const owner = randomUUID(), session = randomUUID(), foreignOwner = randomUUID();
// Some application imports construct the storage singleton. Set fixture bucket
// names first, while deliberately withholding credentials for the denial check.
const { GalxR2AssetAdapter } = await import('../src/workers/cloudflare/GalxR2AssetAdapter');
const { GalxUnifiedR2StorageManager } = await import('../src/core/storage/GalxUnifiedR2StorageManager');
const { ImageLibraryRepository } = await import('../src/lib/supabase/repositories/ImageLibraryRepository');
const adapter = GalxR2AssetAdapter.getInstance();
const storage = GalxUnifiedR2StorageManager.getInstance();
const repository = ImageLibraryRepository.getInstance();
let checks = 0;
try {
  assert.equal(storage.isConfigured(), false, 'Fixture has no remote object credentials'); checks++;
  await assert.rejects(adapter.uploadUserSessionImage({ userId: owner, sessionId: session, data: Buffer.alloc(0) }),
    /Private image storage unavailable/);
  assert.equal(requests, 0, 'Missing storage configuration rejects before HTTP or catalog work'); checks++;
  assert.equal((await pool.query('SELECT count(*)::integer AS count FROM public.user_image_library WHERE user_id=$1', [owner])).rows[0].count, 0); checks++;
  process.env.R2_ACCOUNT_ID = 'fixture-account';
  process.env.R2_ACCESS_KEY_ID = 'fixture-access';
  process.env.R2_SECRET_ACCESS_KEY = 'fixture-secret';
  assert.equal(storage.isPrivateImageStorageConfigured(), true); checks++;
  const png = await sharp({ create: { width: 1, height: 1, channels: 4, background: '#4f46e5' } })
    .withExif({ IFD0: { Software: 'ISOLATED_STORAGE_METADATA_CANARY' } })
    .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/">ISOLATED_STORAGE_METADATA_CANARY</x:xmpmeta>')
    .png().toBuffer();
  const uploaded = await adapter.uploadUserSessionImage({
    userId: owner, sessionId: session, data: png, contentType: 'image/png',
    prompt: 'Test synthetic circuit blueprint', model: 'image', size: '1x1',
  });
  await repository.flushSync();
  assert(uploaded.key.startsWith(`private/users/${owner}/sessions/${session}/images/`));
  assert.equal(uploaded.bucket, 'private-image-fixture');
  assert.match(new URL(uploaded.publicUrl).pathname, /^\/v1\/images\/assets\/[A-Za-z0-9_.-]+$/); checks++;
  const row = await repository.getAsset(owner, uploaded.assetId);
  assert(row); assert.equal(row.r2Key, uploaded.key); assert.equal(row.sha256, uploaded.sha256); checks++;
  assert.equal(await repository.getAsset(foreignOwner, uploaded.assetId), null); checks++;
  const original = await storage.getObject('images', uploaded.key, false);
  assert.equal(original.data.length, uploaded.sizeBytes);
  assert(!original.data.includes(Buffer.from('ISOLATED_STORAGE_METADATA_CANARY')));
  const metadata = await sharp(original.data).metadata();
  assert.equal(metadata.exif, undefined); assert.equal(metadata.xmp, undefined); checks++;
  const decoded = await sharp(original.data).raw().toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.width, 1); assert.equal(decoded.info.height, 1); checks++;
  const manifest = await adapter.getSessionManifest(owner, session);
  assert.equal(manifest?.totalImages, 1); assert.equal(manifest.totalBytes, uploaded.sizeBytes); checks++;
  const listed = await adapter.listSessionImages(owner, session);
  assert.equal(listed.length, 1); assert.equal(listed[0].assetId, uploaded.assetId); checks++;
  assert.equal((await adapter.listSessionImages(foreignOwner, session)).length, 0); checks++;
  const page = await repository.getLibrary(owner, { limit: 36, includeSummary: false });
  assert.equal(page.records.length, 1); assert.equal(page.records[0].id, uploaded.assetId); checks++;
  // Assert both halves still exist when the runner destroys the entire fixture.
  // Object-only cleanup was what left a completed production row dangling.
  assert((await storage.headObject('images', uploaded.key)).exists);
  assert(await repository.getAsset(owner, uploaded.assetId)); checks++;
  assert.equal([...objects.keys()].filter(key => key.startsWith('/public-asset-fixture/')).length, 0); checks++;
  console.log(JSON.stringify({ checks, database: 'disposable', objects: 'synthetic signed HTTP transport', liveGeneration: false }));
} finally {
  try {
    // Also clean this run's records if the operator supplied an explicit local
    // test database instead of asking the runner to create a disposable one.
    await pool.query('DELETE FROM public.user_image_library WHERE user_id=$1 AND session_id=$2', [owner, session]);
  } finally {
    objects.clear();
    globalThis.fetch = previousFetch;
    for (const key of envKeys) {
      const value = oldEnv.get(key);
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await pool.end();
    globalThis.__galx_pg_pool = undefined;
  }
}
