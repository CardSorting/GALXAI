import assert from 'node:assert/strict';
import { GalxSpendGovernanceEngine } from '../src/core/governance/GalxSpendGovernanceEngine';
import { PromptPrefixRestructurer } from '../src/core/governance/PromptPrefixRestructurer';
import { AgentCircuitBreaker } from '../src/core/governance/AgentCircuitBreaker';
import { ModelCatalog } from '../src/core/router/ModelCatalog';
import { TokenCostCalculator } from '../src/core/pricing/TokenCostCalculator';

const baseRequest = {
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user' as const, content: 'Classify this ticket as billing or technical.' }],
  max_tokens: 100
};

const passingEvidence = {
  id: 'eval_ticket_classification_v1',
  requestedModel: 'gpt-5.6-sol',
  targetModel: 'gpt-5.6-luna',
  workload: 'classification',
  status: 'approved' as const,
  sampleSize: 500,
  baselineSuccessRate: 0.982,
  candidateSuccessRate: 0.981,
  lowerBoundQualityDelta: -0.006,
  evaluatedAt: '2026-08-27T00:00:00.000Z',
  expiresAt: '2027-08-27T00:00:00.000Z'
};

function run(): void {
  // 1. Basic Engine Tests
  const unattributed = GalxSpendGovernanceEngine.evaluate(baseRequest);
  assert.equal(unattributed.action, 'allow');
  assert.equal(unattributed.effectiveModel, 'gpt-5.6-sol');
  assert.equal(unattributed.recommendedModel, undefined);

  const recommendation = GalxSpendGovernanceEngine.evaluate(
    baseRequest,
    { workload: 'classification', department: 'support' },
    { mode: 'recommend' }
  );
  assert.equal(recommendation.action, 'allow');
  assert.equal(recommendation.effectiveModel, 'gpt-5.6-sol');
  assert.equal(recommendation.recommendedModel, 'gpt-5.6-luna');
  assert.equal(recommendation.requiresApproval, true);

  const unenforcedWithoutEvidence = GalxSpendGovernanceEngine.evaluate(
    baseRequest,
    { workload: 'classification', department: 'support' },
    { mode: 'enforce' }
  );
  assert.equal(unenforcedWithoutEvidence.action, 'allow');
  assert.equal(unenforcedWithoutEvidence.effectiveModel, 'gpt-5.6-sol');

  const evidenceGatedRoute = GalxSpendGovernanceEngine.evaluate(
    baseRequest,
    { workload: 'classification', department: 'support' },
    { mode: 'enforce', approvedRoutes: [passingEvidence] }
  );
  assert.equal(evidenceGatedRoute.action, 'route');
  assert.equal(evidenceGatedRoute.effectiveModel, 'gpt-5.6-luna');
  assert.equal(evidenceGatedRoute.routeEvidenceId, passingEvidence.id);

  const insufficientEvidence = GalxSpendGovernanceEngine.evaluate(
    baseRequest,
    { workload: 'classification', department: 'support' },
    { mode: 'enforce', approvedRoutes: [{ ...passingEvidence, sampleSize: 20 }] }
  );
  assert.equal(insufficientEvidence.action, 'allow');
  assert.ok(insufficientEvidence.reasonCodes.includes('QUALITY_SAMPLE_TOO_SMALL'));

  const toolCall = GalxSpendGovernanceEngine.evaluate(
    { ...baseRequest, tools: [{ type: 'function', function: { name: 'refund' } }] },
    { workload: 'classification', department: 'support' },
    { mode: 'enforce', approvedRoutes: [passingEvidence] }
  );
  assert.equal(toolCall.action, 'allow');
  assert.equal(toolCall.recommendedModel, undefined);

  const capped = GalxSpendGovernanceEngine.evaluate(
    { ...baseRequest, max_tokens: 10_000 },
    { workload: 'classification', department: 'support' },
    { mode: 'enforce', maxOutputTokens: 1_000, approvedRoutes: [passingEvidence] }
  );
  assert.equal(capped.action, 'block');
  assert.ok(capped.reasonCodes.includes('OUTPUT_TOKEN_LIMIT_EXCEEDED'));

  // 2. Prompt Prefix Restructurer Tests
  const volatilePrompt = `Timestamp: 2026-08-27T22:30:00Z\nRequest ID: req_981723a89bcdef01\nYou are an enterprise SQL query generator. Follow the schema strictly:\nCREATE TABLE customers (id INT, name TEXT);`;
  const restructured = PromptPrefixRestructurer.restructure(volatilePrompt);
  assert.equal(restructured.wasRestructured, true);
  assert.equal(restructured.detectedVolatileHeaders.length, 2);
  assert.ok(restructured.restructuredPrompt.startsWith('You are an enterprise SQL query generator.'));

  // 3. Agent Circuit Breaker Tests
  const sessionId = 'test_agent_session_101';
  AgentCircuitBreaker.resetSession(sessionId);
  
  for (let turn = 1; turn <= 12; turn++) {
    const evalResult = AgentCircuitBreaker.evaluateSession(
      sessionId,
      [{ role: 'user', content: `Turn iteration ${turn}` }],
      12
    );
    assert.equal(evalResult.shouldHalt, false);
  }

  // Turn 13 should trip circuit breaker
  const tripped = AgentCircuitBreaker.evaluateSession(
    sessionId,
    [{ role: 'user', content: 'Turn iteration 13' }],
    12
  );
  assert.equal(tripped.shouldHalt, true);
  assert.equal(tripped.reason, 'MAX_TURNS_EXCEEDED');

  // 4. Model Catalog & Pricing Validation
  const sol = ModelCatalog.resolveModel('gpt-5.6-sol');
  const terra = ModelCatalog.resolveModel('gpt-5.6-terra');
  const luna = ModelCatalog.resolveModel('gpt-5.6-luna');
  assert.deepEqual(
    [sol.inputPricePer1M, sol.cachedInputPricePer1M, sol.outputPricePer1M],
    [4, 0.4, 20]
  );
  assert.deepEqual(
    [terra.inputPricePer1M, terra.cachedInputPricePer1M, terra.outputPricePer1M],
    [2, 0.2, 12]
  );
  assert.deepEqual(
    [luna.inputPricePer1M, luna.cachedInputPricePer1M, luna.outputPricePer1M],
    [0.2, 0.02, 1.2]
  );
  assert.equal(sol.contextWindowTokens, 1_050_000);

  const cacheWrite = TokenCostCalculator.calculateCost(sol, {
    promptTokens: 1_000,
    cacheCreationTokens: 1_000
  });
  assert.equal(cacheWrite.cacheCreationCostUsd, 0.005);

  const longContext = TokenCostCalculator.calculateCost(sol, {
    promptTokens: 300_000,
    completionTokens: 1_000
  });
  assert.equal(longContext.promptCostUsd, 2.4);
  assert.equal(longContext.completionCostUsd, 0.03);

  console.log('Spend governance validation passed (including Prefix Restructurer & Circuit Breaker).');
}

run();
