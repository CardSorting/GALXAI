import assert from 'node:assert/strict';
import { BroccoliPerformanceReviewCompactor } from '../src/core/broccolidb/BroccoliPerformanceReviewCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PERFORMANCE REVIEW & 360 FEEDBACK COMPACTOR');
  console.log('======================================================================\n');

  BroccoliPerformanceReviewCompactor.clear();

  // Full mock 360 performance review with rating scale explanations, peer chit-chat, and duplicate notes
  const rawReview = `
360-DEGREE TALENT CALIBRATION & ANNUAL PERFORMANCE REVIEW
EMPLOYEE: Alex Chen | DEPARTMENT: Core Engineering | MANAGER: Sarah Jenkins
REVIEW CYCLE: H1 2026 Annual Performance Calibration

RATING SCALE DEFINITION:
1 - Needs Immediate Improvement
2 - Developing
3 - Meets Expectations
4 - Exceeds Expectations
5 - Exceptional / Transformational

CALIBRATED RATING: EXCEEDS EXPECTATIONS (4.8 / 5.0)
OVERALL IMPACT: Top 3% Organizational Contributor

MANAGER EVALUATION - KEY ACCOMPLISHMENTS & STRENGTHS:
Alex showed extraordinary ownership in designing and deploying our sub-microsecond FinOps Gateway, directly saving $1.4M in cloud LLM inference bills. Technical execution velocity and architecture quality are consistently world-class.

PEER 360 FEEDBACK & COLLABORATION:
Peer 1 (Marcus): It is always a huge delight to work with Alex! Great attitude, always brings snacks to offsites, very nice person.
Peer 2 (Elena): Alex unblocked our team on Kubernetes cluster migrations within hours.

AREAS FOR DEVELOPMENT & GROWTH OPPORTUNITY:
Continue to invest in delegating operational maintenance and on-call runbooks to junior engineers to prevent bottlenecks and increase broader squad leverage.
`.trim();

  console.log('[1/2] Compacting 360 Performance Review in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliPerformanceReviewCompactor.compactReview(rawReview);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Employee: ${res.employeeAndReviewCycle}`);
  console.log(`      - Rating: ${res.calibratedRatingAndImpact}`);
  console.log(`      - Strengths: ${res.keyStrengthsAndDelivery}`);
  console.log(`      - Growth: ${res.growthAreasAndDevelopment}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Review Preview:\n"""\n${res.compactedReviewPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.employeeAndReviewCycle.includes('Alex Chen'));
  assert.ok(res.calibratedRatingAndImpact.includes('EXCEEDS EXPECTATIONS'));
  assert.ok(res.calibratedRatingAndImpact.includes('Top 3%'));
  assert.ok(res.savingsPercentage >= 30);
  assert.ok(!res.compactedReviewPrompt.includes('1 - Needs Immediate Improvement')); // Rating scale legend pruned

  assert.ok(!res.compactedReviewPrompt.includes('always brings snacks to offsites')); // Peer chit-chat pruned

  console.log('\n[✓] 360 Performance Review & Calibration Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL PERFORMANCE REVIEW COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
