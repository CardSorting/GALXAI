import assert from 'node:assert/strict';
import { BroccoliFixCompactor } from '../src/core/broccolidb/BroccoliFixCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB FIX PROTOCOL MARKET DATA & ORDER COMPACTOR');
  console.log('======================================================================\n');

  BroccoliFixCompactor.clear();

  // Multi-packet FIX 4.4 protocol log stream representing order submission, routing ack, and fill
  const rawFix = `
8=FIX.4.4|9=142|35=D|34=1020|49=GALXAI_CLIENT|52=20260828-15:29:59.800|56=CITADEL|11=ORD_94820|55=NVDA|54=1|38=50000|44=128.50|40=2|60=20260828-15:29:59.790|10=045|
8=FIX.4.4|9=156|35=8|34=1021|49=CITADEL|52=20260828-15:29:59.850|56=GALXAI_CLIENT|11=ORD_94820|37=EXEC_88490|150=0|39=0|55=NVDA|54=1|38=50000|44=128.50|40=2|151=50000|14=0|6=0.00|10=112|
8=FIX.4.4|9=184|35=8|34=1024|49=CITADEL|52=20260828-15:30:00.123|56=GALXAI_CLIENT|11=ORD_94820|37=EXEC_88492|150=2|39=2|55=NVDA|54=1|38=50000|44=128.50|40=2|32=50000|31=128.50|14=50000|6=128.50|151=0|60=20260828-15:30:00.120|10=084|
`.trim();


  console.log('[1/2] Compacting FIX Protocol Stream in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliFixCompactor.compactFix(rawFix);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Action: ${res.msgType}`);
  console.log(`      - Instrument & Side: ${res.symbolAndSide}`);
  console.log(`      - Terms: ${res.priceAndQty}`);
  console.log(`      - Execution: ${res.execStatus}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted FIX Preview:\n"""\n${res.compactedFixPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.msgType.includes('EXECUTION REPORT'));
  assert.equal(res.symbolAndSide, 'BUY NVDA');
  assert.ok(res.priceAndQty.includes('50000 @ $128.50'));
  assert.ok(res.execStatus.includes('FILLED'));
  assert.ok(res.savingsPercentage >= 35);
  assert.ok(res.compactedFixPrompt.includes('BUY NVDA'));

  assert.ok(res.compactedFixPrompt.includes('FILLED'));
  assert.ok(!res.compactedFixPrompt.includes('8=FIX.4.4')); // Header pruned
  assert.ok(!res.compactedFixPrompt.includes('10=084')); // Checksum pruned

  console.log('\n[✓] FIX Protocol Order & Execution Report Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL FIX COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
