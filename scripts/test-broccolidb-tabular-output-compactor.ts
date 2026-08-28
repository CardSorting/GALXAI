import assert from 'node:assert/strict';
import { BroccoliTabularOutputCompactor } from '../src/core/broccolidb/BroccoliTabularOutputCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB TABULAR OUTPUT COMPACTOR & OBJECT INFLATOR');
  console.log('======================================================================\n');

  BroccoliTabularOutputCompactor.clear();

  // 1. Optimize Prompt Directive
  console.log('[1/2] Optimizing Prompt Directive for Bulk Customer Export...');
  const promptRes = BroccoliTabularOutputCompactor.optimizePromptDirective('List all users registered in the billing database');
  console.log(`      - Was Optimized: ${promptRes.wasOptimized}`);
  console.log(`      - Transformed Directive:\n"""\n${promptRes.transformedPrompt}\n"""`);
  assert.equal(promptRes.wasOptimized, true);

  // 2. Simulate Compact TSV Response (20 rows of tabular data)
  const headers = 'id\tfirst_name\tlast_name\temail\tplan\tmrr';
  const rows = Array.from(
    { length: 20 },
    (_, i) => `cust_${i + 1}\tCustomer${i + 1}\tCorp\tcust${i + 1}@corp.com\tenterprise\t${1000 + i * 50}`
  );
  const tsvPayload = [headers, ...rows].join('\n');

  console.log('\n[2/2] Inflating 20-Row TSV Payload into Typed JSON Objects in BroccoliDB...');
  const inflateRes = BroccoliTabularOutputCompactor.inflateTabularOutput(tsvPayload);

  console.log(`      - Total Rows Inflated: ${inflateRes.totalRowsInflated}`);
  console.log(`      - Equivalent JSON Tokens: ${inflateRes.equivalentJsonTokens} -> TSV Stream Tokens: ${inflateRes.originalOutputTokens}`);
  console.log(`      - Output Tokens Saved: ${inflateRes.outputTokensSaved} (-${((inflateRes.outputTokensSaved / inflateRes.equivalentJsonTokens) * 100).toFixed(1)}%)`);
  console.log(`      - Dollars Saved: $${inflateRes.costSavedUsd.toFixed(4)}`);
  console.log(`      - First Parsed Object:`, inflateRes.parsedObjects[0]);

  assert.equal(inflateRes.totalRowsInflated, 20);
  assert.ok(inflateRes.outputTokensSaved > 0);
  assert.equal(inflateRes.parsedObjects[0].id, 'cust_1');
  assert.equal(inflateRes.parsedObjects[0].mrr, 1000);

  console.log('\n[✓] Tabular Output Format Compression & Object Inflation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL TABULAR COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
