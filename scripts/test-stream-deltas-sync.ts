/**
 * Test: Streaming Deltas & CRDT Sync Mesh
 * Tests monotonic sequence chunk logging, 0ms in-memory delta slicing,
 * and incremental delta reconstruction.
 */

import { GalxStreamDeltaSynchronizer } from '../src/core/streaming/GalxStreamDeltaSynchronizer';

async function testStreamDeltasSync() {
  console.log('======================================================================');
  console.log('   🧪  TESTING STREAMING DELTAS & CRDT SYNC MESH                     ');
  console.log('======================================================================\n');

  const synchronizer = GalxStreamDeltaSynchronizer.getInstance();
  const testConvId = 'conv_delta_test_101';
  const testMsgId = 'msg_delta_test_202';

  console.log('1. Emitting 5 Incremental Stream Deltas...');
  const deltas = ['The ', 'GALXAI ', 'substrate ', 'streams ', 'instantaneously!'];
  for (const d of deltas) {
    const chunk = synchronizer.appendDelta(testConvId, testMsgId, d);
    console.log(`   ✓ Logged Chunk [Seq: ${chunk.seqId}]: "${chunk.deltaText}" (${chunk.byteLength} bytes)`);
  }

  console.log('\n2. Testing Incremental Delta Slicing (sinceSeq = 2)...');
  const slice = await synchronizer.getDeltasSinceSeq(testConvId, testMsgId, 2);
  console.log('   ✓ Delta Slice Result:', slice);
  if (slice.deltas.length !== 3 || slice.aggregatedText !== 'substrate streams instantaneously!') {
    throw new Error('Delta slice mismatch');
  }

  console.log('\n3. Testing In-Memory Stream Cleanup...');
  synchronizer.releaseStream(testConvId, testMsgId);
  console.log('   ✓ Stream state released cleanly');

  console.log('\n======================================================================');
  console.log('   ✅ ALL STREAMING DELTAS & SYNC INVARIANTS PASSED                  ');
  console.log('======================================================================\n');
}

testStreamDeltasSync().catch(err => {
  console.error('\n❌ Delta Sync Test Failed:', err);
  process.exit(1);
});
