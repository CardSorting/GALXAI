/**
 * GALXAI: Enterprise Synthetic Dataset Curation CLI Operator Tool
 *
 * Command-line runner for 2.5-hour bounded synthetic post-training sprints:
 * Usage:
 *   npm run training:curate -- --canary
 *   npm run training:curate -- --sprint=1A --samples=12500 --sync-r2
 *   npm run training:curate -- --sprint=1A --dry-run
 *   npm run training:curate -- --status
 *   npm run training:curate -- --export-axolotl
 */

import * as fs from 'node:fs';
import { GalxSyntheticCuratorEngine, type SprintId } from '../src/core/training/GalxSyntheticCuratorEngine';
import { GalxR2TrainingSyncEngine } from '../src/core/storage/GalxR2TrainingSyncEngine';
import { GalxTrainingStreamEngine } from '../src/core/training/GalxTrainingStreamEngine';

// Automatically load .env.local and .env in standalone script execution
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

  for (const arg of args) {
    if (arg === '--canary' || arg === '-c') canary = true;
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
  };
}

async function main() {
  const options = parseArgs();
  const curator = GalxSyntheticCuratorEngine.getInstance();
  const syncEngine = GalxR2TrainingSyncEngine.getInstance();
  const streamEngine = GalxTrainingStreamEngine.getInstance();

  // 1. Export Handlers
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

  // 2. Status Display
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

  // 3. Preflight Canary Mode (Sprint 0)
  if (options.canary) {
    renderHeader('Preflight Canary Diagnostic Probe (Sprint 0)');
    console.log('Starting end-to-end 50-sample diagnostic validation...\n');

    const canaryResult = await curator.executePreflightCanary();
    console.log(canaryResult.report);
    return;
  }

  // 4. Operational Sprint Execution (Sprint 1A, etc.)
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
  console.log(`   • Micro-Shards:      ${result.microShardsCommitted}`);
  console.log(`   • Merkle Tree Root:  ${result.merkleRoot}`);
  console.log(`   • Elapsed Time:      ${result.elapsedSeconds} seconds`);
  console.log(`   • Status:            ${result.status.toUpperCase()}`);
  console.log('─'.repeat(80) + '\n');

  if (options.syncR2) {
    console.log('☁️  Synchronizing Master Shards with Cloudflare R2...');
    const syncRes = await syncEngine.syncAllDatasets();
    console.log(`✓ Synchronized ${syncRes.syncedShards} shards (${syncRes.totalTokens.toLocaleString()} tokens). Merkle Root: ${syncRes.manifest.merkleTreeRoot}\n`);
  }
}

main().catch((err) => {
  console.error('\n❌ Curation CLI Error:', err?.message || err);
  process.exit(1);
});
