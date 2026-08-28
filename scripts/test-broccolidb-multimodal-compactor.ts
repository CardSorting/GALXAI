import assert from 'node:assert/strict';
import { BroccoliMultimodalCompactor, ImageContentPart } from '../src/core/broccolidb/BroccoliMultimodalCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB MULTIMODAL IMAGE & VISION TOKEN COMPACTOR');
  console.log('======================================================================\n');

  BroccoliMultimodalCompactor.clear();

  const sampleImage: ImageContentPart = {
    type: 'image_url',
    image_url: {
      url: 'https://assets.galx.ai/receipt_photo_102.jpg',
      detail: 'auto',
    },
  };

  // 1. Test Standard Image Classification (Should clamp to detail: "low" -> 85 tokens)
  console.log('[1/2] Testing Routine Image Classification ("Is this photo a receipt or a cat?")...');
  const res1 = BroccoliMultimodalCompactor.compactImage('Is this photo a receipt or a cat?', sampleImage);

  console.log(`      - Was Compacted: ${res1.wasCompacted}`);
  console.log(`      - Recommended Detail Mode: "${res1.recommendedDetail}"`);
  console.log(`      - Original Vision Tokens: ${res1.originalVisionTokens} -> Compacted: ${res1.compactedVisionTokens}`);
  console.log(`      - Vision Tokens Saved: ${res1.tokensSaved} (-${res1.savingsPercentage}%)`);

  assert.equal(res1.wasCompacted, true);
  assert.equal(res1.recommendedDetail, 'low');
  assert.equal(res1.compactedVisionTokens, 85);
  assert.ok(res1.savingsPercentage >= 95);

  // 2. Test High-Detail Vision Forensics (Should keep detail: "high" -> 2048 tokens)
  console.log('\n[2/2] Testing High-Detail Forensics ("Perform fine-grained microscopic bounding box detection")...');
  const res2 = BroccoliMultimodalCompactor.compactImage(
    'Perform fine-grained microscopic bounding box detection on small text on invoice',
    sampleImage
  );

  console.log(`      - Recommended Detail Mode: "${res2.recommendedDetail}"`);
  console.log(`      - Compacted Vision Tokens: ${res2.compactedVisionTokens}`);
  console.log(`      - Was Compacted: ${res2.wasCompacted}`);

  assert.equal(res2.recommendedDetail, 'high');
  assert.equal(res2.compactedVisionTokens, 2048);

  console.log('\n[✓] Multimodal Vision Token Compactor & Detail Mode Auto-Clamper Verified.');

  console.log('\n======================================================================');
  console.log('   ALL MULTIMODAL COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
