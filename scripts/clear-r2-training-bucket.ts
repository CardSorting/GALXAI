/**
 * GALXAI: Cloudflare R2 Training Bucket Purge Tool
 * Safely removes all corrupted training shards, stale manifests, and probe artifacts
 * from the `galxai-training-datasets` bucket to ensure a 100% clean baseline.
 */

import * as fs from 'node:fs';
import { GalxUnifiedR2StorageManager } from '../src/core/storage/GalxUnifiedR2StorageManager';

// Auto-load environment
if (fs.existsSync('.env.local')) {
  try { (process as any).loadEnvFile?.('.env.local'); } catch {}
} else if (fs.existsSync('.env')) {
  try { (process as any).loadEnvFile?.('.env'); } catch {}
}

const r2 = GalxUnifiedR2StorageManager.getInstance();

async function purgeTrainingBucket() {
  console.log('═'.repeat(80));
  console.log('🧹 GALXAI: CLOUDFLARE R2 TRAINING BUCKET PURGE & CLEANUP');
  console.log('═'.repeat(80) + '\n');

  const resolved = r2.resolveBucket('training');
  console.log(`Target Bucket: \`${resolved.bucketName}\`\n`);

  let totalDeleted = 0;
  let hasMore = true;
  let iteration = 0;

  while (hasMore && iteration < 20) {
    iteration++;
    const listRes = await r2.listObjects({ bucket: 'training', maxKeys: 1000 });
    const objects = listRes.objects;

    if (objects.length === 0) {
      console.log('✅ Bucket is now 100% empty.');
      break;
    }

    console.log(`[Batch ${iteration}] Found ${objects.length} object(s) to delete...`);
    const keys = objects.map(o => o.key);

    for (let i = 0; i < keys.length; i += 100) {
      const chunk = keys.slice(i, i + 100);
      const delRes = await r2.deleteObjects('training', chunk);
      totalDeleted += delRes.deleted.length;
      console.log(`  • Deleted ${delRes.deleted.length} objects (Total so far: ${totalDeleted})`);
    }

    // Check if there are remaining objects
    const recheck = await r2.listObjects({ bucket: 'training', maxKeys: 10 });
    hasMore = recheck.objects.length > 0;
  }

  // Final verification
  const finalCheck = await r2.listObjects({ bucket: 'training', maxKeys: 100 });
  console.log('\n' + '─'.repeat(80));
  console.log(`🎉 PURGE COMPLETE: Deleted ${totalDeleted} total objects.`);
  console.log(`   Remaining objects in \`${resolved.bucketName}\`: ${finalCheck.objects.length}`);
  console.log('─'.repeat(80) + '\n');
}

purgeTrainingBucket().catch(err => {
  console.error('❌ Purge failed:', err);
  process.exit(1);
});
