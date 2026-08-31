/**
 * GALXAI: Sovereign Cloudflare R2 Datalake Cleaner
 * Empty all datasets and indexes from the `training` bucket (`galxai-training-datasets`).
 */

import * as fs from 'node:fs';
import { GalxUnifiedR2StorageManager } from '../src/core/storage/GalxUnifiedR2StorageManager';
import { GalxR2TrainingSyncEngine } from '../src/core/storage/GalxR2TrainingSyncEngine';

// Auto-load environment
if (fs.existsSync('.env.local')) {
  try { (process as any).loadEnvFile?.('.env.local'); } catch {}
} else if (fs.existsSync('.env')) {
  try { (process as any).loadEnvFile?.('.env'); } catch {}
}

async function emptyR2TrainingDatalake() {
  console.log('================================================================================');
  console.log('🧹 GALXAI: EMPTYING CLOUDFLARE R2 SOVEREIGN DATALAKE');
  console.log('================================================================================\n');

  const r2 = GalxUnifiedR2StorageManager.getInstance();
  const syncEngine = GalxR2TrainingSyncEngine.getInstance();
  const resolved = r2.resolveBucket('training');
  console.log(`Target Bucket: \`${resolved.bucketName}\`\n`);

  let totalDeleted = 0;
  let continuationToken: string | undefined = undefined;

  do {
    const listRes = await r2.listObjects({
      bucket: 'training',
      maxKeys: 1000,
      continuationToken,
    });

    if (listRes.objects.length === 0) {
      break;
    }

    const keys = listRes.objects.map((o) => o.key);
    console.log(`▶ Deleting batch of ${keys.length} objects from \`${resolved.bucketName}\`...`);
    
    // Batch delete in chunks of 500
    for (let i = 0; i < keys.length; i += 500) {
      const chunk = keys.slice(i, i + 500);
      await r2.deleteObjects('training', chunk);
      totalDeleted += chunk.length;
    }

    continuationToken = listRes.isTruncated ? listRes.nextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`\n✅ Successfully deleted ${totalDeleted.toLocaleString()} objects from R2 bucket \`${resolved.bucketName}\`!`);

  // Clear local audit tables and cache
  syncEngine.clearLocalAuditTable();
  console.log('✅ Local sync audit table and cache reset to clean state.\n');
}

emptyR2TrainingDatalake().catch((err) => {
  console.error('Failed to empty R2 datalake:', err);
  process.exit(1);
});
