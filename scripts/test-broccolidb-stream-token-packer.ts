import assert from 'node:assert/strict';
import { BroccoliStreamTokenPacker } from '../src/core/broccolidb/BroccoliStreamTokenPacker';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB STREAMING TOKEN PACKER & COMPACTOR');
  console.log('======================================================================\n');

  BroccoliStreamTokenPacker.clear();

  // Verbose streamed code output with 8-space indentation and runaway blank lines
  const verboseStreamOutput = `
function calculateMetrics() {
        const memoryUsage = process.memoryUsage().heapUsed;
        const totalMemory = process.memoryUsage().heapTotal;




        const ratio = memoryUsage / totalMemory;
        return ratio;
}
`.trim();

  console.log('[1/2] Packing In-Flight Streaming Output Chunk in BroccoliDB...');
  const res = BroccoliStreamTokenPacker.packStreamChunk(verboseStreamOutput);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Bytes: ${res.originalBytes} -> Packed Bytes: ${res.packedBytes}`);
  console.log(`      - Bytes Slashed: ${res.bytesSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Packed Output Preview:\n"""\n${res.packedText}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 10);
  assert.ok(!res.packedText.includes('        const memoryUsage')); // 8 spaces compacted to 2 spaces
  assert.ok(res.packedText.includes('  const memoryUsage'));
  assert.ok(!res.packedText.includes('\n\n\n\n')); // Blank lines collapsed

  console.log('\n[✓] In-Flight Stream Indentation Compaction & Byte Packing Verified.');

  console.log('\n======================================================================');
  console.log('   ALL STREAM TOKEN PACKER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
