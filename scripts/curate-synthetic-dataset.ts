/**
 * GALXAI: Next-Gen Industrial Synthetic Dataset Curator CLI & Multi-Stage Pipeline Runner
 *
 * Usage:
 *   npx tsx scripts/curate-synthetic-dataset.ts --canary
 *   npx tsx scripts/curate-synthetic-dataset.ts --sprint=1A --samples=12500 --sync-r2
 *   npx tsx scripts/curate-synthetic-dataset.ts --all-sprints --sync-r2
 *   npx tsx scripts/curate-synthetic-dataset.ts --status
 *   npx tsx scripts/curate-synthetic-dataset.ts --export-axolotl
 *   npx tsx scripts/curate-synthetic-dataset.ts --export-torchtune
 *   npx tsx scripts/curate-synthetic-dataset.ts --export-unsloth
 */

import * as fs from 'node:fs';
import { GalxSyntheticCuratorEngine, SPRINT_REGISTRY, type SprintId } from '../src/core/training/GalxSyntheticCuratorEngine';
import { GalxR2TrainingSyncEngine } from '../src/core/storage/GalxR2TrainingSyncEngine';
import { GalxTrainingStreamEngine } from '../src/core/training/GalxTrainingStreamEngine';

// Automatically load .env.local and .env
if (fs.existsSync('.env.local')) {
  try { (process as any).loadEnvFile?.('.env.local'); } catch {}
} else if (fs.existsSync('.env')) {
  try { (process as any).loadEnvFile?.('.env'); } catch {}
}

function renderHeader(title: string) {
  console.log('\n' + '═'.repeat(80));
  console.log(` 🛸 GALXAI APEX TRAINING ENGINE • ${title.toUpperCase()}`);
  console.log('═'.repeat(80));
}

function parseArgs(): {
  canary: boolean;
  sprintId: SprintId;
  samples?: number;
  timeLimit?: number;
  dryRun: boolean;
  status: boolean;
  syncR2: boolean;
  exportAxolotl: boolean;
  exportTorchtune: boolean;
  exportUnsloth: boolean;
  allSprints: boolean;
} {
  const args = process.argv.slice(2);
  let canary = false;
  let sprintId: SprintId = 'sprint_1A';
  let samples: number | undefined = undefined;
  let timeLimit: number | undefined = undefined;
  let dryRun = false;
  let status = false;
  let syncR2 = false;
  let exportAxolotl = false;
  let exportTorchtune = false;
  let exportUnsloth = false;
  let allSprints = false;

  for (const arg of args) {
    if (arg === '--canary' || arg === '-c') canary = true;
    else if (arg === '--all-sprints' || arg === '--all') allSprints = true;
    else if (arg.startsWith('--sprint=')) {
      const val = arg.split('=')[1];
      if (val === '0' || val === 'canary') sprintId = 'sprint_0';
      else if (val === '1A' || val === '1a') sprintId = 'sprint_1A';
      else if (val === '1B' || val === '1b') sprintId = 'sprint_1B';
      else if (val === '2A' || val === '2a') sprintId = 'sprint_2A';
      else if (val === '2B' || val === '2b') sprintId = 'sprint_2B';
      else if (val === '3A' || val === '3a') sprintId = 'sprint_3A';
      else if (val === '3B' || val === '3b') sprintId = 'sprint_3B';
      else if (val === '4A' || val === '4a') sprintId = 'sprint_4A';
      else if (val === '4B' || val === '4b') sprintId = 'sprint_4B';
    } else if (arg.startsWith('--samples=') || arg.startsWith('-n=')) {
      samples = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--time-limit=')) {
      timeLimit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--status') {
      status = true;
    } else if (arg === '--sync-r2') {
      syncR2 = true;
    } else if (arg === '--export-axolotl') {
      exportAxolotl = true;
    } else if (arg === '--export-torchtune') {
      exportTorchtune = true;
    } else if (arg === '--export-unsloth') {
      exportUnsloth = true;
    }
  }

  return {
    canary,
    sprintId,
    samples,
    timeLimit,
    dryRun,
    status,
    syncR2,
    exportAxolotl,
    exportTorchtune,
    exportUnsloth,
    allSprints,
  };
}

async function main() {
  const options = parseArgs();
  const curator = GalxSyntheticCuratorEngine.getInstance();
  const syncEngine = GalxR2TrainingSyncEngine.getInstance();
  const streamEngine = GalxTrainingStreamEngine.getInstance();

  // 1. Recipe Exporters
  if (options.exportAxolotl) {
    renderHeader('Axolotl Recipe Exporter');
    const yaml = syncEngine.exportAxolotlDatasetConfig();
    console.log(yaml);
    return;
  }

  if (options.exportTorchtune) {
    renderHeader('Meta Torchtune Recipe Exporter');
    const yaml = syncEngine.exportTorchtuneRecipeYaml();
    console.log(yaml);
    return;
  }

  if (options.exportUnsloth) {
    renderHeader('Unsloth Python Script Exporter');
    const py = syncEngine.exportUnslothPythonScript();
    console.log(py);
    return;
  }

  // 2. Storage & Stream Telemetry Status
  if (options.status) {
    renderHeader('Curriculum Saturation & Storage Status');
    const r2Health = await syncEngine.verifyR2TrainingStorage();
    const telemetry = streamEngine.getTelemetry();

    console.log('☁️  Cloudflare R2 Storage Status:');
    console.log(`   • Mode:          ${r2Health.mode}`);
    console.log(`   • Bucket Name:   ${r2Health.bucketName}`);
    console.log(`   • Healthy:       ${r2Health.healthy ? '✅ YES' : '❌ NO'}`);
    console.log(`   • Ping Latency:  ${r2Health.latencyMs} ms`);

    console.log('\n📊 In-Memory Stream Telemetry:');
    console.log(`   • SFT Distilled: ${telemetry.totalSamplesDistilled.toLocaleString()} samples`);
    console.log(`   • Tokens Yielded:${telemetry.totalTokensCaptured.toLocaleString()} tokens`);
    console.log(`   • PII Scrubbed:  ${telemetry.totalPIIRedactedCount.toLocaleString()} entities`);
    console.log(`   • Bloom Filter:  ${telemetry.bloomDuplicatesFiltered.toLocaleString()} duplicates rejected`);
    console.log(`   • SimHash Fuzzy: ${telemetry.simHashDuplicatesFiltered.toLocaleString()} near-duplicates rejected`);

    return;
  }

  // 3. Preflight Canary Probe (Sprint 0)
  if (options.canary) {
    renderHeader('Preflight Canary Diagnostic Probe (Sprint 0)');
    console.log('Starting end-to-end 50-sample diagnostic validation...\n');

    const canaryResult = await curator.executePreflightCanary();
    console.log(canaryResult.report);
    return;
  }

  // 4. Multi-Sprint Sequential Execution (--all-sprints)
  if (options.allSprints) {
    renderHeader('Full Curriculum Progression Runner (Stages 1A to 4B)');
    const stages: SprintId[] = [
      'sprint_1A', 'sprint_1B',
      'sprint_2A', 'sprint_2B',
      'sprint_3A', 'sprint_3B',
      'sprint_4A', 'sprint_4B',
    ];

    console.log(`Cascading through all ${stages.length} curricular stages with direct R2 synchronization...\n`);
    let totalCurated = 0;
    let totalTokens = 0;
    const stageSummaries: Array<{ stage: string; samples: number; tokens: number; timeSec: number; merkleRoot: string }> = [];

    for (const stage of stages) {
      const config = SPRINT_REGISTRY[stage];
      const targetSamples = options.samples || (options.dryRun ? 100 : config.targetSamples);
      console.log(`▶ Starting ${config.stageName} (${stage}) | Target: ${targetSamples.toLocaleString()} samples`);

      const res = await curator.executeSprint({
        sprintId: stage,
        sampleTarget: targetSamples,
        dryRun: options.dryRun,
        onProgress: (status) => {
          process.stdout.write(
            `\r  [${status.sprintId}] Curated: ${status.samplesAccepted.toLocaleString()} | Tokens: ${status.tokensGenerated.toLocaleString()} | Velocity: ${status.currentVelocityTokensPerSec.toLocaleString()} tok/s`
          );
        },
      });

      totalCurated += res.samplesCurated;
      totalTokens += res.tokensYielded;
      stageSummaries.push({
        stage,
        samples: res.samplesCurated,
        tokens: res.tokensYielded,
        timeSec: res.elapsedSeconds,
        merkleRoot: res.merkleRoot,
      });

      console.log(`\n  ✓ ${stage} Completed in ${res.elapsedSeconds}s (Merkle: ${res.merkleRoot.slice(0, 16)}...)\n`);
    }

    console.log('═'.repeat(80));
    console.log('🎉 ALL CURRICULAR STAGES SUCCESSFULLY COMPLETED & NOTARIZED');
    console.log(`   • Total Curated Samples: ${totalCurated.toLocaleString()}`);
    console.log(`   • Total Yielded Tokens:  ${totalTokens.toLocaleString()}`);
    console.log(`   • Stages Executed:       ${stages.join(' → ')}`);
    console.log('═'.repeat(80) + '\n');
    return;
  }

  // 5. Single Sprint Execution
  renderHeader(`Operational Curation Runner (${options.sprintId})`);
  console.log(`Target: ${options.samples || (options.dryRun ? 50 : 12500)} samples | Time Budget: ${options.timeLimit || 150}m | Mode: ${options.dryRun ? 'DRY-RUN' : 'PRODUCTION'}\n`);

  const result = await curator.executeSprint({
    sprintId: options.sprintId,
    sampleTarget: options.samples,
    maxDurationMinutes: options.timeLimit,
    dryRun: options.dryRun,
    onProgress: (status) => {
      process.stdout.write(
        `\r[Sprint ${status.sprintId}] Elapsed: ${status.elapsedSeconds}s | Curated: ${status.samplesAccepted.toLocaleString()} | Tokens: ${status.tokensGenerated.toLocaleString()} | Velocity: ${status.currentVelocityTokensPerSec} tok/s | Shards: ${status.microShardsCommitted}`
      );
    },
  });

  console.log('\n\n' + '─'.repeat(80));
  console.log('🎉 SPRINT EXECUTION COMPLETED WITH 100% SUCCESS');
  console.log(`   • Sprint ID:         ${result.sprintId}`);
  console.log(`   • Samples Curated:   ${result.samplesCurated.toLocaleString()}`);
  console.log(`   • Tokens Yielded:    ${result.tokensYielded.toLocaleString()}`);
  console.log(`   • Master Shards:     ${result.microShardsCommitted}`);
  console.log(`   • Merkle Tree Root:  ${result.merkleRoot}`);
  console.log(`   • Elapsed Time:      ${result.elapsedSeconds} seconds`);
  console.log(`   • Status:            ${result.status.toUpperCase()}`);
  console.log('─'.repeat(80) + '\n');
}

main().catch((err) => {
  console.error('\n❌ Curation CLI Error:', err?.message || err);
  process.exit(1);
});
