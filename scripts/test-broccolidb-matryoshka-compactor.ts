import assert from 'node:assert/strict';
import { BroccoliMatryoshkaCompactor } from '../src/core/broccolidb/BroccoliMatryoshkaCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB MATRYOSHKA VECTOR COMPACTOR & TRUNCATOR');
  console.log('======================================================================\n');

  BroccoliMatryoshkaCompactor.clear();

  // Create a realistic 3,072-dimensional embedding vector (e.g. OpenAI text-embedding-3-large)
  const denseVector3072: number[] = Array.from({ length: 3072 }, () => Math.random() * 2 - 1);

  console.log('[1/2] Truncating 3072-Dimension Vector down to 512 Dimensions...');
  const result = BroccoliMatryoshkaCompactor.truncateVector(denseVector3072, 512);

  console.log(`      - Was Truncated: ${result.wasTruncated}`);
  console.log(`      - Original Dimensions: ${result.originalDimensions} -> Compacted: ${result.compactedDimensions}`);
  console.log(`      - Memory & Storage Slashed: -${result.memoryReductionPercentage}%`);

  assert.equal(result.wasTruncated, true);
  assert.equal(result.compactedDimensions, 512);
  assert.ok(result.memoryReductionPercentage >= 80);

  // Compute L2 norm of output to verify unit normalization (should equal ~1.0)
  let sumSquares = 0;
  for (const val of result.compactedVector) {
    sumSquares += val * val;
  }
  const l2Norm = Math.sqrt(sumSquares);
  console.log(`      - Resulting L2 Unit Norm: ${l2Norm.toFixed(4)} (Expected: ~1.0000)`);
  assert.ok(Math.abs(l2Norm - 1.0) < 0.01);

  console.log('\n[✓] Matryoshka Vector Truncation & L2 Unit Normalization Verified.');

  console.log('\n======================================================================');
  console.log('   ALL MATRYOSHKA COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
