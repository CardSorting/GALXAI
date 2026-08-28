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
  const samples = generateBenchmarkSamples(300);

  const result = TierCascadingEvalHarness.evaluateWorkload(
    'classification',
    samples,
    'gpt-5.6-sol',
    'gpt-5.6-luna'
  );

  const report = TierCascadingEvalHarness.generateAttestationReport(result);
  console.log(report);

  assert.equal(result.isApprovedForAutonomousRouting, true);
  assert.ok(result.evidence.lowerBoundQualityDelta >= -0.01);
  assert.ok(result.attestationDigest.length === 64);

  // Validate that the generated evidence satisfies the SpendGovernanceEngine
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

  console.log('\n✅ Verified: ModelRouteEvidence passed cryptographic and policy enforcement checks.\n');
}

run();
