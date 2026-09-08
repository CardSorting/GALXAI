/** Operator-only verification; never prints identifiers or bearer download URLs. */
import assert from 'node:assert/strict';
import sharp from 'sharp';
process.loadEnvFile('.env.local');
const { getSupabaseAdmin } = await import('../src/lib/supabase/client');
const { imageDownloadUrl } = await import('../src/lib/security/image-download-url');
const { data, error } = await getSupabaseAdmin().from('user_image_library')
  .select('id,user_id').eq('status', 'completed').order('created_at', { ascending: true }).limit(1);
assert.equal(Boolean(error), false, 'Historical library lookup failed');
assert.ok(data?.length, 'No completed historical image available');
const response = await fetch(imageDownloadUrl(data[0].user_id, data[0].id), { signal: AbortSignal.timeout(60000) });
assert.equal(response.status, 200, 'Historical download failed');
assert.match(response.headers.get('content-type') || '', /^image\/(png|jpeg|webp)$/);
for (const name of ['x-vercel-id', 'x-matched-path', 'server-timing', 'x-edge-fastpath', 'x-galx-router']) assert.equal(response.headers.get(name), null, name);
const bytes = Buffer.from(await response.arrayBuffer());
const metadata = await sharp(bytes).metadata();
for (const name of ['exif', 'xmp', 'iptc', 'comments']) assert.equal((metadata as any)[name], undefined);
console.log(JSON.stringify({ historicalDownloadStatus: response.status, format: metadata.format, metadataRemoved: true }));
process.exit(0);
