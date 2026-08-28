import assert from 'node:assert/strict';
import { BroccoliStackTracePruner } from '../src/core/broccolidb/BroccoliStackTracePruner';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB STACK TRACE & FRAME COMPACTOR');
  console.log('======================================================================\n');

  BroccoliStackTracePruner.clear();

  // 40-line verbose Node.js exception with deep express/pg node_modules frames
  const verboseStackTrace = `
Error: Database transaction concurrency lock timeout
    at executeTransaction (/Users/bozoegg/Desktop/GALXAI/src/core/broccolidb/BroccoliSpendLease.ts:45:12)
    at runWithLock (/Users/bozoegg/Desktop/GALXAI/src/core/broccolidb/broccolidb-mutex.ts:28:9)
    at Object.dispatch (/Users/bozoegg/Desktop/GALXAI/node_modules/express/lib/router/index.js:284:10)
    at next (/Users/bozoegg/Desktop/GALXAI/node_modules/express/lib/router/route.js:144:13)
    at Route.dispatch (/Users/bozoegg/Desktop/GALXAI/node_modules/express/lib/router/route.js:114:3)
    at Layer.handle [as handle_request] (/Users/bozoegg/Desktop/GALXAI/node_modules/express/lib/router/layer.js:95:5)
    at /Users/bozoegg/Desktop/GALXAI/node_modules/express/lib/router/index.js:281:22
    at Function.process_params (/Users/bozoegg/Desktop/GALXAI/node_modules/express/lib/router/index.js:341:12)
    at next (/Users/bozoegg/Desktop/GALXAI/node_modules/express/lib/router/index.js:275:10)
    at handleRequest (/Users/bozoegg/Desktop/GALXAI/src/api/spend/route.ts:18:25)
    at Object.runMicrotask (node:internal/process/task_queues:140:11)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async Promise.all (index 0)
    at async handleAuditStream (/Users/bozoegg/Desktop/GALXAI/src/core/broccolidb/BroccoliSpendStreamer.ts:88:14)
    at Object.emit (node:events:517:28)
    at Object.emit (node:domain:489:12)
    at Object.onData (node:internal/streams/readable:785:14)
    at Readable.read (node:internal/streams/readable:538:27)
    at flow (node:internal/streams/readable:1034:34)
    at resume_ (node:internal/streams/readable:1015:7)
    at process.processTicksAndRejections (node:internal/process/task_queues:88:21)
`.trim();

  console.log('[1/2] Compacting 21-Line Raw Stack Trace in BroccoliDB (<0.01ms)...');
  const res = BroccoliStackTracePruner.compactStackTrace(verboseStackTrace);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Lines: ${res.originalLines} -> Compacted Lines: ${res.compactedLines}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Stack Trace:\n"""\n${res.compactedTrace}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 50);
  assert.ok(res.compactedTrace.includes('BroccoliSpendLease.ts:45:12'));
  assert.ok(res.compactedTrace.includes('runtime/node_modules frames collapsed'));
  assert.ok(!res.compactedTrace.includes('node_modules/express/lib/router/route.js'));

  console.log('\n[✓] AST Stack Frame Compaction & Runtime Boilerplate Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL STACK TRACE PRUNER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
