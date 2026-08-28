import assert from 'node:assert/strict';
import { BroccoliSQLPlanCache } from '../src/core/broccolidb/BroccoliSQLPlanCache';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PARAMETERIZED SQL PLAN CACHE');
  console.log('======================================================================\n');

  BroccoliSQLPlanCache.clear();

  // 1. Natural language query matching parameterized template
  const query1 = 'Show top 5 customers from US by spend in 2026';
  console.log('[1/2] Matching Natural Language Analytics Query to Prepared SQL Plan...');
  const res1 = BroccoliSQLPlanCache.matchAndExecute(query1, 1200, 80);

  console.log(`      - Is Plan Hit: ${res1.isPlanHit}`);
  console.log(`      - Intent Key: ${res1.intentKey}`);
  console.log(`      - Extracted Parameters:`, res1.parametersExtracted);
  console.log(`      - Constructed SQL Query: "${res1.constructedSql}"`);
  console.log(`      - Tokens Slashed: ${res1.tokensSaved} tokens`);
  console.log(`      - Dollars Saved: $${res1.dollarsSavedUsd.toFixed(6)} (100% LLM Cost Avoided)`);

  assert.equal(res1.isPlanHit, true);
  assert.equal(res1.intentKey, 'TOP_CUSTOMERS_BY_COUNTRY');
  assert.equal(res1.parametersExtracted.country, 'US');
  assert.equal(res1.parametersExtracted.limit, 5);
  assert.equal(res1.parametersExtracted.year, 2026);
  assert.ok(res1.constructedSql?.includes("WHERE country = 'US' AND year = 2026"));
  assert.equal(res1.tokensSaved, 1280);

  // 2. Query for organization active seats
  const query2 = 'What are the active seats for org_enterprise_991?';
  console.log('\n[2/2] Matching Subscription Lookup Query...');
  const res2 = BroccoliSQLPlanCache.matchAndExecute(query2, 1200, 80);

  console.log(`      - Is Plan Hit: ${res2.isPlanHit}`);
  console.log(`      - Intent Key: ${res2.intentKey}`);
  console.log(`      - Extracted Org ID: ${res2.parametersExtracted.org_id}`);
  console.log(`      - Constructed SQL Query: "${res2.constructedSql}"`);

  assert.equal(res2.isPlanHit, true);
  assert.equal(res2.parametersExtracted.org_id, 'org_enterprise_991');
  assert.ok(res2.constructedSql?.includes("WHERE org_id = 'org_enterprise_991'"));

  console.log('\n[✓] Parameterized SQL Plan Extraction & $0.000 Database Query Compilation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SQL PLAN CACHE TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
