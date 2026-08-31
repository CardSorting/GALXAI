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

  console.log('▶ [STEP 1] Running Deep Mass-Distillation Across All 66 Sovereign Domains & 5 Tiers...');
  const synthesizers = [
    (seed: number) => curator.synthesizeFormalVerificationSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeFormalVerificationSample('galx-flash-8b', 'sprint_4A', seed + 100), // TLA+ 2PC
    (seed: number) => curator.synthesizeProverVerifierSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeDialecticalSynthesisSample('galx-flash-8b', 'sprint_3A', seed),
    (seed: number) => curator.synthesizeVirtualSandboxFuzzSample('galx-flash-8b', 'sprint_3B', seed),
    (seed: number) => curator.synthesizeHardwareSIMDZKSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeParetoTradeoffSample('galx-flash-8b', 'sprint_3A', seed),
    (seed: number) => curator.synthesizeCrucibleDialogueSample('galx-flash-8b', 'sprint_3B', seed),
    (seed: number) => curator.synthesizeSelfCorrectionBacktrackingSample('galx-flash-8b', 'sprint_3A', seed),
    (seed: number) => curator.synthesizeEbpfKernelFilterSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeDistributedCrdtDeltaSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeHoareLogicTripleSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeNuancedDualUseSafetySample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeMCTSRolloutSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeDropLossGatingSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeSpectralDecorrelationSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeCoqInteractiveTheoremSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeProverVerifierTournamentSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeKZGPolynomialCommitmentSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeLockFreeEBRSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeCudaTensorCoreGEMMSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizePlonkPermutationArgumentSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeIsabelleHOLProofSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeQuantumStateSimulationSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeRdmaRoceNetworkDriverSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeThreePhaseCommitSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeHyperLogLogSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeYonedaLemmaSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeTritonFlashAttention2Sample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeStarkDeepAliConstraintSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeRaftSafetyInvariantSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeHomotopyPathInductionSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeSpeculativeDecodingSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizePagedKVCacheSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeMetamathFormalLogicSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeDifferentialPrivacyDPSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeHomomorphicEncryptionSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeRingAllReduceNCCLSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeRiemannianManifoldOptSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeSystemVerilogFormalSVASample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeNovaFoldingSchemeSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeActorSupervisionTreeSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeLatticeKyberPQCSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeReverseModeAutogradSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeCompCertValidationSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeSparseMoERoutingSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeSpdzMpcProtocolSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeRaftJointConsensusSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeXmssPqcSignatureSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeHashgraphAbftSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeToricSurfaceCodeQecSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeNeuralOdeAdjointSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeSeL4CapabilitySecuritySample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeBrakedownLinearZkSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeIsogenyCryptosystemSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeCalvinDeterministicDbSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeYangMillsGaugeTheorySample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeMambaSelectiveSsmSample('galx-flash-8b', 'sprint_4B', seed),
    (seed: number) => curator.synthesizeSpeculativeLoadHardeningSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeTopologicalAnyonBraidingSample('galx-flash-8b', 'sprint_5A', seed),
    (seed: number) => curator.synthesizeFluxQubitHamiltonianSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeRiscVZkVMProverSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeSevSnpAttestationSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeEpaxosConsensusSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizePersistentHomologySample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizePmdkNvramPersistenceSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeSimdJsonParserSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeFalconLatticeSignatureSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeTlaCacheReplacementSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeZxCalculusCircuitOptSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeCudaWarpMmaSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeSoftwareTransactionalMemorySample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeLimitOrderBookSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeBfvHomomorphicEncryptionSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizePolyhedralLoopOptSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeGraphNeuralNetPartitionSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeMultivariateUovSignatureSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeBarrelfishMultikernelIpcSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeHardwareTransactionalMemorySample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeDiracEquationDiscretizationSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeDpdkZeroCopyDriverSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizePippengerMsmCudaSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeQuboQuantumAnnealingSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeMvccTimeTravelGcSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeDafnyBoundedFifoSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeDisruptorRingBufferSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeClassicMcelieceGoppaSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeMachZehnderOpticalNnSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeTamarinDhProtocolSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeConjugateGradientPrecondSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeFugueCrdtSequenceSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeSpikingNeuralNetworkLifSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeBvhRayTracingSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeQkdDecoyStateBb84Sample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeProtostarFoldingSchemeSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeLinuxTcBpfSchedulerSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeAgdaMonoidalCategorySample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeAvx512BitMatrixTransposeSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizePathOramObliviousMemorySample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeMultiRaftRangeSplitSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeBurgersEquationPinnSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeEventBDistributed3pcSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeCapnProtoZeroCopySample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeBaconShorQecCodeSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeMatrixProductStatesMpsSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeIoUringSqpollStorageSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeLatticeVrfBlindSignatureSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeRowhammerTargetRowRefreshSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeFramaCFloatBoundsSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeOmniLedgerShardedConsensusSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeQatFp8QuantizationSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeNumberTheoreticTransformNttSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeQuantumEntanglementSwappingSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeCompCertClightCoqSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeArmMteMemoryTaggingSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizePointproofsVectorCommitmentSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizePatriciaMerkleTrieSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeLatticeBlindKemSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeEquivariantGraphNeuralNetSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeIdrisDependentTypeFifoSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeDuckDbVectorizedExecutionSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeQuantumPhaseEstimationSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeLinuxRcuTreeHierarchySample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeLogUpLookupArgumentSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeHnswVectorIndexPartitionSample('galx-flash-8b', 'sprint_4A', seed),
    (seed: number) => curator.synthesizeChiselPipelineHazardProofSample('galx-flash-8b', 'sprint_4A', seed),
  ];

  const TOTAL_CYCLES = 200;
  const SAMPLES_PER_CYCLE = 2500;
  console.log(`▶ [STEP 1] Executing 200x Scale Mass-Distillation Across 132 Sovereign Domains (${TOTAL_CYCLES} cycles x ${SAMPLES_PER_CYCLE.toLocaleString()} samples = 500,000+ samples)...`);

  const sprints = ['sprint_1A', 'sprint_1B', 'sprint_2A', 'sprint_2B', 'sprint_3A', 'sprint_3B', 'sprint_4A', 'sprint_4B'] as const;
  let totalCumulativeSamples = 0;
  let latestLakeResult: any = null;

  const startTime = Date.now();

  for (let cycle = 1; cycle <= TOTAL_CYCLES; cycle++) {
    // 1. Synthesize dedicated frontier domain samples for current cycle
    for (const synth of synthesizers) {
      const sample = synth(cycle * 1000 + 1);
      await streamEngine.ingestInteraction({
        source: 'internal_distillation',
        userId: `galxai_datalake_mass_grid_${cycle}`,
        userPrompt: sample.userPrompt,
        completionContent: sample.completionContent,
        modelId: sample.modelId,
        allowModelTraining: true,
        isApiCall: false,
      });
      totalCumulativeSamples++;
    }

    // 2. Synthesize combinatorial multi-tier batch across rotating sprints
    const targetSprint = sprints[(cycle - 1) % sprints.length];
    const sprintBatch = curator.generateSyntheticBatch({
      count: SAMPLES_PER_CYCLE - synthesizers.length,
      tierDistribution: {
        tier1Fact: 0.10,
        tier2Logic: 0.20,
        tier3Code: 0.30,
        tier4Stem: 0.25,
        tier5Agentic: 0.15,
      },
      teacherModelId: 'galx-flash-8b',
      sprintId: targetSprint,
      batchSeedOffset: cycle * 10000 + 42,
    });

    for (const s of sprintBatch) {
      await streamEngine.ingestInteraction({
        source: 'internal_distillation',
        userId: `galxai_datalake_${targetSprint}_c${cycle}`,
        userPrompt: s.userPrompt,
        completionContent: s.completionContent,
        modelId: 'galx-flash-8b',
        allowModelTraining: true,
        isApiCall: false,
      });
      totalCumulativeSamples++;
    }

    // 3. Ingest DPO pairwise feedback
    await streamEngine.ingestDPOFeedback({
      prompt: `[DPO-C${cycle}] Derive optimal Ring-AllReduce communication volume for $N = ${(cycle % 16) + 4}$ GPUs and size $S = ${cycle * 2} \\text{ GB}$.`,
      chosen: `<thought>\n1. Scatter-Reduce: ${(cycle % 16) + 3}/${(cycle % 16) + 4} * S.\n2. All-Gather: ${(cycle % 16) + 3}/${(cycle % 16) + 4} * S.\n3. Total = 2(${(cycle % 16) + 3})/${(cycle % 16) + 4} * S.\n</thought>\nRing-AllReduce communication volume is $2 \\cdot \\frac{${(cycle % 16) + 3}}{${(cycle % 16) + 4}} \\cdot ${cycle * 2}\\text{ GB}$.`,
      rejected: `Ring-AllReduce sends ${cycle * 4} GB always.`,
      modelId: 'galx-flash-8b',
      allowModelTraining: true,
      isApiCall: false,
    });
    totalCumulativeSamples++;

    // 4. Ingest KTO binary preference feedback
    await streamEngine.ingestKTOFeedback({
      prompt: `[KTO-C${cycle}] Formally prove Raft Joint Consensus dynamic cluster membership change safety under $N = ${2 * cycle + 3}$ nodes.`,
      completion: `<thought>1. Quorum intersection $C_{\\text{old}} \\cap C_{\\text{new}} \\ne \\emptyset$...</thought> Proof of Disjoint Quorum Impossibility across joint transitions in cycle ${cycle}...`,
      modelId: 'galx-flash-8b',
      label: true,
      allowModelTraining: true,
      isApiCall: false,
    });
    totalCumulativeSamples++;

    // 5. Synchronize and seal current batch into R2 datalake
    latestLakeResult = await syncEngine.syncDomainPartitionedDatalake();
    streamEngine.clearBuffer();

    if (cycle % 10 === 0 || cycle === TOTAL_CYCLES) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const tokens = latestLakeResult?.totalTokens || 0;
      const shards = latestLakeResult?.syncedShards || 0;
      console.log(`  • [Cycle ${cycle}/${TOTAL_CYCLES}] Notarized: ${tokens.toLocaleString()} tokens | Shards: ${shards} | Samples: ${totalCumulativeSamples.toLocaleString()} (${elapsed}s)`);
    }
  }

  console.log(`\n  ✅ 100X MASS DISTILLATION COMPLETE: Ingested & Notarized ${totalCumulativeSamples.toLocaleString()} samples across ${TOTAL_CYCLES} cycles!\n`);

  console.log('▶ [STEP 2] Sealed Master 100x Datalake Manifest in R2:');
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
  console.log(`🎉 100X MASS REFILL COMPLETE: Successfully populated \`${resolved.bucketName}\`!`);
  console.log(`   Total Active Artifacts in Bucket: ${listAll.objects.length}`);
  console.log('═'.repeat(80) + '\n');
}

refillDatalake().catch(err => {
  console.error('❌ Datalake refill failed:', err);
  process.exit(1);
});
