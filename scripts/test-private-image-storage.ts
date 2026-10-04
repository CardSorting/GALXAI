import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

test('human artifacts use a distinct private bucket and sanitized bytes', async () => {
  const envKeys = [
    'R2_PRIVATE_IMAGES_BUCKET_NAME', 'R2_IMAGES_BUCKET_NAME', 'R2_ASSETS_BUCKET_NAME',
    'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
  ] as const;
  const oldEnv = new Map(envKeys.map(key => [key, process.env[key]]));
  process.env.R2_PRIVATE_IMAGES_BUCKET_NAME = 'galxai-private-images-fixture';
  process.env.R2_ASSETS_BUCKET_NAME = 'galxai-assets-fixture';
  process.env.R2_ACCOUNT_ID = 'fixture-account';
  process.env.R2_ACCESS_KEY_ID = 'fixture-access';
  process.env.R2_SECRET_ACCESS_KEY = 'fixture-secret';

  const [{ GalxUnifiedR2StorageManager }, { GalxR2AssetAdapter, imageR2BucketForKey }, { BroccoliImageLibraryBuffer }] = await Promise.all([
    import('../src/core/storage/GalxUnifiedR2StorageManager'),
    import('../src/workers/cloudflare/GalxR2AssetAdapter'),
    import('../src/core/broccolidb/BroccoliImageLibraryBuffer'),
  ]);
  const { ImageRequestService, ImageStorageUnavailableError } = await import('../src/lib/images/request-service');
  const manager = GalxUnifiedR2StorageManager.getInstance();
  const adapter = GalxR2AssetAdapter.getInstance();
  const oldPut = manager.putObject;
  const oldBuffer = BroccoliImageLibraryBuffer.getInstance;
  const bucketMap = (manager as any).bucketMap as Record<string, { bucketName: string }>;
  const originalPrivateBucketName = bucketMap.images.bucketName;
  let writes = 0;

  try {
    assert.notEqual(manager.resolveBucket('images').bucketName, manager.resolveBucket('assets').bucketName);
    assert.equal(manager.resolveBucket('images').workerBindingName, undefined,
      'private image storage is the Vercel application path, not a Worker binding');
    assert.equal(manager.isPrivateImageStorageConfigured(), true);
    bucketMap.images.bucketName = 'galxai-assets-fixture';
    assert.equal(manager.isPrivateImageStorageConfigured(), false, 'private configuration cannot name the public assets bucket');
    bucketMap.images.bucketName = originalPrivateBucketName;
    process.env.R2_PRIVATE_IMAGES_BUCKET_NAME = 'galxai-private-images-fixture';
    process.env.R2_IMAGES_BUCKET_NAME = 'galxai-private-images-fixture';
    assert.equal(manager.isPrivateImageStorageConfigured(), false, 'legacy image bucket alias cannot be reused');
    delete process.env.R2_IMAGES_BUCKET_NAME;
    assert.equal(manager.isPrivateImageStorageConfigured(), true);
    const configuredPrivateBucket = process.env.R2_PRIVATE_IMAGES_BUCKET_NAME;
    delete process.env.R2_PRIVATE_IMAGES_BUCKET_NAME;
    assert.equal(manager.isPrivateImageStorageConfigured(), false,
      'missing private bucket configuration fails closed even when R2 credentials exist');
    let reservationAttempts = 0;
    const guardedService = new ImageRequestService({
      create: async () => { reservationAttempts++; throw new Error('reservation must not be attempted'); },
    } as any, async () => ({ data: [] } as any), () => {});
    await assert.rejects(guardedService.create('owner', { prompt: 'fixture' } as any,
      { priority: false, schedule: false }), (error: any) => error instanceof ImageStorageUnavailableError);
    assert.equal(reservationAttempts, 0, 'missing private storage rejects before allowance reservation');
    process.env.R2_PRIVATE_IMAGES_BUCKET_NAME = configuredPrivateBucket;

    assert.equal(imageR2BucketForKey('private/users/u/sessions/s/images/a.png'), 'images');
    assert.equal(imageR2BucketForKey('published/users/s/sessions/a/images/a.png'), 'images');
    assert.equal(imageR2BucketForKey('users/u/sessions/s/images/legacy.png'), 'assets');

    const source = await sharp({ create: { width: 8, height: 6, channels: 4, background: '#4f46e5' } })
      .withExif({ IFD0: { Software: 'PRIVATE_STORAGE_CANARY' } })
      .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/">PRIVATE_STORAGE_CANARY</x:xmpmeta>')
      .png().toBuffer();
    manager.putObject = (async params => {
      writes++;
      assert.equal(params.bucket, 'images');
      assert.match(params.key, /^private\/users\/owner\/sessions\/session-a\/images\//);
      assert.equal(params.cacheControl, 'private, no-store');
      assert.equal(params.contentType, 'image/png');
      assert(!Buffer.from(params.data).includes(Buffer.from('PRIVATE_STORAGE_CANARY')));
      const metadata = await sharp(Buffer.from(params.data)).metadata();
      assert.equal(metadata.exif, undefined);
      assert.equal(metadata.xmp, undefined);
      return { success: true, bucket: 'galxai-private-images-fixture', key: params.key, publicUrl: 'https://galx.ai/private-object',
        sha256: 'a'.repeat(64), sizeBytes: Buffer.byteLength(params.data), uncompressedSizeBytes: Buffer.byteLength(params.data),
        isGzipped: false, uploadedAtMs: Date.now() };
    }) as typeof manager.putObject;
    BroccoliImageLibraryBuffer.getInstance = () => ({ enqueueRecord: () => undefined }) as any;

    const stored = await adapter.uploadUserSessionImage({
      userId: 'owner', sessionId: 'session-a', generationId: 'request-a', data: source,
      contentType: 'image/png', workClass: 'private', deferManifestUpdate: true,
    });
    assert.equal(writes, 1);
    assert.equal(stored.key.startsWith('private/'), true);
    const url = new URL(stored.publicUrl);
    assert.equal(url.origin, new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://galx.ai').origin);
    assert.match(url.pathname, /^\/v1\/images\/assets\/[A-Za-z0-9_.-]+$/);
    assert.equal(url.search + url.hash + url.username + url.password, '');

    await assert.rejects(() => adapter.uploadUserSessionImage({
      userId: 'owner', data: 'https://upstream.invalid/image.png', workClass: 'private', deferManifestUpdate: true,
    }), /Remote image URLs are not accepted/);
    assert.equal(writes, 1, 'remote URLs must never reach storage');
  } finally {
    manager.putObject = oldPut;
    bucketMap.images.bucketName = originalPrivateBucketName;
    BroccoliImageLibraryBuffer.getInstance = oldBuffer;
    for (const key of envKeys) {
      const value = oldEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
