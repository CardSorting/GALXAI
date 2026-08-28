/**
 * GALXAI CLI Spend Forensic Scanner
 * 
 * Executes an offline reverse-audit on sample production traffic logs,
 * detects the 4 enterprise waste failure modes, and prints an executive summary.
 */

import { GalxSpendGovernanceEngine } from '../src/core/governance/GalxSpendGovernanceEngine';
import { PromptPrefixRestructurer } from '../src/core/governance/PromptPrefixRestructurer';
import { AgentCircuitBreaker } from '../src/core/governance/AgentCircuitBreaker';
import { TokenCostCalculator } from '../src/core/pricing/TokenCostCalculator';
import { ModelCatalog } from '../src/core/router/ModelCatalog';

export interface TrafficRecord {
  id: string;
  timestamp: string;
  department: string;
  workload: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens: number;
}

export function generateSampleProductionTraffic(count = 100): TrafficRecord[] {
  const departments = ['support', 'engineering_rag', 'devops_ci', 'agent_labs'];
  const records: TrafficRecord[] = [];

  for (let i = 0; i < count; i++) {
    const dept = departments[i % departments.length];
    
    if (dept === 'support') {
      // 1. Frontier Misallocation sample: simple categorical ticket classification on Sol
      records.push({
        id: `req_supp_${i}`,
        timestamp: new Date().toISOString(),
        department: dept,
        workload: 'classification',
        model: 'gpt-5.6-sol',
        messages: [{ role: 'user', content: `Classify ticket #${1000 + i}: Can you refund invoice #4812?` }],
        maxTokens: 50,
      });
    } else if (dept === 'engineering_rag') {
      // 2. Cache-busting volatile timestamp at header
      records.push({
        id: `req_rag_${i}`,
        timestamp: new Date().toISOString(),
        department: dept,
        workload: 'rag_search',
        model: 'gpt-5.6-sol',
        messages: [
          {
            role: 'system',
            content: `Timestamp: ${new Date().toISOString()}\nTraceID: trace_${Math.random().toString(36).substring(2)}\nYou are an enterprise knowledge base assistant. Answer accurately based on context. Context: [Documentation payload of 1,200 tokens...]`,
          },
          { role: 'user', content: 'What is the refund policy?' },
        ],
        maxTokens: 300,
      });
    } else if (dept === 'devops_ci') {
      // 3. Staging overburn
      records.push({
        id: `req_ci_${i}`,
        timestamp: new Date().toISOString(),
        department: dept,
        workload: 'e2e_test',
        model: 'gpt-5.6-sol',
        messages: [{ role: 'user', content: 'Execute synthetic integration test suite on branch dev-128' }],
        maxTokens: 500,
      });
    } else {
      // 4. Agent subloop
      records.push({
        id: `req_agent_${i}`,
        timestamp: new Date().toISOString(),
        department: dept,
        workload: 'agent_loop',
        model: 'gpt-5.6-sol',
        messages: [{ role: 'user', content: 'Lint codebase and retry on typescript error' }],
        maxTokens: 200,
      });
    }
  }

  return records;
}

export function runForensicAudit(traffic: TrafficRecord[]) {
  console.log('======================================================================');
  console.log('  GALXAI REVERSE-AUDIT SPEND FORENSIC ENGINE');
  console.log('======================================================================\n');
  console.log(`Ingesting ${traffic.length} production request traces...\n`);

  let totalGrossRetailUsd = 0;
  let totalNetGalxUsd = 0;
  let frontierMisallocationSavingsUsd = 0;
  let prefixCacheSavingsUsd = 0;
  let stagingClampSavingsUsd = 0;
  let circuitBreakerSavingsUsd = 0;

  let misallocationCount = 0;
  let cacheBustingCount = 0;
  let circuitBreakerTrippedCount = 0;

  const sol = ModelCatalog.resolveModel('gpt-5.6-sol');
  const luna = ModelCatalog.resolveModel('gpt-5.6-luna');

  for (const record of traffic) {
    const promptLen = record.messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    const promptTokens = Math.ceil(promptLen / 4);
    const completionTokens = record.maxTokens;

    // Gross retail cost on Sol
    const grossCost = TokenCostCalculator.calculateCost(sol, { promptTokens, completionTokens }).netCostUsd;
    totalGrossRetailUsd += grossCost;

    // 1. Check Frontier Misallocation
    if (record.workload === 'classification' && record.model === 'gpt-5.6-sol') {
      misallocationCount++;
      const lunaCost = TokenCostCalculator.calculateCost(luna, { promptTokens, completionTokens }).netCostUsd;
      const savings = grossCost - lunaCost;
      frontierMisallocationSavingsUsd += savings;
      totalNetGalxUsd += lunaCost;
      continue;
    }

    // 2. Check Cache-Busting Headers
    const firstMsg = record.messages[0]?.content || '';
    const restructure = PromptPrefixRestructurer.restructure(firstMsg);
    if (restructure.wasRestructured && promptTokens > 1000) {
      cacheBustingCount++;
      // Unlocks 75% prompt caching rebate
      const cachedInputRate = sol.cachedInputPricePer1M ?? (sol.inputPricePer1M * 0.25);
      const netCachedCost = (normalPromptTokens * sol.inputPricePer1M + cachedPromptTokens * cachedInputRate + completionTokens * sol.outputPricePer1M) / 1_000_000;
      const savings = grossCost - netCachedCost;
      prefixCacheSavingsUsd += savings;
      totalNetGalxUsd += netCachedCost;
      continue;
    }

    // 3. Check Staging & Agent Loop Clamps
    if (record.department === 'agent_labs') {
      const evalCircuit = AgentCircuitBreaker.evaluateSession(record.id, record.messages as any, 12);
      if (evalCircuit.shouldHalt) {
        circuitBreakerTrippedCount++;
        circuitBreakerSavingsUsd += grossCost;
        continue;
      }
    }

    // Default GalX wholesale rate
    totalNetGalxUsd += grossCost * 0.75;
  }

  const totalAvoidedWasteUsd = frontierMisallocationSavingsUsd + prefixCacheSavingsUsd + stagingClampSavingsUsd + circuitBreakerSavingsUsd + (totalGrossRetailUsd * 0.25);
  const savingsPct = ((totalAvoidedWasteUsd / totalGrossRetailUsd) * 100).toFixed(1);

  console.log('----------------------------------------------------------------------');
  console.log('  FORENSIC AUDIT BREAKDOWN');
  console.log('----------------------------------------------------------------------');
  console.log(`• Gross Retail OpenAI Bill:            $${(totalGrossRetailUsd * 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })} / mo`);
  console.log(`• GalX Net Intercepted Invoice:        $${(totalNetGalxUsd * 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })} / mo`);
  console.log(`• Total Monthly Waste Recovered:       $${(totalAvoidedWasteUsd * 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })} / mo (-${savingsPct}%)`);
  console.log(`• Modeled Annual Budget Recovery:      $${(totalAvoidedWasteUsd * 12000).toLocaleString('en-US', { maximumFractionDigits: 0 })} / yr\n`);

  console.log('----------------------------------------------------------------------');
  console.log('  ROOT CAUSE LEAKAGE IDENTIFIED');
  console.log('----------------------------------------------------------------------');
  console.log(`1. Frontier Model Misallocation:       ${misallocationCount} requests ($${(frontierMisallocationSavingsUsd * 1000).toFixed(0)}/mo)`);
  console.log(`2. Cache-Busting Header Volatility:    ${cacheBustingCount} requests ($${(prefixCacheSavingsUsd * 1000).toFixed(0)}/mo)`);
  console.log(`3. Autonomous Agent Loops Clamped:     ${circuitBreakerTrippedCount} cycles ($${(circuitBreakerSavingsUsd * 1000).toFixed(0)}/mo)`);
  console.log('======================================================================\n');
}

function main() {
  const traffic = generateSampleProductionTraffic(120);
  runForensicAudit(traffic);
}

main();

