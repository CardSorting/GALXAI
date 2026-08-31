/**
 * GALXAI: Master Sovereign Datalake Refill Pipeline (DHEI + 40-Dimensional Harness Symbiosis)
 *
 * Populates Cloudflare R2 bucket `galxai-training-datasets` with the unified:
 * - 45% Deterministic SWE Hemisphere: 5-Phase SWE-Bench Trajectories, AST Unified Git Diffs, Multi-File Refactoring
 * - 25% Cognitive Right Hemisphere: RFC 2119 / 8174 Specifications, FMEA Risk Scoring, Hegelian Dialectics, Adversarial Tournaments
 * - 30% 40-Dimensional Harness-Model Symbiosis (HMS): JoyZoning Steering, Golden Cartridges, Cognitive Memory, Swarm Fencing, MoD Studio UI
 */

import * as fs from 'node:fs';
import { GalxTrainingStreamEngine } from '../src/core/training/GalxTrainingStreamEngine';
import { GalxSyntheticCuratorEngine, type SprintId } from '../src/core/training/GalxSyntheticCuratorEngine';
import { GalxAgenticSweCuratorEngine } from '../src/core/training/GalxAgenticSweCurator';
import { GalxArchitecturalRhetoricCuratorEngine } from '../src/core/training/GalxArchitecturalRhetoricCurator';
import { GalxCodemarieHarnessCuratorEngine } from '../src/core/training/GalxCodemarieHarnessCurator';
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

async function refillDheiAndHmsDatalake() {
  console.log('================================================================================');
  console.log('🛸 GALXAI: SOVEREIGN 40-DIMENSIONAL HARNESS-MODEL SYMBIOSIS (HMS) DATALAKE REFILL');
  console.log('   Left-Brain: 5-Phase SWE-Bench Trajectories & AST Unified Git Diffs');
  console.log('   Right-Brain: RFC 2119 Specs, FMEA Risk Tables & Hegelian Systems Dialectics');
  console.log('   Symbiosis: 40-D Codemarie Native Grounding & JoyZoning Architectural Steering');
  console.log('================================================================================\n');

  const streamEngine = GalxTrainingStreamEngine.getInstance();
  const curator = GalxSyntheticCuratorEngine.getInstance();
  const sweEngine = GalxAgenticSweCuratorEngine.getInstance();
  const rhetoricEngine = GalxArchitecturalRhetoricCuratorEngine.getInstance();
  const hmsEngine = GalxCodemarieHarnessCuratorEngine.getInstance();
  const syncEngine = GalxR2TrainingSyncEngine.getInstance();
  const r2 = GalxUnifiedR2StorageManager.getInstance();

  const resolved = r2.resolveBucket('training');
  console.log(`Target Bucket: \`${resolved.bucketName}\``);
  console.log(`Total Cycles:  ${TOTAL_CYCLES}`);
  console.log(`Per-Cycle:     ${SAMPLES_PER_CYCLE.toLocaleString()} samples`);
  console.log(`Target Mass:   ${(TOTAL_CYCLES * SAMPLES_PER_CYCLE).toLocaleString()} high-density DHEI + HMS samples\n`);

  const sprints: SprintId[] = [
    'sprint_dhei_bootstrap',
    'sprint_dhei_core',
    'sprint_dhei_frontier',
    'sprint_codemarie_hms',
  ];

  const startTime = Date.now();
  let totalCumulativeSamples = 0;
  let latestLakeResult: any = null;

  console.log('▶ [STEP 1] Executing High-Throughput DHEI + HMS Distillation Loop...');

  for (let cycle = 1; cycle <= TOTAL_CYCLES; cycle++) {
    const targetSprint = sprints[(cycle - 1) % sprints.length];

    // 1. Synthesize specialized Left-Hemisphere SWE, Right-Hemisphere Rhetoric, and Codemarie HMS Core Samples
    const coreSamples = [
      sweEngine.synthesizeSweBenchTrajectory('galx-flash-8b', targetSprint, cycle * 20 + 1),
      sweEngine.synthesizeUnifiedDiffPatchSample('galx-flash-8b', targetSprint, cycle * 20 + 2),
      sweEngine.synthesizeMultiFileRefactoringSample('galx-flash-8b', targetSprint, cycle * 20 + 3),
      rhetoricEngine.synthesizeRfcArchitecturalSpecification('galx-flash-8b', targetSprint, cycle * 20 + 4),
      rhetoricEngine.synthesizeDialecticalSystemsTradeoff('galx-flash-8b', targetSprint, cycle * 20 + 5),
      rhetoricEngine.synthesizeAdversarialConcurrencyTournament('galx-flash-8b', targetSprint, cycle * 20 + 6),
      rhetoricEngine.synthesizeExpandContractMigrationPlaybook('galx-flash-8b', targetSprint, cycle * 20 + 7),
      hmsEngine.synthesizeJoyZoningSteeringSample('galx-flash-8b', targetSprint, cycle * 20 + 8),
      hmsEngine.synthesizeRoadmapSteeringSample('galx-flash-8b', targetSprint, cycle * 20 + 9),
      hmsEngine.synthesizeModStudioDesignerSample('galx-flash-8b', targetSprint, cycle * 20 + 10),
      hmsEngine.synthesizeGoldenCartridgeTrajectory('galx-flash-8b', targetSprint, cycle * 20 + 11),
      hmsEngine.synthesizeJoyRideHotPathSample('galx-flash-8b', targetSprint, cycle * 20 + 12),
      hmsEngine.synthesizeFluidPolicyAxiomSample('galx-flash-8b', targetSprint, cycle * 20 + 13),
      hmsEngine.synthesizeAutonomousDocFinalizationSample('galx-flash-8b', targetSprint, cycle * 20 + 14),
      hmsEngine.synthesizeContextCompactionLedgerSample('galx-flash-8b', targetSprint, cycle * 20 + 15),
      hmsEngine.synthesizeSpiderStructuralGraphSample('galx-flash-8b', targetSprint, cycle * 20 + 16),
      hmsEngine.synthesizeCognitiveMemoryTrajectory('galx-flash-8b', targetSprint, cycle * 20 + 17),
      hmsEngine.synthesizeSwarmOrchestrationTrajectory('galx-flash-8b', targetSprint, cycle * 20 + 18),
      hmsEngine.synthesizeMechanicalSympathySample('galx-flash-8b', targetSprint, cycle * 20 + 19),
      hmsEngine.synthesizeGuidedSpecSample('galx-flash-8b', targetSprint, cycle * 20 + 20),
      hmsEngine.synthesizeSensitiveDataMaskingSample('galx-flash-8b', targetSprint, cycle * 20 + 21),
    ];

    for (const s of coreSamples) {
      await streamEngine.ingestInteraction({
        source: 'internal_distillation',
        userId: `galxai_hms_core_${cycle}`,
        userPrompt: s.userPrompt,
        completionContent: s.completionContent,
        modelId: 'galx-flash-8b',
        allowModelTraining: true,
        isApiCall: false,
      });
      totalCumulativeSamples++;
    }

    // 2. Synthesize high-density combinatorial batch weighted for DHEI + HMS
    const sprintBatch = curator.generateSyntheticBatch({
      count: SAMPLES_PER_CYCLE - coreSamples.length - 2,
      tierDistribution: {
        tier1Fact: 0.0,
        tier2Logic: 0.05,
        tier3Code: 0.25,
        tier4Stem: 0.05,
        tier5Agentic: 0.65,
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

    // 3. Ingest DPO pairwise feedback (alternating SWE, ADR, and Codemarie HMS)
    const dpoChoice = cycle % 3;
    if (dpoChoice === 0) {
      const sweDpo = sweEngine.synthesizeSweDpoPairs('galx-flash-8b', cycle);
      await streamEngine.ingestDPOFeedback({
        source: 'synthetic_critique',
        userId: `galxai_dpo_swe_c${cycle}`,
        prompt: sweDpo.prompt,
        chosen: sweDpo.chosen,
        rejected: sweDpo.rejected,
        modelId: 'galx-flash-8b',
      });
    } else if (dpoChoice === 1) {
      const archDpo = rhetoricEngine.synthesizeArchitecturalDpoPairs('galx-flash-8b', cycle);
      await streamEngine.ingestDPOFeedback({
        source: 'synthetic_critique',
        userId: `galxai_dpo_arch_c${cycle}`,
        prompt: archDpo.prompt,
        chosen: archDpo.chosen,
        rejected: archDpo.rejected,
        modelId: 'galx-flash-8b',
      });
    } else {
      const hmsDpo = hmsEngine.synthesizeCodemarieDpoPairs('galx-flash-8b', cycle);
      await streamEngine.ingestDPOFeedback({
        source: 'synthetic_critique',
        userId: `galxai_dpo_hms_c${cycle}`,
        prompt: hmsDpo.prompt,
        chosen: hmsDpo.chosen,
        rejected: hmsDpo.rejected,
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
      console.log(`  • [DHEI+HMS Cycle ${cycle}/${TOTAL_CYCLES}] Notarized: ${tokens.toLocaleString()} tokens | Shards: ${shards} | Samples: ${totalCumulativeSamples.toLocaleString()} (${elapsed}s)`);
    }
  }

  console.log(`\n  ✅ DHEI + 40-D HMS REFILL COMPLETE: Ingested & Notarized ${totalCumulativeSamples.toLocaleString()} samples across ${TOTAL_CYCLES} cycles!\n`);

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
  console.log(`  • Homomorphic Index:     ${heResult.searchIndexKey}`);
  console.log(`  • Shard Vectors Indexed: ${heResult.indexedShardsCount}`);
  console.log(`  • MDS Streaming Manifest: datasets/lake/streaming_catalog.json`);
  console.log('  ✓ MosaicML MDS Streaming catalog initialized.\n');

  console.log('▶ [STEP 5] Emitting Zero-Downtime Training Recipes (Axolotl + Torchtune 32k)...');
  const axolotlConfig = `
# GALXAI: Sovereign 40-Dimensional Symbiosis & Dual-Hemisphere Training Recipe (32k Multi-Turn)
base_model: Qwen/Qwen2.5-Coder-32B-Instruct
model_type: AutoModelForCausalLM
tokenizer_type: AutoTokenizer

load_in_8bit: false
load_in_4bit: false
strict: false

datasets:
  - path: s3://${resolved.bucketName}/datasets/lake/parquet/
    type: completion
    split: train
    field: completionContent
    format: custom

dataset_prepared_path: /workspace/prepared_datasets/galxai_hms_32k
val_set_size: 0.01
output_dir: /workspace/models/galxai-coder-32b-hms-symbiosis

sequence_len: 32768
sample_packing: true
pad_to_sequence_len: true

adapter: lora
lora_r: 64
lora_alpha: 128
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

gradient_accumulation_steps: 4
micro_batch_size: 2
num_epochs: 3
optimizer: adamw_bnb_8bit
lr_scheduler: cosine
learning_rate: 0.00015

bf16: true
fp16: false
tf32: true

gradient_checkpointing: true
gradient_checkpointing_kwargs:
  use_reentrant: false
early_stopping_patience: 3
resume_from_checkpoint: null
logging_steps: 10
flash_attention: true

deepspeed: deepspeed_configs/zero3_bf16.json
weight_decay: 0.01
fsdp:
fsdp_config:
special_tokens:
  pad_token: "<|endoftext|>"
`;

  fs.mkdirSync('train', { recursive: true });
  fs.writeFileSync('train/axolotl_hms_qwen32b_recipe.yaml', axolotlConfig.trim());
  console.log('  ✓ Wrote train/axolotl_hms_qwen32b_recipe.yaml');

  console.log('\n================================================================================');
  console.log('🎉 SOVEREIGN 40-D HARNESS-MODEL SYMBIOSIS DATALAKE PIPELINE SEALED');
  console.log(`   Tokens: ${latestLakeResult.totalTokens.toLocaleString()} | Samples: ${totalCumulativeSamples.toLocaleString()} | Shards: ${latestLakeResult.syncedShards}`);
  console.log('================================================================================\n');
}

refillDheiAndHmsDatalake().catch((err) => {
  console.error('Fatal Sovereign Datalake Refill Failure:', err);
  process.exit(1);
});
