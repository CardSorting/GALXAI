/**
 * ============================================================================
 * Tests: 40-Dimensional Harness-Model Symbiosis (HMS) & JoyZoning Curation
 * Validates complete ground-truth alignment with /Users/bozoegg/Downloads/codemarie-new
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GalxCodemarieHarnessCuratorEngine } from '../src/core/training/GalxCodemarieHarnessCurator';
import { GalxSyntheticCuratorEngine, SPRINT_REGISTRY } from '../src/core/training/GalxSyntheticCuratorEngine';

describe('40-Dimensional Harness-Model Symbiosis (HMS) & JoyZoning Curation', () => {
  const hmsEngine = GalxCodemarieHarnessCuratorEngine.getInstance();
  const curator = GalxSyntheticCuratorEngine.getInstance();

  it('Dimension 1: JoyZoning Architectural Steering complies with [JOY_ZONING_CONTRACT]', () => {
    const sample = hmsEngine.synthesizeJoyZoningSteeringSample('galx-teacher', 'sprint_codemarie_hms', 101);
    assert.equal(sample.dimension, 'harness.joy_zoning');
    assert.ok(sample.userPrompt.includes('[JOY_ZONING_CONTRACT'));
    assert.ok(sample.userPrompt.includes('JZ-C01') || sample.userPrompt.includes('JZ-O01'));
    assert.ok(sample.completionContent.includes('<thought>'));
    assert.ok(sample.completionContent.includes('IdempotencyGuard'));
  });

  it('Dimension 2: Roadmap Steering tracks Center of Gravity and Kanban gates', () => {
    const sample = hmsEngine.synthesizeRoadmapSteeringSample('galx-teacher', 'sprint_codemarie_hms', 102);
    assert.equal(sample.dimension, 'harness.roadmap_steering');
    assert.ok(sample.completionContent.includes('ROADMAP.md'));
    assert.ok(sample.completionContent.includes('Phase 4: Sovereign Training Cluster'));
  });

  it('Dimension 3: MoD Studio Designer enforces 7 UI states and 1px hairline borders', () => {
    const sample = hmsEngine.synthesizeModStudioDesignerSample('galx-teacher', 'sprint_codemarie_hms', 103);
    assert.equal(sample.dimension, 'code.mod_designer');
    assert.ok(sample.completionContent.includes('border-white/10'));
    assert.ok(sample.completionContent.includes('#0B0C0E'));
    assert.ok(sample.completionContent.includes('[0 RECORDS DISCOVERED]'));
  });

  it('Dimension 4: 10-Verb Golden Cartridge executes canonical sequence from trace to measure', () => {
    const sample = hmsEngine.synthesizeGoldenCartridgeTrajectory('galx-teacher', 'sprint_codemarie_hms', 104);
    assert.equal(sample.dimension, 'code.codemarie_golden');
    assert.ok(sample.completionContent.includes('<golden_cartridge verb="trace">'));
    assert.ok(sample.completionContent.includes('<golden_cartridge verb="slice">'));
    assert.ok(sample.completionContent.includes('<golden_cartridge verb="resolve_authority">'));
    assert.ok(sample.completionContent.includes('<golden_cartridge verb="find_reuse">'));
    assert.ok(sample.completionContent.includes('<golden_cartridge verb="patch_smallest">'));
    assert.ok(sample.completionContent.includes('<golden_cartridge verb="disprove">'));
    assert.ok(sample.completionContent.includes('<golden_cartridge verb="measure">'));
  });

  it('Dimension 5: JoyRide Hot-Path cache returns static proof reuse with zero latency', () => {
    const sample = hmsEngine.synthesizeJoyRideHotPathSample('galx-teacher', 'sprint_codemarie_hms', 105);
    assert.equal(sample.dimension, 'harness.joyride_cache');
    assert.ok(sample.completionContent.includes('REUSE_STATIC_PROOF'));
    assert.ok(sample.completionContent.includes('READ_ONLY_VERIFICATION'));
  });

  it('Dimension 6: FluidPolicyEngine validates formal zero-downtime migration axioms', () => {
    const sample = hmsEngine.synthesizeFluidPolicyAxiomSample('galx-teacher', 'sprint_codemarie_hms', 106);
    assert.equal(sample.dimension, 'harness.fluid_policy');
    assert.ok(sample.completionContent.includes('FluidPolicyEngine'));
    assert.ok(sample.completionContent.includes('A01_NO_HARD_DROPS'));
  });

  it('Dimension 7: Autonomous Documentation Finalizer synchronizes runbooks and changelogs', () => {
    const sample = hmsEngine.synthesizeAutonomousDocFinalizationSample('galx-teacher', 'sprint_codemarie_hms', 107);
    assert.equal(sample.dimension, 'harness.doc_finalization');
    assert.ok(sample.completionContent.includes('AGENT_PLAYBOOK.md'));
  });

  it('Dimension 8: 7-Tier Context Compaction emits hierarchical ledger with fileHashRegistry', () => {
    const sample = hmsEngine.synthesizeContextCompactionLedgerSample('galx-teacher', 'sprint_codemarie_hms', 108);
    assert.equal(sample.dimension, 'harness.compaction_ledger');
    assert.ok(sample.completionContent.includes('zero_loss_ledger'));
    assert.ok(sample.completionContent.includes('fileHashRegistry'));
    assert.ok(sample.completionContent.includes('primaryObjective'));
  });

  it('Dimension 10: SpiderEngine static analysis computes logicDensity and ioEntropy', () => {
    const sample = hmsEngine.synthesizeSpiderStructuralGraphSample('galx-teacher', 'sprint_codemarie_hms', 110);
    assert.equal(sample.dimension, 'harness.spider_graph');
    assert.ok(sample.completionContent.includes('logicDensity'));
    assert.ok(sample.completionContent.includes('ioEntropy'));
  });

  it('Dimension 11: 18-Tool Cognitive Memory performs graph navigation and sector locking', () => {
    const sample = hmsEngine.synthesizeCognitiveMemoryTrajectory('galx-teacher', 'sprint_codemarie_hms', 111);
    assert.equal(sample.dimension, 'harness.cognitive_memory');
    assert.ok(sample.completionContent.includes('<query_cognitive_memory>'));
    assert.ok(sample.completionContent.includes('<mem_forecast>'));
    assert.ok(sample.completionContent.includes('<mem_claim>'));
    assert.ok(sample.completionContent.includes('<mem_link>'));
    assert.ok(sample.completionContent.includes('<mem_release>'));
  });

  it('Dimension 12 & 13: Subagent Swarm coordinates workers under SQLite fencing lease', () => {
    const sample = hmsEngine.synthesizeSwarmOrchestrationTrajectory('galx-teacher', 'sprint_codemarie_hms', 112);
    assert.equal(sample.dimension, 'harness.swarm_orchestration');
    assert.ok(sample.completionContent.includes('<use_subagents>'));
    assert.ok(sample.completionContent.includes('fencingToken'));
    assert.ok(sample.completionContent.includes('schema_auditor'));
  });

  it('Dimension 14: Mechanical Sympathy implements cache-line aligned zero-GC ring buffer', () => {
    const sample = hmsEngine.synthesizeMechanicalSympathySample('galx-teacher', 'sprint_codemarie_hms', 114);
    assert.equal(sample.dimension, 'code.mechanical_sympathy');
    assert.ok(sample.completionContent.includes('SharedArrayBuffer'));
    assert.ok(sample.completionContent.includes('Atomics.load'));
    assert.ok(sample.completionContent.includes('tailOffset = 64'));
  });

  it('Dimension 16: Guided Spec renders Breadboards and 1-Click Probing Decision Chips', () => {
    const sample = hmsEngine.synthesizeGuidedSpecSample('galx-teacher', 'sprint_codemarie_hms', 116);
    assert.equal(sample.dimension, 'harness.guided_spec');
    assert.ok(sample.completionContent.includes('breadboard'));
    assert.ok(sample.completionContent.includes('activeProbingCard'));
    assert.ok(sample.completionContent.includes('Option A (Recommended)'));
  });

  it('Dimension 27: Sensitive Data Masker redacts tokens with quick regex pre-filter', () => {
    const sample = hmsEngine.synthesizeSensitiveDataMaskingSample('galx-teacher', 'sprint_codemarie_hms', 127);
    assert.equal(sample.dimension, 'harness.sensitive_masker');
    assert.ok(sample.completionContent.includes('SensitiveDataMasker'));
    assert.ok(sample.completionContent.includes('QUICK_CHECK_REGEX'));
  });

  it('SPRINT_REGISTRY registers sprint_codemarie_hms with 50,000 target samples', () => {
    assert.ok(SPRINT_REGISTRY.sprint_codemarie_hms);
    assert.equal(SPRINT_REGISTRY.sprint_codemarie_hms.targetSamples, 50000);
    assert.equal(SPRINT_REGISTRY.sprint_codemarie_hms.tierDistribution.tier5Agentic, 0.70);
  });

  it('Synthesizes length-debiased DPO pairs for harness policy governance', () => {
    const dpo = hmsEngine.synthesizeCodemarieDpoPairs('galx-teacher', 200);
    assert.ok(dpo.chosen.includes('<replace_in_file>'));
    assert.ok(dpo.chosen.includes('<diff>'));
    assert.ok(dpo.rejected.includes('sed -i'));
  });

  it('Synthetic Curator Engine generates synthetic batch under sprint_codemarie_hms', () => {
    const batch = curator.generateSyntheticBatch({
      sprintId: 'sprint_codemarie_hms',
      count: 10,
      teacherModelId: 'galx-teacher-27b',
      batchSeedOffset: 0,
    });
    assert.equal(batch.length, 10);
    for (const item of batch) {
      assert.ok(item.userPrompt);
      assert.ok(item.completionContent);
      assert.equal(item.sprintId, 'sprint_codemarie_hms');
    }
  });
});
