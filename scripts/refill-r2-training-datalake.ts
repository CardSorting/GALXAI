/**
 * GALXAI: Master R2 Datalake Refill & Population Engine
 * Generates and uploads the comprehensive 66-domain sovereign curriculum,
 * Gold/Silver tiered shards, DPO/KTO preference pairs, Parquet manifests,
 * MDS streaming indexes, and Merkle-sealed catalogs to Cloudflare R2.
 */

import * as fs from 'node:fs';
import { GalxSyntheticCuratorEngine } from '../src/core/training/GalxSyntheticCuratorEngine';
import { GalxR2TrainingSyncEngine } from '../src/core/storage/GalxR2TrainingSyncEngine';
import { GalxTrainingStreamEngine } from '../src/core/training/GalxTrainingStreamEngine';
import { GalxUnifiedR2StorageManager } from '../src/core/storage/GalxUnifiedR2StorageManager';

// Auto-load environment
if (fs.existsSync('.env.local')) {
  try { (process as any).loadEnvFile?.('.env.local'); } catch {}
} else if (fs.existsSync('.env')) {
  try { (process as any).loadEnvFile?.('.env'); } catch {}
}

const curator = GalxSyntheticCuratorEngine.getInstance();
const syncEngine = GalxR2TrainingSyncEngine.getInstance();
const streamEngine = GalxTrainingStreamEngine.getInstance();
const r2 = GalxUnifiedR2StorageManager.getInstance();

async function refillDatalake() {
  console.log('═'.repeat(80));
  console.log('🚀 GALXAI: CLOUDFLARE R2 SOVEREIGN DATALAKE REFILL & INITIALIZATION');
  console.log('═'.repeat(80) + '\n');

  const resolved = r2.resolveBucket('training');
  console.log(`Target Bucket: \`${resolved.bucketName}\`\n`);

  console.log('▶ [STEP 1] Synthesizing Sovereign 66-Domain Multi-Tier Frontier Curriculum...');
  const synthesizers = [
    () => curator.synthesizeFormalVerificationSample('galx-flash-8b', 'sprint_refill', 1),
    () => curator.synthesizeProverVerifierSample('galx-flash-8b', 'sprint_refill', 2),
    () => curator.synthesizeDialecticalSynthesisSample('galx-flash-8b', 'sprint_refill', 3),
    () => curator.synthesizeVirtualSandboxFuzzSample('galx-flash-8b', 'sprint_refill', 4),
    () => curator.synthesizeHardwareSIMDZKSample('galx-flash-8b', 'sprint_refill', 5),
    () => curator.synthesizeParetoTradeoffSample('galx-flash-8b', 'sprint_refill', 6),
    () => curator.synthesizeCrucibleDialogueSample('galx-flash-8b', 'sprint_refill', 7),
    () => curator.synthesizeSelfCorrectionBacktrackingSample('galx-flash-8b', 'sprint_refill', 8),
    () => curator.synthesizeEbpfKernelFilterSample('galx-flash-8b', 'sprint_refill', 9),
    () => curator.synthesizeDistributedCrdtDeltaSample('galx-flash-8b', 'sprint_refill', 10),
    () => curator.synthesizeHoareLogicTripleSample('galx-flash-8b', 'sprint_refill', 11),
    () => curator.synthesizeNuancedDualUseSafetySample('galx-flash-8b', 'sprint_refill', 12),
    () => curator.synthesizeMCTSRolloutSample('galx-flash-8b', 'sprint_refill', 13),
    () => curator.synthesizeDropLossGatingSample('galx-flash-8b', 'sprint_refill', 14),
    () => curator.synthesizeSpectralDecorrelationSample('galx-flash-8b', 'sprint_refill', 15),
    () => curator.synthesizeCoqInteractiveTheoremSample('galx-flash-8b', 'sprint_refill', 16),
    () => curator.synthesizeProverVerifierTournamentSample('galx-flash-8b', 'sprint_refill', 17),
    () => curator.synthesizeKZGPolynomialCommitmentSample('galx-flash-8b', 'sprint_refill', 18),
    () => curator.synthesizeLockFreeEBRSample('galx-flash-8b', 'sprint_refill', 19),
    () => curator.synthesizeCudaTensorCoreGEMMSample('galx-flash-8b', 'sprint_refill', 20),
    () => curator.synthesizePlonkPermutationArgumentSample('galx-flash-8b', 'sprint_refill', 21),
    () => curator.synthesizeIsabelleHOLProofSample('galx-flash-8b', 'sprint_refill', 22),
    () => curator.synthesizeQuantumStateSimulationSample('galx-flash-8b', 'sprint_refill', 23),
    () => curator.synthesizeRdmaRoceNetworkDriverSample('galx-flash-8b', 'sprint_refill', 24),
    () => curator.synthesizeThreePhaseCommitSample('galx-flash-8b', 'sprint_refill', 25),
    () => curator.synthesizeHyperLogLogSample('galx-flash-8b', 'sprint_refill', 26),
    () => curator.synthesizeYonedaLemmaSample('galx-flash-8b', 'sprint_refill', 27),
    () => curator.synthesizeTritonFlashAttention2Sample('galx-flash-8b', 'sprint_refill', 28),
    () => curator.synthesizeStarkDeepAliConstraintSample('galx-flash-8b', 'sprint_refill', 29),
    () => curator.synthesizeRaftSafetyInvariantSample('galx-flash-8b', 'sprint_refill', 30),
    () => curator.synthesizeHomotopyPathInductionSample('galx-flash-8b', 'sprint_refill', 31),
    () => curator.synthesizeSpeculativeDecodingSample('galx-flash-8b', 'sprint_refill', 32),
    () => curator.synthesizePagedKVCacheSample('galx-flash-8b', 'sprint_refill', 33),
    () => curator.synthesizeMetamathFormalLogicSample('galx-flash-8b', 'sprint_refill', 34),
    () => curator.synthesizeDifferentialPrivacyDPSample('galx-flash-8b', 'sprint_refill', 35),
    () => curator.synthesizeHomomorphicEncryptionSample('galx-flash-8b', 'sprint_refill', 36),
    () => curator.synthesizeRingAllReduceNCCLSample('galx-flash-8b', 'sprint_refill', 37),
    () => curator.synthesizeRiemannianManifoldOptSample('galx-flash-8b', 'sprint_refill', 38),
    () => curator.synthesizeSystemVerilogFormalSVASample('galx-flash-8b', 'sprint_refill', 39),
    () => curator.synthesizeNovaFoldingSchemeSample('galx-flash-8b', 'sprint_refill', 40),
    () => curator.synthesizeActorSupervisionTreeSample('galx-flash-8b', 'sprint_refill', 41),
    () => curator.synthesizeLatticeKyberPQCSample('galx-flash-8b', 'sprint_refill', 42),
    () => curator.synthesizeReverseModeAutogradSample('galx-flash-8b', 'sprint_refill', 43),
    () => curator.synthesizeCompCertValidationSample('galx-flash-8b', 'sprint_refill', 44),
    () => curator.synthesizeSparseMoERoutingSample('galx-flash-8b', 'sprint_refill', 45),
    () => curator.synthesizeSpdzMpcProtocolSample('galx-flash-8b', 'sprint_refill', 46),
    () => curator.synthesizeRaftJointConsensusSample('galx-flash-8b', 'sprint_refill', 47),
    () => curator.synthesizeXmssPqcSignatureSample('galx-flash-8b', 'sprint_refill', 48),
    () => curator.synthesizeHashgraphAbftSample('galx-flash-8b', 'sprint_refill', 49),
    () => curator.synthesizeToricSurfaceCodeQecSample('galx-flash-8b', 'sprint_refill', 50),
    () => curator.synthesizeNeuralOdeAdjointSample('galx-flash-8b', 'sprint_refill', 51),
    () => curator.synthesizeSeL4CapabilitySecuritySample('galx-flash-8b', 'sprint_refill', 52),
    () => curator.synthesizeBrakedownLinearZkSample('galx-flash-8b', 'sprint_refill', 53),
    () => curator.synthesizeIsogenyCryptosystemSample('galx-flash-8b', 'sprint_refill', 54),
    () => curator.synthesizeCalvinDeterministicDbSample('galx-flash-8b', 'sprint_refill', 55),
    () => curator.synthesizeYangMillsGaugeTheorySample('galx-flash-8b', 'sprint_refill', 56),
    () => curator.synthesizeMambaSelectiveSsmSample('galx-flash-8b', 'sprint_refill', 57),
    () => curator.synthesizeSpeculativeLoadHardeningSample('galx-flash-8b', 'sprint_refill', 58),
    () => curator.synthesizeTopologicalAnyonBraidingSample('galx-flash-8b', 'sprint_refill', 59),
  ];

  let ingestedCount = 0;
  for (const synth of synthesizers) {
    const sample = synth();
    await streamEngine.ingestInteraction({
      source: 'internal_distillation',
      userId: 'galxai_datalake_master_refill',
      userPrompt: sample.userPrompt,
      completionContent: sample.completionContent,
      modelId: sample.modelId,
      allowModelTraining: true,
      isApiCall: false,
    });
    ingestedCount++;
  }
  // Ingest DPO pairwise preference samples
  await streamEngine.ingestDPOFeedback({
    prompt: 'Derive the optimal communication volume of Ring-AllReduce on N GPUs with size S.',
    chosen: '<thought>\n1. Scatter-Reduce: N-1 steps, transfer volume (N-1)/N * S.\n2. All-Gather: N-1 steps, transfer volume (N-1)/N * S.\n3. Total volume = 2(N-1)/N * S.\n</thought>\nRing-AllReduce communication volume is exactly $2 \\cdot \\frac{N-1}{N} \\cdot S$.',
    rejected: 'Ring-AllReduce sends 2S bytes always.',
    modelId: 'galx-flash-8b',
    allowModelTraining: true,
    isApiCall: false,
  });

  await streamEngine.ingestDPOFeedback({
    prompt: 'Implement constant-time cryptographic byte comparison in Rust.',
    chosen: '<thought>\n1. Accumulate XOR differences.\n2. Return (acc == 0) as u8.\n</thought>\npub fn ct_eq(a: &[u8], b: &[u8]) -> bool { ... }',
    rejected: 'Just use == operator in Rust.',
    modelId: 'galx-flash-8b',
    allowModelTraining: true,
    isApiCall: false,
  });

  // Ingest KTO binary preference samples
  await streamEngine.ingestKTOFeedback({
    prompt: 'Prove Raft Joint Consensus safety.',
    completion: '<thought>1. Quorum intersection...</thought> Proof of Disjoint Quorum Impossibility...',
    modelId: 'galx-flash-8b',
    label: true,
    allowModelTraining: true,
    isApiCall: false,
  });

  console.log(`  ✓ Successfully synthesized and ingested ${ingestedCount} frontier domain samples and DPO/KTO preferences.\n`);

  console.log('▶ [STEP 2] Synchronizing Gold/Silver Tiered Domain Shards & Preferences to R2...');
  const lakeResult = await syncEngine.syncDomainPartitionedDatalake();
  console.log(`  • Lake Shards Uploaded:  ${lakeResult.syncedShards}`);
  console.log(`  • Total Tokens Yielded:  ${lakeResult.totalTokens.toLocaleString()}`);
  console.log(`  • Merkle Tree Root:      ${lakeResult.merkleTreeRoot}`);
  console.log(`  • Lake Manifest Key:     datasets/lake/manifest.json`);
  console.log('  ✓ Domain partitioned lake sealed in R2.\n');

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

  console.log('▶ [STEP 5] Exporting Training Framework Recipes to R2...');
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
  console.log(`  • Uploaded ${recipes.length} training recipes (Torchtune, Axolotl, LLaMA-Factory).\n`);

  // Final verification
  const listAll = await r2.listObjects({ bucket: 'training', maxKeys: 1000 });
  console.log('═'.repeat(80));
  console.log(`🎉 REFILL COMPLETE: Successfully populated \`${resolved.bucketName}\`!`);
  console.log(`   Total Active Artifacts in Bucket: ${listAll.objects.length}`);
  console.log('═'.repeat(80) + '\n');
}

refillDatalake().catch(err => {
  console.error('❌ Datalake refill failed:', err);
  process.exit(1);
});
