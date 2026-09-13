/** Historical command name retained; this is an isolated storage contract test.
 * The runner owns both the disposable PostgreSQL database and local object files.
 * Never load dotenv, generate billable images or purge a production session here.
 */
import './lib/require-isolated-integration-env';
import './lib/integration-no-network';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import sharp from 'sharp';
import { GalxR2AssetAdapter } from '../src/workers/cloudflare/GalxR2AssetAdapter';
import { GalxUnifiedR2StorageManager } from '../src/core/storage/GalxUnifiedR2StorageManager';
import { ImageLibraryRepository } from '../src/lib/supabase/repositories/ImageLibraryRepository';

// Retained original fixture bytes also establish the historical artifact's provenance.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
globalThis.__galx_pg_pool = pool;
const owner = randomUUID(), session = randomUUID(), foreignOwner = randomUUID();
const adapter = GalxR2AssetAdapter.getInstance();
const storage = GalxUnifiedR2StorageManager.getInstance();
const repository = ImageLibraryRepository.getInstance();
let checks = 0;
try {
  assert.equal(storage.isConfigured(), false, 'Fixture has no remote object credentials'); checks++;
  const uploaded = await adapter.uploadUserSessionImage({
    userId: owner, sessionId: session, data: png, contentType: 'image/png',
    prompt: 'Test synthetic circuit blueprint', model: 'image', size: '1x1',
  });
  await repository.flushSync();
  assert(uploaded.key.startsWith(`users/${owner}/sessions/${session}/images/`));
  assert.equal(uploaded.sizeBytes, png.length); checks++;
  const row = await repository.getAsset(owner, uploaded.assetId);
  assert(row); assert.equal(row.r2Key, uploaded.key); assert.equal(row.sha256, uploaded.sha256); checks++;
  assert.equal(await repository.getAsset(foreignOwner, uploaded.assetId), null); checks++;
  const original = await storage.getObject('images', uploaded.key, false);
  assert(original.data.equals(png));
  const decoded = await sharp(original.data).raw().toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.width, 1); assert.equal(decoded.info.height, 1); checks++;
  const manifest = await adapter.getSessionManifest(owner, session);
  assert.equal(manifest?.totalImages, 1); assert.equal(manifest.totalBytes, png.length); checks++;
  const listed = await adapter.listSessionImages(owner, session);
  assert.equal(listed.length, 1); assert.equal(listed[0].assetId, uploaded.assetId); checks++;
  assert.equal((await adapter.listSessionImages(foreignOwner, session)).length, 0); checks++;
  const page = await repository.getLibrary(owner, { limit: 36, includeSummary: false });
  assert.equal(page.records.length, 1); assert.equal(page.records[0].id, uploaded.assetId); checks++;
  // Assert both halves still exist when the runner destroys the entire fixture.
  // Object-only cleanup was what left a completed production row dangling.
  assert((await storage.headObject('images', uploaded.key)).exists);
  assert(await repository.getAsset(owner, uploaded.assetId)); checks++;
  console.log(JSON.stringify({ checks, database: 'disposable', objects: 'local temporary directory', liveGeneration: false }));
} finally {
  try {
    // Also clean this run's records if the operator supplied an explicit local
    // test database instead of asking the runner to create a disposable one.
    await pool.query('DELETE FROM public.user_image_library WHERE user_id=$1 AND session_id=$2', [owner, session]);
    assert.equal(storage.isConfigured(), false);
    await storage.deletePrefix('images', `users/${owner}/sessions/${session}/`);
  } finally {
    await pool.end();
    globalThis.__galx_pg_pool = undefined;
  }
}
