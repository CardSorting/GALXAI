/**
 * GALXAI: Master Sovereign Datalake Refill Pipeline (Dual-Hemisphere DHEI Architecture)
 *
 * Populates Cloudflare R2 bucket `galxai-training-datasets` with the Dual-Hemisphere
 * Engineering Intelligence (DHEI) curriculum:
 * - 65% Deterministic Left Hemisphere: 5-Phase SWE-Bench Trajectories, AST Unified Git Diffs, Multi-File Refactoring
 * - 35% Cognitive Right Hemisphere: RFC 2119 / 8174 Specifications, FMEA Risk Scoring, Hegelian Dialectics, Adversarial Tournaments
 */

import * as fs from 'node:fs';
import { GalxTrainingStreamEngine } from '../src/core/training/GalxTrainingStreamEngine';
import { GalxSyntheticCuratorEngine, type SprintId } from '../src/core/training/GalxSyntheticCuratorEngine';
import { GalxAgenticSweCuratorEngine } from '../src/core/training/GalxAgenticSweCurator';
import { GalxArchitecturalRhetoricCuratorEngine } from '../src/core/training/GalxArchitecturalRhetoricCurator';
import { GalxR2TrainingSyncEngine } from '../src/core/storage/GalxR2TrainingSyncEngine';
import { GalxUnifiedR2StorageManager } from '../src/core/storage/GalxUnifiedR2StorageManager';

// Auto-load environment
if (fs.existsSync('.env.local')) {
  try { (process as any).loadEnvFile?.('.env.local'); } catch {}
} else if (fs.existsSync('.env')) {
  try { (process as any).loadEnvFile?.('.env'); } catch {}
}

const TOTAL_CYCLES = 100;
const SAMPLES_PER_CYCLE = 2500;

async function refillDheiDatalake() {
  console.log('================================================================================');
  console.log('🛸 GALXAI: SOVEREIGN DUAL-HEMISPHERE DATALAKE REFILL (DHEI 32K)');
  console.log('   Left-Brain: 5-Phase SWE-Bench Trajectories & AST Unified Git Diffs');
  console.log('   Right-Brain: RFC 2119 Specs, FMEA Risk Tables & Hegelian Systems Dialectics');
  console.log('================================================================================\n');

  const streamEngine = GalxTrainingStreamEngine.getInstance();
  const curator = GalxSyntheticCuratorEngine.getInstance();
  const sweEngine = GalxAgenticSweCuratorEngine.getInstance();
  const rhetoricEngine = GalxArchitecturalRhetoricCuratorEngine.getInstance();
  const syncEngine = GalxR2TrainingSyncEngine.getInstance();
  const r2 = GalxUnifiedR2StorageManager.getInstance();

  const resolved = r2.resolveBucket('training');
  console.log(`Target Bucket: \`${resolved.bucketName}\``);
  console.log(`Total Cycles:  ${TOTAL_CYCLES}`);
  console.log(`Per-Cycle:     ${SAMPLES_PER_CYCLE.toLocaleString()} samples`);
  console.log(`Target Mass:   ${(TOTAL_CYCLES * SAMPLES_PER_CYCLE).toLocaleString()} high-density DHEI samples\n`);

  const dheiSprints: SprintId[] = [
    'sprint_dhei_bootstrap',
    'sprint_dhei_core',
    'sprint_dhei_frontier',
  ];

  const startTime = Date.now();
  let totalCumulativeSamples = 0;
  let latestLakeResult: any = null;

  console.log('▶ [STEP 1] Executing High-Throughput DHEI Distillation Loop...');

  for (let cycle = 1; cycle <= TOTAL_CYCLES; cycle++) {
    const targetSprint = dheiSprints[(cycle - 1) % dheiSprints.length];

    // 1. Synthesize specialized Left-Hemisphere SWE & Right-Hemisphere Rhetoric Core Samples
    const coreSamples = [
      sweEngine.synthesizeSweBenchTrajectory('galx-flash-8b', targetSprint, cycle * 10 + 1),
      sweEngine.synthesizeUnifiedDiffPatchSample('galx-flash-8b', targetSprint, cycle * 10 + 2),
      sweEngine.synthesizeMultiFileRefactoringSample('galx-flash-8b', targetSprint, cycle * 10 + 3),
      rhetoricEngine.synthesizeRfcArchitecturalSpecification('galx-flash-8b', targetSprint, cycle * 10 + 4),
      rhetoricEngine.synthesizeDialecticalSystemsTradeoff('galx-flash-8b', targetSprint, cycle * 10 + 5),
      rhetoricEngine.synthesizeAdversarialConcurrencyTournament('galx-flash-8b', targetSprint, cycle * 10 + 6),
      rhetoricEngine.synthesizeExpandContractMigrationPlaybook('galx-flash-8b', targetSprint, cycle * 10 + 7),
    ];

    for (const s of coreSamples) {
      await streamEngine.ingestInteraction({
        source: 'internal_distillation',
        userId: `galxai_dhei_core_${cycle}`,
        userPrompt: s.userPrompt,
        completionContent: s.completionContent,
        modelId: 'galx-flash-8b',
        allowModelTraining: true,
        isApiCall: false,
      });
      totalCumulativeSamples++;
    }

    // 2. Synthesize high-density combinatorial batch weighted for DHEI
    const sprintBatch = curator.generateSyntheticBatch({
      count: SAMPLES_PER_CYCLE - coreSamples.length - 2,
      tierDistribution: {
        tier1Fact: 0.0,
        tier2Logic: 0.05,
        tier3Code: 0.30,
        tier4Stem: 0.05,
        tier5Agentic: 0.60,
      },
      teacherModelId: 'galx-flash-8b',
      sprintId: targetSprint,
      batchSeedOffset: cycle * 10000 + 42,
    });

    for (const s of sprintBatch) {
      await streamEngine.ingestInteraction({
        source: 'internal_distillation',
        userId: `galxai_dhei_${targetSprint}_c${cycle}`,
        userPrompt: s.userPrompt,
        completionContent: s.completionContent,
        modelId: 'galx-flash-8b',
        allowModelTraining: true,
        isApiCall: false,
      });
      totalCumulativeSamples++;
    }

    // 3. Ingest DPO pairwise feedback (alternating SWE surgical vs ADR architectural)
    if (cycle % 2 === 0) {
      const sweDpo = sweEngine.synthesizeSweDpoPairs('galx-flash-8b', cycle);
      await streamEngine.ingestDPOFeedback({
        source: 'synthetic_critique',
        userId: `galxai_dpo_swe_c${cycle}`,
        prompt: sweDpo.prompt,
        chosen: sweDpo.chosen,
        rejected: sweDpo.rejected,
        modelId: 'galx-flash-8b',
      });
    } else {
      const archDpo = rhetoricEngine.synthesizeArchitecturalDpoPairs('galx-flash-8b', cycle);
      await streamEngine.ingestDPOFeedback({
        source: 'synthetic_critique',
        userId: `galxai_dpo_arch_c${cycle}`,
        prompt: archDpo.prompt,
        chosen: archDpo.chosen,
        rejected: archDpo.rejected,
        modelId: 'galx-flash-8b',
      });
    }
    totalCumulativeSamples++;

    // 4. Ingest KTO binary preference feedback
    const sweKto = sweEngine.synthesizeSweKtoSamples('galx-flash-8b', cycle);
    for (const kto of sweKto) {
      await streamEngine.ingestKTOFeedback({
        userId: `galxai_kto_c${cycle}`,
        prompt: kto.prompt,
        completion: kto.completion,
        modelId: 'galx-flash-8b',
        label: kto.label,
      });
      totalCumulativeSamples++;
    }

    // 5. Synchronize and seal batch to Cloudflare R2
    latestLakeResult = await syncEngine.syncDomainPartitionedDatalake();
    streamEngine.clearBuffer();

    if (cycle % 10 === 0 || cycle === TOTAL_CYCLES) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const tokens = latestLakeResult?.totalTokens || 0;
      const shards = latestLakeResult?.syncedShards || 0;
      console.log(`  • [DHEI Cycle ${cycle}/${TOTAL_CYCLES}] Notarized: ${tokens.toLocaleString()} tokens | Shards: ${shards} | Samples: ${totalCumulativeSamples.toLocaleString()} (${elapsed}s)`);
    }
  }

  console.log(`\n  ✅ DHEI REFILL COMPLETE: Ingested & Notarized ${totalCumulativeSamples.toLocaleString()} samples across ${TOTAL_CYCLES} cycles!\n`);

  console.log('▶ [STEP 2] Master Datalake Manifest in R2:');
  console.log(`  • Total Lake Shards:     ${latestLakeResult.syncedShards}`);
  console.log(`  • Total Tokens Yielded:  ${latestLakeResult.totalTokens.toLocaleString()} tokens`);
  console.log(`  • Merkle Tree Root:      ${latestLakeResult.merkleTreeRoot}`);
  console.log(`  • Lake Manifest Key:     datasets/lake/manifest.json\n`);

  console.log('▶ [STEP 3] Generating Columnar Parquet Lake & ZSTD Level-3 Manifest...');
  const parquetResult = await syncEngine.syncDomainPartitionedParquetLake();
  console.log(`  • Parquet Shards:        ${parquetResult.parquetShardsCount}`);
  console.log(`  • Compression Codec:     ${parquetResult.compressionFormat}`);
  console.log(`  • Parquet Manifest:      ${parquetResult.parquetManifestKey}`);
  console.log('  ✓ Columnar Parquet dataset uploaded.\n');

  console.log('▶ [STEP 4] Building Homomorphic Search Index & MDS Streaming Catalog...');
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

  console.log('▶ [STEP 5] Exporting 32k Training Framework Recipes to R2...');
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
  console.log('  • Uploaded 3 training recipes (Torchtune 32k, Axolotl 32k, LLaMA-Factory).\n');

  console.log('================================================================================');
  console.log('🎉 SOVEREIGN DHEI DATALAKE REFILL & CRYPTOGRAPHIC SEALING COMPLETE');
  console.log(`   Total Shards Sealed in R2:     ${latestLakeResult.syncedShards}`);
  console.log(`   Total Parquet Shards:          ${parquetResult.parquetShardsCount}`);
  console.log(`   Total Notarized Tokens:        ${latestLakeResult.totalTokens.toLocaleString()} tokens`);
  console.log(`   Total Records Ingested:        ${totalCumulativeSamples.toLocaleString()} samples`);
  console.log(`   Cryptographic Merkle Root:     ${latestLakeResult.merkleTreeRoot}`);
  console.log('================================================================================\n');
}

refillDheiDatalake().catch((err) => {
  console.error('Failed to refill DHEI datalake:', err);
  process.exit(1);
});
