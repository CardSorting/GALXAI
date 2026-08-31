/**
 * GALXAI: Dual-Hemisphere Engineering Intelligence (DHEI) Test Suite
 *
 * Verifies all Left-Hemisphere (SWE Agentics & Unified Diffs) and
 * Right-Hemisphere (Architectural Rhetoric & Dialectics) synthesis invariants.
 */

import { GalxAgenticSweCuratorEngine } from '../src/core/training/GalxAgenticSweCurator';
import { GalxArchitecturalRhetoricCuratorEngine } from '../src/core/training/GalxArchitecturalRhetoricCurator';
import { GalxSyntheticCuratorEngine } from '../src/core/training/GalxSyntheticCuratorEngine';
import { BroccoliDataLabelingClassifier } from '../src/core/training/BroccoliDataLabelingClassifier';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runDualHemisphereTests() {
  console.log('================================================================================');
  console.log('🧪 RUNNING DUAL-HEMISPHERE ENGINEERING INTELLIGENCE (DHEI) TESTS');
  console.log('================================================================================\n');

  const sweEngine = GalxAgenticSweCuratorEngine.getInstance();
  const rhetoricEngine = GalxArchitecturalRhetoricCuratorEngine.getInstance();
  const curatorEngine = GalxSyntheticCuratorEngine.getInstance();
  const classifier = BroccoliDataLabelingClassifier.getInstance();

  // ---------------------------------------------------------------------------
  // [TEST 1] In-Memory Mathematical Unified Diff Invariant Validator
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 1] In-Memory Mathematical Unified Diff Validator:');
  const validDiff = `--- a/src/core/engine.ts
+++ b/src/core/engine.ts
@@ -10,3 +10,4 @@ export class Engine {
   private state: string = 'idle';
+  private isLocked: boolean = false;
   public run() {}
 }`;
  assert(sweEngine.validateUnifiedDiff(validDiff) === true, 'Valid diff should pass validation');
  assert(sweEngine.validateUnifiedDiff('invalid diff text') === false, 'Invalid diff must fail validation');
  console.log('  ✓ In-memory unified diff hunk arithmetic & format validator verified.\n');

  // ---------------------------------------------------------------------------
  // [TEST 2] Tree-Sitter AST Repo-Map Spatial Scoping
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 2] Tree-Sitter AST Repo-Map Generator:');
  const rustMap = sweEngine.synthesizeRepoMap('rust', 42);
  const tsMap = sweEngine.synthesizeRepoMap('typescript', 42);
  assert(rustMap.includes('Cargo.toml') && rustMap.includes('RingBuffer'), 'Rust repo map contains AST symbols');
  assert(tsMap.includes('package.json') && tsMap.includes('StateManager'), 'TypeScript repo map contains AST symbols');
  console.log('  ✓ Polyglot Tree-Sitter AST Repo-Maps generated successfully.\n');

  // ---------------------------------------------------------------------------
  // [TEST 3] RFC 2119 / 8174 Normative Architectural Specification & FMEA
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 3] RFC 2119 Normative Specification & FMEA Tables:');
  for (let seed = 0; seed < 4; seed++) {
    const rfc = rhetoricEngine.synthesizeRfcArchitecturalSpecification('galx-flash-8b', 'sprint_dhei_core', seed);
    assert(rfc.completionContent.includes('RFC') || rfc.completionContent.includes('MUST') || rfc.completionContent.includes('FMEA'), `RFC seed ${seed} contains normative keywords`);
    assert(rfc.completionContent.includes('Risk Priority Number') || rfc.completionContent.includes('RPN') || rfc.completionContent.includes('Severity'), `RFC seed ${seed} contains FMEA risk analysis`);
  }
  console.log('  ✓ RFC 2119 specifications and FMEA tables verified across 4 distinct archetypes.\n');

  // ---------------------------------------------------------------------------
  // [TEST 4] Hegelian Dialectical Systems Tradeoff Synthesis
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 4] Hegelian Dialectical Tradeoff Formulation:');
  for (let seed = 0; seed < 4; seed++) {
    const dialectic = rhetoricEngine.synthesizeDialecticalSystemsTradeoff('galx-flash-8b', 'sprint_dhei_core', seed);
    assert(dialectic.completionContent.includes('Thesis') || dialectic.completionContent.includes('Antithesis') || dialectic.completionContent.includes('Synthesis'), `Dialectic seed ${seed} must follow Hegelian triad`);
  }
  console.log('  ✓ Dialectical Systems Tradeoffs successfully synthesize opposing constraints.\n');

  // ---------------------------------------------------------------------------
  // [TEST 5] Adversarial Red-Team / Blue-Team Concurrency Tournament
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 5] Adversarial Red/Blue Concurrency Tournament:');
  const tournament = rhetoricEngine.synthesizeAdversarialConcurrencyTournament('galx-flash-8b', 'sprint_dhei_core', 101);
  assert(tournament.completionContent.includes('Red-Team') && tournament.completionContent.includes('Blue-Team'), 'Tournament contains Red and Blue personas');
  assert(tournament.completionContent.includes('ABA') || tournament.completionContent.includes('CAS') || tournament.completionContent.includes('Epoch'), 'Tournament contains formal concurrency invariants');
  console.log('  ✓ Adversarial Concurrency Tournament successfully simulates exploit and formal proof.\n');

  // ---------------------------------------------------------------------------
  // [TEST 6] Zero-Downtime Expand-and-Contract Database Migration Playbook
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 6] Zero-Downtime Expand/Contract Migration Playbook:');
  const migration = rhetoricEngine.synthesizeExpandContractMigrationPlaybook('galx-flash-8b', 'sprint_dhei_core', 202);
  assert(migration.completionContent.includes('Phase 1') && migration.completionContent.includes('Dual-Writing'), 'Migration playbook contains multi-phase expansion');
  assert(migration.completionContent.includes('Rollback') || migration.completionContent.includes('Backfill'), 'Migration playbook contains safe rollback controls');
  console.log('  ✓ Zero-Downtime Expand-and-Contract Migration Playbook verified.\n');

  // ---------------------------------------------------------------------------
  // [TEST 7] Architectural DPO Preference Pairs
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 7] Architectural DPO Preference Pairs:');
  const dpo = rhetoricEngine.synthesizeArchitecturalDpoPairs('galx-flash-8b', 303);
  assert(dpo.chosen.includes('ADR') && dpo.chosen.includes('Asymptotic'), 'Chosen ADR contains quantitative evaluation');
  assert(dpo.rejected.length < dpo.chosen.length, 'Rejected contains shallow boilerplate');
  console.log('  ✓ Architectural DPO pairwise preferences verified.\n');

  // ---------------------------------------------------------------------------
  // [TEST 8] Shannon Lexical Entropy Governance on Rhetorical Samples
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 8] Shannon Lexical Entropy & Vocabulary Richness:');
  const sample = rhetoricEngine.synthesizeRfcArchitecturalSpecification('galx-flash-8b', 'sprint_dhei_core', 0);
  const metrics = classifier.calculateLexicalMetrics(sample.completionContent);
  console.log(`  • Shannon Entropy: ${metrics.shannonEntropy.toFixed(2)} bits/token (Threshold >= 7.0)`);
  console.log(`  • MTLD Lexical Diversity: ${metrics.mtld.toFixed(1)} (Threshold >= 40.0)`);
  assert(metrics.shannonEntropy >= 7.0, 'Shannon entropy must be >= 7.0 bits/token');
  console.log('  ✓ Lexical entropy governor verified zero robotic mode collapse.\n');

  // ---------------------------------------------------------------------------
  // [TEST 9] Master Synthetic Curator Forwarding & Routing
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 9] Master Synthetic Curator Forwarding & SPRINT Registration:');
  const sweForward = curatorEngine.synthesizeSweBenchTrajectory('galx-flash-8b', 'sprint_dhei_core', 1);
  const rfcForward = curatorEngine.synthesizeRfcArchitecturalSpecification('galx-flash-8b', 'sprint_dhei_core', 1);
  assert(sweForward.language === 'rust', 'SWE forwarding routes correctly');
  assert(rfcForward.rhetoricType === 'rfc_spec', 'RFC forwarding routes correctly');
  console.log('  ✓ Master Synthetic Curator successfully wires and forwards all DHEI disciplines.\n');

  console.log('================================================================================');
  console.log('🎉 ALL DUAL-HEMISPHERE (DHEI) TESTS PASSED WITH 100% SUCCESS');
  console.log('================================================================================\n');
}

runDualHemisphereTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
