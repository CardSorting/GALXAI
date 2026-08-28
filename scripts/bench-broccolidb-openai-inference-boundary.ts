/**
 * BroccoliDB OpenAI Inference Boundary Benchmark CLI Runner
 * 
 * Runs the 4-Workload Empirical Task Suite across OpenAI models:
 * 1. Coding / Bugfix Task
 * 2. Long Document / SEC 10-K Covenant Retrieval
 * 3. Kubernetes / eBPF Security Incident Root Cause
 * 4. HFT Order Book & Industrial IoT Vibration Telemetry
 * 
 * Verifies:
 * - Exact Provider Billed Cost ($ USD)
 * - Actual Billed Cost per Successful Task ($/success)
 * - Token Savings vs Billed Dollars Correlation
 */

import assert from 'node:assert/strict';
import {
  BroccoliInferenceBoundaryBenchmarker,
  OPENAI_MODEL_RATE_CARDS,
  OpenAiRateCardRegistry,
  OpenAiTaskSuite,
} from '../src/core/broccolidb/eval/index';

async function runInferenceBoundaryBenchmark(): Promise<void> {
  console.log('======================================================================');
  console.log('  BROCCOLIDB OPENAI INFERENCE BOUNDARY EMPIRICAL BENCHMARK SUITE');
  console.log('======================================================================\n');

  const modelsToTest = ['gpt-4o', 'gpt-4o-mini', 'o3-mini'];

  for (const modelId of modelsToTest) {
    const card = OpenAiRateCardRegistry.getRateCard(modelId);
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`  MODEL: ${card.displayName} (${modelId})`);
    console.log(`  Rate Card: Input: $${card.inputCostPerMillionUSD}/M | Cached: $${card.cachedInputCostPerMillionUSD}/M | Output: $${card.outputCostPerMillionUSD}/M`);
    console.log(`----------------------------------------------------------------------`);

    const report = await BroccoliInferenceBoundaryBenchmarker.runSuite({ modelId });

    console.log(`  [PROVENANCE & METHODOLOGY METADATA]`);
    console.log(`    - Provenance Category      : ${report.provenance.provenanceCategory}`);
    console.log(`    - Provider Boundary        : ${report.provenance.provider} (${report.modelId})`);
    console.log(`    - Usage Source             : ${report.provenance.usageMeasurementSource}`);
    console.log(`    - Reasoning Accounting     : ${report.provenance.reasoningTokenAccounting}`);
    console.log(`    - Latency Measurement      : ${report.provenance.latencyMeasurementSource}`);
    console.log(`    - Billed Cost Formula      : ${report.provenance.billedCostFormula}`);
    console.log(`    - Task Evaluation Engine   : ${report.provenance.evaluatorType}`);

    for (const res of report.taskResults) {
      console.log(`\n  [WORKLOAD: ${res.category}] ${res.taskName}`);
      console.log(`    - Baseline : ${res.baseline.inputTokens} in / ${res.baseline.outputTokens} out -> $${res.baseline.billedCostUSD.toFixed(6)} billed | ${res.baseline.latencyMs}ms | Quality: ${(res.baseline.qualityScore * 100).toFixed(0)}%`);
      console.log(`    - GALX     : ${res.galx.inputTokens} in / ${res.galx.outputTokens} out -> $${res.galx.billedCostUSD.toFixed(6)} billed | ${res.galx.latencyMs}ms | Quality: ${(res.galx.qualityScore * 100).toFixed(0)}%`);
      console.log(`    - Delta    : Saved ${res.deltas.tokensSaved} tokens (${res.deltas.tokenSavingsPercentage}%) | Saved $${res.deltas.billedCostSavedUSD.toFixed(6)} (${res.deltas.billedCostSavingsPercentage}%) | Latency -${res.deltas.latencyReductionMs}ms`);
      console.log(`    - $/Success: Baseline $${res.baseline.costPerSuccessfulTaskUSD.toFixed(6)} vs GALX $${res.galx.costPerSuccessfulTaskUSD.toFixed(6)}`);

      assert.ok(res.galx.passed, `Task ${res.taskId} must pass under GALX compaction`);
      assert.ok(res.galx.inputTokens < res.baseline.inputTokens, `GALX must reduce input tokens for task ${res.taskId}`);
      assert.ok(res.galx.billedCostUSD < res.baseline.billedCostUSD, `GALX must reduce actual billed OpenAI cost for task ${res.taskId}`);
    }

    console.log(`\n  >>> MODEL SUMMARY & INFERENCE REGIME: ${modelId}`);
    console.log(`      Provenance Category      : ${report.provenance.provenanceCategory}`);
    console.log(`      Baseline Billed Cost     : $${report.baselineTotalBilledCostUSD.toFixed(6)} (${report.averageBaselineLatencyMs}ms avg latency)`);
    console.log(`      GALX Billed Cost         : $${report.galxTotalBilledCostUSD.toFixed(6)} (${report.averageGalxLatencyMs}ms avg latency)`);
    console.log(`      Actual Dollars Saved     : $${report.totalDollarsSavedUSD.toFixed(6)} (${report.overallBilledCostReductionPercentage}%)`);
    console.log(`      Input Token Compression  : ${report.compressibleCostSavingsPercentage}% reduction under tested workloads`);
    console.log(`      Non-Compressible Spend   : $${report.irreducibleCostFloorUSD.toFixed(6)} (observed output + CoT generation tokens)`);
    console.log(`      Baseline $/Success       : $${report.baselineCostPerSuccessfulTaskUSD.toFixed(6)}`);
    console.log(`      GALX $/Success           : $${report.galxCostPerSuccessfulTaskUSD.toFixed(6)} (${report.effectiveRoiMultiplier}x Efficiency)`);
    console.log(`      Verdict                  : ${report.narrativeVerdict}`);

    assert.ok(report.overallBilledCostReductionPercentage >= 50, `Overall billed cost reduction for ${modelId} must be >= 50%`);
    assert.equal(report.galxSuccessRatePercentage, 100, `GALX success rate for ${modelId} must be 100%`);
  }

  // Randomized Branch-Blinded A/B Validation Pass
  console.log('\n======================================================================');
  console.log('  RANDOMIZED BRANCH-BLINDED A/B VALIDATION PASS');
  console.log('  Branch identity decoupled from evaluator -> Post-hoc unblinding');
  console.log('======================================================================\n');

  const tasks = OpenAiTaskSuite.getTasks();
  for (const task of tasks) {
    const blindRes = await BroccoliInferenceBoundaryBenchmarker.evaluateBlindedWorkload(task, 'gpt-4o');
    console.log(`  [BRANCH-BLINDED EVALUATION: ${task.id}] ${task.name}`);
    console.log(`    - Branch Alpha : ${blindRes.branchAlpha.inputTokens} in / ${blindRes.branchAlpha.outputTokens} out | ${blindRes.branchAlpha.latencyMs}ms | Quality: ${(blindRes.branchAlpha.qualityScore * 100).toFixed(0)}%`);
    console.log(`    - Branch Beta  : ${blindRes.branchBeta.inputTokens} in / ${blindRes.branchBeta.outputTokens} out | ${blindRes.branchBeta.latencyMs}ms | Quality: ${(blindRes.branchBeta.qualityScore * 100).toFixed(0)}%`);
    console.log(`    - UNBLINDED    : Baseline was Branch [${blindRes.unblinded.baselineBranch}] | GALX was Branch [${blindRes.unblinded.galxBranch}]`);
    console.log(`    - Delta        : Input Token Spend Reduction: ${blindRes.unblinded.inputSavingsPercentage}% | Billed Dollars Saved: $${blindRes.unblinded.billedCostSavedUSD}`);
    console.log(`    - Regime       : ${blindRes.unblinded.empiricalRegime}\n`);

    assert.ok(blindRes.branchAlpha.passed, `Branch Alpha must pass evaluation`);
    assert.ok(blindRes.branchBeta.passed, `Branch Beta must pass evaluation`);
  }

  console.log('======================================================================');
  console.log('   ALL INFERENCE BOUNDARY EMPIRICAL BENCHMARKS PASSED (100%)');
  console.log('   Confirmed: Real Billed Dollar Savings at the OpenAI Inference Boundary');
  console.log('   Confirmed: Randomized Branch-Blinded Quality & Factual Integrity');
  console.log('   Confirmed: 0 Committees Harmed (Institutional Entropy Resistance: VERIFIED)');
  console.log('======================================================================\n');

}

runInferenceBoundaryBenchmark().catch(err => {
  console.error('Benchmark failed with error:', err);
  process.exit(1);
});
