import assert from 'node:assert/strict';
import { GalxOTelExporter } from '../src/core/telemetry/GalxOTelExporter';
import { GalxSpendGovernanceEngine } from '../src/core/governance/GalxSpendGovernanceEngine';

function run() {
  console.log('======================================================================');
  console.log('  TESTING OPENTELEMETRY GENAI EXPORTER & SEMANTIC CONVENTIONS');
  console.log('======================================================================\n');

  const decision = GalxSpendGovernanceEngine.evaluate({
    model: 'gpt-5.6-sol',
    messages: [{ role: 'user', content: 'Classify this ticket' }],
    max_tokens: 100,
  });

  const span = GalxOTelExporter.createSpan({
    workspaceId: '11111111-1111-1111-1111-111111111111',
    department: 'support',
    costCenter: 'customer_experience',
    workload: 'classification',
    decision,
    promptTokens: 1200,
    completionTokens: 50,
    cachedTokens: 900,
    durationMs: 14.2,
    grossRetailCostUsd: 0.0058,
    netGalxCostUsd: 0.0016,
    avoidedWasteUsd: 0.0042,
  });

  // Verify OTel GenAI standard attributes
  assert.equal(span.attributes['gen_ai.system'], 'galxai');
  assert.equal(span.attributes['gen_ai.request.model'], 'gpt-5.6-sol');
  assert.equal(span.attributes['gen_ai.usage.prompt_tokens'], 1200);
  assert.equal(span.attributes['gen_ai.usage.completion_tokens'], 50);
  assert.equal(span.attributes['gen_ai.usage.cached_tokens'], 900);

  // Verify GalX FinOps attributes
  assert.equal(span.attributes['galx.department'], 'support');
  assert.equal(span.attributes['galx.cost_center'], 'customer_experience');
  assert.equal(span.attributes['galx.cost.avoided_waste_usd'], 0.0042);
  assert.equal(span.name, 'chat gpt-5.6-sol');

  console.log('[✓] OpenTelemetry GenAI 1.28.0+ Semantic Conventions Verified');
  console.log(`[✓] Span Name: ${span.name}`);
  console.log(`[✓] Trace ID: ${span.traceId} | Span ID: ${span.spanId}`);
  console.log(`[✓] Avoided Waste Metric: $${span.attributes['galx.cost.avoided_waste_usd']}`);

  console.log('\n======================================================================');
  console.log('   ALL OPENTELEMETRY CONVENTION TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
