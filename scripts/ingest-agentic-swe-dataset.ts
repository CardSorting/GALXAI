import * as fs from 'node:fs';
import { GalxAgenticSweCuratorEngine } from '../src/core/training/GalxAgenticSweCurator';
import { GalxTrainingStreamEngine } from '../src/core/training/GalxTrainingStreamEngine';
import { GalxR2TrainingSyncEngine } from '../src/core/storage/GalxR2TrainingSyncEngine';
import { GalxUnifiedR2StorageManager } from '../src/core/storage/GalxUnifiedR2StorageManager';
import { SPRINT_REGISTRY } from '../src/core/training/GalxSyntheticCuratorEngine';
import { BroccoliDataLabelingClassifier } from '../src/core/training/BroccoliDataLabelingClassifier';

// Auto-load environment
if (fs.existsSync('.env.local')) {
  try { (process as any).loadEnvFile?.('.env.local'); } catch {}
} else if (fs.existsSync('.env')) {
  try { (process as any).loadEnvFile?.('.env'); } catch {}
}

async function ingestAgenticSweDataset() {
  console.log('================================================================================');
  console.log('🛠️  GALXAI: FRONTIER SWE & UNIFIED DIFF AGENTIC DATALAKE INGESTION');
  console.log('    SWE-Bench Trajectories, Unified Diffs, Tool Calling & Multi-File Refactoring');
  console.log('================================================================================\n');

  const sweCurator = GalxAgenticSweCuratorEngine.getInstance();
  const streamEngine = GalxTrainingStreamEngine.getInstance();
  const syncEngine = GalxR2TrainingSyncEngine.getInstance();
  const r2 = GalxUnifiedR2StorageManager.getInstance();
  const classifier = BroccoliDataLabelingClassifier.getInstance();

  const resolved = r2.resolveBucket('training');
  console.log(`Target Bucket: \`${resolved.bucketName}\`\n`);

  const SWE_CYCLES = 50;
  const SAMPLES_PER_CYCLE = 1000;
  const TOTAL_TARGET = SWE_CYCLES * SAMPLES_PER_CYCLE; // 50,000 SWE samples

  console.log(`▶ [STEP 1] Generating ${TOTAL_TARGET.toLocaleString()} Specialized SWE Trajectories & Diffs...`);

  let totalCumulativeTokens = 0;
  let totalCumulativeSamples = 0;

  for (let cycle = 1; cycle <= SWE_CYCLES; cycle++) {
    const startTime = Date.now();
    const batchOffset = (cycle - 1) * SAMPLES_PER_CYCLE;

    for (let i = 0; i < SAMPLES_PER_CYCLE; i++) {
      const seed = batchOffset + i;
      const roll = seed % 5;
      let prompt = '';
      let completion = '';
      let tier: any = 'tier_5_agentic';

      if (roll === 0 || roll === 1) {
        const sample = sweCurator.synthesizeSweBenchTrajectory('galx-flash-8b', 'sprint_5A', seed);
        prompt = sample.userPrompt;
        completion = sample.completionContent;
      } else if (roll === 2) {
        const sample = sweCurator.synthesizeUnifiedDiffPatchSample('galx-flash-8b', 'sprint_4B', seed);
        prompt = sample.userPrompt;
        completion = sample.completionContent;
      } else if (roll === 3) {
        const sample = sweCurator.synthesizeMultiFileRefactoringSample('galx-flash-8b', 'sprint_5A', seed);
        prompt = sample.userPrompt;
        completion = sample.completionContent;
      } else {
        const dpo = sweCurator.synthesizeSweDpoPairs('galx-flash-8b', seed);
        await streamEngine.ingestDPOFeedback({
          source: 'synthetic_critique',
          userId: `galxai_swe_dpo_c${cycle}`,
          prompt: dpo.prompt,
          chosen: dpo.chosen,
          rejected: dpo.rejected,
          modelId: 'galx-flash-8b',
        });
        prompt = dpo.prompt;
        completion = dpo.chosen;
      }

      await streamEngine.ingestInteraction({
        source: 'internal_distillation',
        userId: `galxai_swe_agentic_c${cycle}`,
        userPrompt: prompt,
        completionContent: completion,
        modelId: 'galx-flash-8b',
        allowModelTraining: true,
        isApiCall: false,
      });
    }

    // Flush and synchronize chunk to R2
    const syncRes = await syncEngine.syncDomainPartitionedDatalake();
    streamEngine.clearBuffer();

    totalCumulativeTokens = syncRes.totalTokens;
    totalCumulativeSamples += SAMPLES_PER_CYCLE;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (cycle % 10 === 0 || cycle === SWE_CYCLES) {
      console.log(`  • [SWE Cycle ${cycle}/${SWE_CYCLES}] Notarized: ${totalCumulativeTokens.toLocaleString()} tokens | Shards: ${syncRes.syncedShards} | Samples: ${totalCumulativeSamples.toLocaleString()} (${elapsed}s)`);
    }
  }

  console.log('\n▶ [STEP 2] Generating Columnar Parquet Lake & ZSTD Level-3 Manifest...');
  const parquetResult = await syncEngine.syncDomainPartitionedParquetLake();
  console.log(`  • Parquet Shards:        ${parquetResult.parquetShardsCount}`);
  console.log(`  • Compression Codec:     ${parquetResult.compressionFormat}`);
  console.log(`  • Parquet Manifest:      ${parquetResult.parquetManifestKey}`);
  console.log('  ✓ Columnar Parquet dataset uploaded.\n');

  console.log('▶ [STEP 3] Building Homomorphic Search Index & MDS Streaming Catalog...');
  const heResult = await syncEngine.buildHomomorphicDatalakeSearchIndex();
  console.log(`  • Indexed Shards:        ${heResult.indexedShardsCount}`);
  console.log(`  • Homomorphic Index:     ${heResult.searchIndexKey}`);

  const mdsData = syncEngine.exportMdsStreamingIndexJson();
  await r2.putObject({
    bucket: 'training',
    key: 'datasets/lake/mds_index.json',
    data: JSON.stringify(mdsData, null, 2),
    contentType: 'application/json',
  });
  console.log('  • MDS Streaming Index:   datasets/lake/mds_index.json uploaded.\n');

  console.log('▶ [STEP 4] Exporting Training Framework Recipes to R2...');
  const recipes = [
    { key: 'datasets/lake/recipes/torchtune_lora_recipe.yaml', body: syncEngine.exportTorchtuneRecipeYaml(), type: 'text/yaml' },
    { key: 'datasets/lake/recipes/axolotl_distributed_config.yaml', body: syncEngine.exportAxolotlDatasetConfig(), type: 'text/yaml' },
    { key: 'datasets/lake/recipes/llama_factory_dataset_info.json', body: JSON.stringify(syncEngine.exportLlamaFactoryDatasetInfo(), null, 2), type: 'application/json' },
  ];
  for (const rec of recipes) {
    await r2.putObject({
      bucket: 'training',
      key: rec.key,
      data: rec.body,
      contentType: rec.type,
    });
  }
  console.log('  • Uploaded 3 training recipes (Torchtune, Axolotl, LLaMA-Factory).\n');

  console.log('================================================================================');
  console.log('🎉 AGENTIC SWE & UNIFIED DIFF DATALAKE INGESTION COMPLETE');
  console.log(`   Total Shards Sealed in R2:     ${heResult.indexedShardsCount}`);
  console.log(`   Total Notarized Tokens:        ${totalCumulativeTokens.toLocaleString()} tokens`);
  console.log(`   Total Records Ingested:        ${totalCumulativeSamples.toLocaleString()} samples`);
  console.log('================================================================================\n');
}

ingestAgenticSweDataset().catch((err) => {
  console.error('Agentic SWE Ingestion Failed:', err);
  process.exit(1);
});
