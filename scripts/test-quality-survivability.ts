/**
 * Test: Quality Survivability & Sentinel Anomaly Engine
 * Tests autoregressive token loop detection, output syntax analysis,
 * and automated model quarantine remediation with temperature damping.
 */

import { GalxQualitySurvivabilityEngine } from '../src/core/quality/GalxQualitySurvivabilityEngine';

async function testQualitySurvivability() {
  console.log('======================================================================');
  console.log('   🧪  TESTING QUALITY SURVIVABILITY & SENTINEL ANOMALY ENGINE        ');
  console.log('======================================================================\n');

  const engine = GalxQualitySurvivabilityEngine.getInstance();

  // 1. Test Healthy Output Analysis
  console.log('1. Testing Healthy Output Quality Verification...');
  const healthyContent = 'Here is the clean TypeScript implementation:\n\n```typescript\nexport const speed = 100;\n```\nIt runs in O(1) time.';
  const healthyAnalysis = engine.analyzeOutput(healthyContent);
  console.log('   ✓ Healthy Output Analysis:', healthyAnalysis);
  if (!healthyAnalysis.isHealthy || healthyAnalysis.hasTokenLoop) {
    throw new Error('Expected healthy output to pass verification');
  }

  // 2. Test Autoregressive Token Loop Detection
  console.log('\n2. Testing Pathological Token Loop Detection...');
  const loopContent = 'The system is ready.\nThe system is ready.\nThe system is ready.\nThe system is ready.\nThe system is ready.';
  const loopDetected = GalxQualitySurvivabilityEngine.detectTokenLoop(loopContent);
  console.log('   ✓ Pathological Token Loop Detected:', loopDetected);
  if (!loopDetected) {
    throw new Error('Failed to detect consecutive line repetition loop');
  }

  const loopAnalysis = engine.analyzeOutput(loopContent);
  console.log('   ✓ Anomaly Score for Token Loop:', loopAnalysis.anomalyScore);
  if (loopAnalysis.isHealthy || !loopAnalysis.hasTokenLoop) {
    throw new Error('Expected token loop to be flagged as unhealthy');
  }

  // 3. Test Invalid JSON Payload Detection
  console.log('\n3. Testing JSON Schema Structure Validation...');
  const badJson = '{ "name": "GALXAI", "status": incomplete';
  const badJsonAnalysis = engine.analyzeOutput(badJson, true);
  console.log('   ✓ Bad JSON Analysis:', badJsonAnalysis);
  if (badJsonAnalysis.isJsonValid) {
    throw new Error('Expected invalid JSON to fail validation');
  }

  // 4. Test Model Survivability & Automated Failover Remediation
  console.log('\n4. Testing Automated Model Failover Remediation...');
  await engine.recordQualityTelemetry('gpt-5.6-luna', 'shard_cf_edge_direct', loopAnalysis);
  const remediation = await engine.evaluateModelSurvivability('gpt-5.6-luna');
  console.log('   ✓ Remediation Plan:', remediation);
  if (!remediation.shouldRetry || remediation.recommendedModel !== 'gpt-5.6-terra') {
    throw new Error('Expected automated failover promotion to gpt-5.6-terra');
  }

  console.log('\n======================================================================');
  console.log('   ✅ ALL QUALITY SURVIVABILITY INVARIANTS PASSED                    ');
  console.log('======================================================================\n');
}

testQualitySurvivability().catch(err => {
  console.error('\n❌ Quality Survivability Test Failed:', err);
  process.exit(1);
});
