/**
 * GALXAI: Interactive Cloudflare R2 Multi-Bucket CLI Explorer & Browser
 *
 * Usage:
 *   npx tsx scripts/browse-r2-storage.ts ls [bucket] [prefix]
 *   npx tsx scripts/browse-r2-storage.ts cat <bucket> <key>
 *   npx tsx scripts/browse-r2-storage.ts stat <bucket> <key>
 *   npx tsx scripts/browse-r2-storage.ts health
 */

import * as fs from 'node:fs';
import { GalxUnifiedR2StorageManager, type R2KnownBucket } from '../src/core/storage/GalxUnifiedR2StorageManager';

// Auto-load environment
if (fs.existsSync('.env.local')) {
  try { (process as any).loadEnvFile?.('.env.local'); } catch {}
} else if (fs.existsSync('.env')) {
  try { (process as any).loadEnvFile?.('.env'); } catch {}
}

const r2 = GalxUnifiedR2StorageManager.getInstance();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'ls';

  if (!r2.isConfigured()) {
    console.warn('⚠️ Warning: Live Cloudflare R2 credentials not fully configured. Using local fallback mode.');
  }

  switch (command) {
    case 'ls': {
      const bucket: R2KnownBucket = (args[1] as R2KnownBucket) || 'training';
      const prefix = args[2] || '';
      const resolved = r2.resolveBucket(bucket);

      console.log(`\n📂 Listing Cloudflare R2 Bucket: \`${resolved.bucketName}\` (alias: ${bucket}) [prefix: "${prefix}"]`);
      console.log('────────────────────────────────────────────────────────────────────────────────');

      const res = await r2.listObjects({ bucket, prefix, maxKeys: 100 });
      if (res.objects.length === 0) {
        console.log('  (No objects found matching prefix)');
      } else {
        console.log(`Found ${res.objects.length} object(s):`);
        for (const obj of res.objects) {
          const sizeKb = (obj.sizeBytes / 1024).toFixed(1);
          console.log(`  • ${obj.key.padEnd(55)} | ${sizeKb.padStart(8)} KB | ${obj.lastModified}`);
        }
      }
      console.log('────────────────────────────────────────────────────────────────────────────────\n');
      break;
    }

    case 'stat': {
      const bucket = (args[1] as R2KnownBucket) || 'training';
      const key = args[2];
      if (!key) {
        console.error('Error: Must specify key for stat. Example: stat training datasets/sft/v1/shard_0001.jsonl.gz');
        process.exit(1);
      }

      console.log(`\n🔍 Inspecting Metadata for: \`${bucket}/${key}\``);
      console.log('────────────────────────────────────────────────────────────────────────────────');
      const head = await r2.headObject(bucket, key);
      if (!head.exists) {
        console.log('  ❌ Object does not exist in bucket.');
      } else {
        console.log(`  • Exists:        ✅ YES`);
        console.log(`  • Size (Bytes):  ${head.contentLength.toLocaleString()} bytes (${(head.contentLength / 1024).toFixed(2)} KB)`);
        console.log(`  • Content-Type:  ${head.contentType}`);
        console.log(`  • ETag:          ${head.etag || 'N/A'}`);
        console.log(`  • Last-Modified: ${head.lastModified || 'N/A'}`);
        console.log(`  • Custom Meta:   ${JSON.stringify(head.metadata)}`);
      }
      console.log('────────────────────────────────────────────────────────────────────────────────\n');
      break;
    }

    case 'cat': {
      const bucket = (args[1] as R2KnownBucket) || 'training';
      const key = args[2];
      if (!key) {
        console.error('Error: Must specify key for cat. Example: cat assets visual_synthesis/test.txt');
        process.exit(1);
      }

      const obj = await r2.getObject(bucket, key);
      console.log(`\n📄 Content of \`${bucket}/${key}\` (${obj.contentLength} bytes):\n`);
      const str = obj.data.toString('utf8');
      console.log(str.length > 2000 ? `${str.slice(0, 2000)}\n...[Truncated remainder of ${str.length} bytes]...` : str);
      console.log('\n');
      break;
    }

    case 'health':
    default: {
      const buckets: R2KnownBucket[] = ['training', 'assets', 'user_webapps', 'dreambees', 'sticker'];
      console.log('\n☁️  Cloudflare R2 Multi-Bucket Health Grid:');
      console.log('────────────────────────────────────────────────────────────────────────────────');
      for (const b of buckets) {
        const h = await r2.verifyBucketHealth(b);
        const icon = h.healthy ? '✅' : '❌';
        console.log(`  ${icon} Bucket: ${h.bucket.padEnd(28)} | ${String(h.latencyMs).padStart(4)} ms | ${h.mode}`);
      }
      console.log('────────────────────────────────────────────────────────────────────────────────\n');
      break;
    }
  }
}

main().catch((err) => {
  console.error('❌ CLI Execution Error:', err);
  process.exit(1);
});
