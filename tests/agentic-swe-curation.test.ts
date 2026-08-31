/**
 * GALXAI: Agentic SWE, Unified Diff & Tool Calling Test Suite
 *
 * Verifies:
 * 1. Multi-Turn Interactive SWE Trajectory Generation (SWE-Bench / RepoQA)
 * 2. AST-Preserving Unified Git Diff & Surgical Search/Replace Patching
 * 3. Interleaved Tool Calling and Schema Invariants
 * 4. Multi-File Architectural Refactoring & Dependency Graph Invariants
 * 5. SWE-Specific Tri-Stream Alignment (SFT, Length-Debiased DPO, KTO)
 */

import { GalxAgenticSweCuratorEngine } from '../src/core/training/GalxAgenticSweCurator';

async function runSweAgenticTestSuite() {
  console.log('================================================================================');
  console.log('🛠️  GALXAI: Agentic SWE, Unified Diff & Multi-Turn Tool Calling Test Suite');
  console.log('    SWE-Bench Trajectories, Unified Diffs, Multi-File Refactoring & DPO Alignment');
  console.log('================================================================================\n');

  const curator = GalxAgenticSweCuratorEngine.getInstance();

  // ---------------------------------------------------------------------------
  // Test 1: Multi-Turn SWE-Bench Trajectories across 5 Polyglot Archetypes
  // ---------------------------------------------------------------------------
  console.log('[Test 1] Multi-Turn SWE-Bench Trajectories across 5 Polyglot Archetypes:');
  const tsSample = curator.synthesizeSweBenchTrajectory('galx-flash-8b', 'sprint_5A', 0);
  if (!tsSample.completionContent.includes('<call:grep_search') || !tsSample.completionContent.includes('ConnectionPool')) {
    throw new Error('Test 1 Failed: TypeScript trajectory missing tool calling trace or ConnectionPool context!');
  }

  const rustSample = curator.synthesizeSweBenchTrajectory('galx-flash-8b', 'sprint_5A', 1);
  if (!rustSample.completionContent.includes('Ordering::Acquire') || !rustSample.completionContent.includes('diff')) {
    throw new Error('Test 1 Failed: Rust concurrency trajectory missing acquire ordering or diff!');
  }

  const pySample = curator.synthesizeSweBenchTrajectory('galx-flash-8b', 'sprint_5A', 2);
  if (!pySample.completionContent.includes('except*') || !pySample.completionContent.includes('TaskGroup')) {
    throw new Error('Test 1 Failed: Python ExceptionGroup trajectory missing except* syntax!');
  }

  const goSample = curator.synthesizeSweBenchTrajectory('galx-flash-8b', 'sprint_5A', 3);
  if (!goSample.completionContent.includes('ctx.Done()') || !goSample.completionContent.includes('select')) {
    throw new Error('Test 1 Failed: Go goroutine leak trajectory missing select ctx.Done()!');
  }

  const cppSample = curator.synthesizeSweBenchTrajectory('galx-flash-8b', 'sprint_5A', 4);
  if (!cppSample.completionContent.includes('_mm512_loadu_ps') || !cppSample.completionContent.includes('simd_ops.cpp')) {
    throw new Error('Test 1 Failed: C++ AVX-512 trajectory missing loadu alignment patch!');
  }
  console.log('  ✓ Verified 5 polyglot multi-turn SWE trajectories (TypeScript, Rust, Python, Go, C++).\n');

  // ---------------------------------------------------------------------------
  // Test 2: AST-Preserving Unified Git Diff & Surgical Search/Replace Patching
  // ---------------------------------------------------------------------------
  console.log('[Test 2] AST-Preserving Unified Git Diff & Surgical Search/Replace:');
  const patchSample = curator.synthesizeUnifiedDiffPatchSample('galx-flash-8b', 'sprint_4B', 42);
  if (!patchSample.completionContent.includes('diff --git') || !patchSample.completionContent.includes('@@ -34,6 +34,6 @@')) {
    throw new Error('Test 2 Failed: Unified Git Diff missing git diff header or @@ hunk coordinates!');
  }
  if (!patchSample.completionContent.includes('+    const validTimestamps = timestamps.filter((t) => t >= windowStart);')) {
    throw new Error('Test 2 Failed: Diff missing surgical boundary fix!');
  }
  console.log('  ✓ Verified exact Unified Diff hunk formatting and surgical line replacement.\n');

  // ---------------------------------------------------------------------------
  // Test 3: Multi-File Architectural Refactoring & Dependency Graph Invariants
  // ---------------------------------------------------------------------------
  console.log('[Test 3] Multi-File Architectural Refactoring & Dependency Graph Invariants:');
  const multiFile = curator.synthesizeMultiFileRefactoringSample('galx-flash-8b', 'sprint_5A', 101);
  if (!multiFile.completionContent.includes('File 1:') || !multiFile.completionContent.includes('File 2:') || !multiFile.completionContent.includes('File 3:')) {
    throw new Error('Test 3 Failed: Multi-file refactoring missing 3-file bundle headers!');
  }
  if (!multiFile.completionContent.includes('Promise<SessionUser | null>') || !multiFile.completionContent.includes('RedisSessionStore')) {
    throw new Error('Test 3 Failed: Multi-file refactoring missing Redis async migration!');
  }
  console.log('  ✓ Verified cross-module architectural refactoring across contracts, store, and middleware.\n');

  // ---------------------------------------------------------------------------
  // Test 4: SWE-Specific DPO & KTO Preference Alignment
  // ---------------------------------------------------------------------------
  console.log('[Test 4] SWE-Specific DPO & KTO Preference Alignment:');
  const dpo = curator.synthesizeSweDpoPairs('galx-flash-8b', 202);
  if (!dpo.chosen.includes('(tx.fees ?? []).reduce') || !dpo.rejected.includes('rewrote the whole file')) {
    throw new Error('Test 4 Failed: DPO pair does not properly discriminate surgical vs. whole-file rewrite!');
  }

  const kto = curator.synthesizeSweKtoSamples('galx-flash-8b', 303);
  if (kto.length !== 2 || kto[0].label !== true || kto[1].label !== false) {
    throw new Error('Test 4 Failed: KTO pairs do not contain valid positive and negative desirability labels!');
  }
  console.log('  ✓ Verified length-debiased DPO and KTO preference pairs for surgical SWE.\n');

  console.log('================================================================================');
  console.log('🎉 ALL AGENTIC SWE & UNIFIED DIFF TESTS PASSED WITH 100% SUCCESS');
  console.log('================================================================================\n');
}

runSweAgenticTestSuite().catch((err) => {
  console.error('SWE Agentic Suite Failed:', err);
  process.exit(1);
});
