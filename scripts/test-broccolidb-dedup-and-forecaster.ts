import assert from 'node:assert/strict';
import { BroccoliPromptDeduplicator } from '../src/core/broccolidb/BroccoliPromptDeduplicator';
import { BroccoliSpendForecaster } from '../src/core/broccolidb/BroccoliSpendForecaster';
import { BroccoliSpendAnalytics } from '../src/core/broccolidb/BroccoliSpendAnalytics';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PROMPT DEDUPLICATOR & SPEND FORECASTER');
  console.log('======================================================================\n');

  BroccoliPromptDeduplicator.clear();
  BroccoliSpendAnalytics.clear();

  // 1. Test Prompt Chunk Deduplication in Multi-Turn Agent Swarms
  console.log('[1/2] Simulating 3-Turn Agent Session with Repeated 500-Token Database Schema...');
  const largeSchemaParagraph = `
CREATE TABLE enterprise_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  billing_tier TEXT NOT NULL CHECK (billing_tier IN ('starter', 'growth', 'enterprise_zenith')),
  stripe_customer_id TEXT UNIQUE,
  monthly_spend_cap_usd NUMERIC(12, 4) DEFAULT 1000.0000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`.repeat(3); // ~600 chars

  const multiTurnMessages = [
    {
      role: 'system',
      content: `You are an agent.\n\n${largeSchemaParagraph}`,
    },
    {
      role: 'user',
      content: 'Generate SQL query to list all enterprise_zenith customers',
    },
    {
      role: 'assistant',
      content: `Here is the query.\n\n${largeSchemaParagraph}`, // Subagent re-appends full schema in Turn 3
    },
    {
      role: 'user',
      content: 'Now calculate total count',
    },
    {
      role: 'assistant',
      content: `Here is the count query.\n\n${largeSchemaParagraph}`, // Subagent re-appends full schema in Turn 5
    },
  ];

  const dedupResult = BroccoliPromptDeduplicator.deduplicate(multiTurnMessages);

  console.log(`      - Was Deduplicated: ${dedupResult.wasDeduplicated}`);
  console.log(`      - Original Tokens: ${dedupResult.originalTokens}`);
  console.log(`      - Deduplicated Tokens: ${dedupResult.deduplicatedTokens}`);
  console.log(`      - Tokens Saved: ${dedupResult.tokensSaved} (-${dedupResult.savingsPercentage}%)`);

  assert.equal(dedupResult.wasDeduplicated, true);
  assert.ok(dedupResult.savingsPercentage >= 40);
  assert.ok(dedupResult.cleanedMessages[2].content.includes('[Omitted Duplicate Context: See Turn 1'));

  // 2. Test Real-Time Departmental Spend Forecasting
  console.log('\n[2/2] Ingesting Spend Telemetry & Computing 95% CI Spend Forecast...');
  for (let i = 1; i <= 25; i++) {
    BroccoliSpendAnalytics.recordSpend({
      id: `spend_sample_${i}`,
      department: 'core_product',
      costCenter: 'rag_search',
      serviceId: 'semantic_retrieval',
      model: 'gpt-5.6-luna',
      grossRetailUsd: 0.15,
      netGalxUsd: 0.03,
      avoidedWasteUsd: 0.12,
      promptTokens: 1500,
      completionTokens: 100,
      durationMs: 32.0,
      timestampMs: Date.now(),
    });
  }

  const forecast = BroccoliSpendForecaster.forecastDepartment('core_product');

  console.log(`      - Department: ${forecast.department}`);
  console.log(`      - Sample Ingested: ${forecast.sampleCount} requests`);
  console.log(`      - Forecasted EOM Gross Spend: $${forecast.forecastedEomRetailSpendUsd.toLocaleString()}/mo`);
  console.log(`      - Forecasted EOM Net GalX Spend: $${forecast.forecastedEomNetGalxSpendUsd.toLocaleString()}/mo`);
  console.log(`      - Modeled Monthly Recovery: $${forecast.modeledMonthlySavingsUsd.toLocaleString()}/mo`);
  console.log(`      - Projected Annual Savings: $${forecast.projectedAnnualBudgetRecoveryUsd.toLocaleString()}/yr`);
  console.log(`      - 95% Confidence Interval: [$${forecast.confidenceInterval95Pct[0]}, $${forecast.confidenceInterval95Pct[1]}]`);

  assert.equal(forecast.sampleCount, 25);
  assert.equal(forecast.forecastedEomRetailSpendUsd, 1500.00);
  assert.equal(forecast.forecastedEomNetGalxSpendUsd, 300.00);
  assert.equal(forecast.modeledMonthlySavingsUsd, 1200.00);
  assert.equal(forecast.projectedAnnualBudgetRecoveryUsd, 14400.00);

  console.log('\n[✓] Multi-Turn Chunk Deduplication & Real-Time Spend Forecasting Verified.');

  console.log('\n======================================================================');
  console.log('   ALL DEDUPLICATION & FORECASTER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
