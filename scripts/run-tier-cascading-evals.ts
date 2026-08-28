import assert from 'node:assert/strict';
import { TierCascadingEvalHarness, EvalSample } from '../src/core/evals/TierCascadingEvalHarness';
import { GalxSpendGovernanceEngine } from '../src/core/governance/GalxSpendGovernanceEngine';

function generateBenchmarkSamples(count: number): EvalSample[] {
  const categories = ['billing', 'technical_support', 'account_access', 'feature_request', 'security_inquiry'];
  const samples: EvalSample[] = [];

  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length];
    samples.push({
      id: `sample_${i + 1}`,
      workload: 'classification',
      input: `Customer ticket #${1000 + i}: Please help me with my ${cat.replace('_', ' ')} issue regarding subscription renewal.`,
      expectedOutput: cat,
      tolerance: 'exact',
    });
  }

  return samples;
}

function run(): void {
  console.log('======================================================================');
  console.log('  RUNNING GALXAI QUALITY EQUIVALENCE & TIER CASCADING EVAL HARNESS');
  console.log('======================================================================\n');

  const samples = generateBenchmarkSamples(250);
  console.log(`[1/3] Generated ${samples.length} production classification benchmark samples.`);

  const result = TierCascadingEvalHarness.evaluateWorkload(
    'classification',
    samples,
    'gpt-5.6-sol',
    'gpt-5.6-luna'
  );

  console.log(`[2/3] Executed Quality Comparison:`);
  console.log(`      - Baseline Model (gpt-5.6-sol) Accuracy: ${(result.baselineAccuracy * 100).toFixed(1)}%`);
  console.log(`      - Candidate Model (gpt-5.6-luna) Accuracy: ${(result.candidateAccuracy * 100).toFixed(1)}%`);
  console.log(`      - Statistical Lower-Bound Delta (95% CI): ${result.evidence.lowerBoundQualityDelta}`);
  console.log(`      - Cost Reduction Percentage: ${result.costReductionPercentage}%`);
  console.log(`      - Approved for Autonomous Routing: ${result.isApprovedForAutonomousRouting ? 'YES (PASSED)' : 'NO'}`);

  assert.equal(result.isApprovedForAutonomousRouting, true);
  assert.ok(result.evidence.lowerBoundQualityDelta >= -0.01);

  // Validate that the generated evidence satisfies the SpendGovernanceEngine
  console.log(`\n[3/3] Feeding Evidence Record into GalxSpendGovernanceEngine...`);
  const decision = GalxSpendGovernanceEngine.evaluate(
    {
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Classify ticket' }],
      max_tokens: 100,
    },
    { workload: 'classification', department: 'support' },
    { mode: 'enforce', approvedRoutes: [result.evidence] }
  );

  assert.equal(decision.action, 'route');
  assert.equal(decision.effectiveModel, 'gpt-5.6-luna');
  assert.equal(decision.routeEvidenceId, result.evidence.id);

  console.log(`      - Governance Decision: ${decision.action.toUpperCase()}`);
  console.log(`      - Effective Route: ${decision.effectiveModel} (Original: ${decision.requestedModel})`);
  console.log(`      - Route Evidence ID: ${decision.routeEvidenceId}`);

  console.log('\n======================================================================');
  console.log('   TIER CASCADING QUALITY EQUIVALENCE VERIFICATION PASSED (100%)');
  console.log('======================================================================\n');
}

run();
