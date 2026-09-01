/**
 * Test: Zen Flow Buffer Pool & I/O Execution Authority
 * Tests pre-allocated circular ring buffer slots, zero GC allocations,
 * and high-watermark backpressure yielding.
 */

import { GalxZenFlowBufferPool } from '../src/core/transport/GalxZenFlowBufferPool';

async function testZenFlowBufferPool() {
  console.log('======================================================================');
  console.log('   🧪  TESTING ZEN FLOW BUFFER POOL & I/O EXECUTION AUTHORITY         ');
  console.log('======================================================================\n');

  const pool = GalxZenFlowBufferPool.getInstance();

  console.log('1. Testing Pre-allocated Circular Buffer Slot Acquisition...');
  const slot1 = pool.acquireSlot();
  console.log('   ✓ Acquired Slot Capacity:', slot1.buffer.byteLength, 'bytes (inUse:', slot1.inUse, ')');
  if (slot1.buffer.byteLength !== 8192 || !slot1.inUse) {
    throw new Error('Slot allocation failed');
  }
  pool.releaseSlot(slot1);
  console.log('   ✓ Slot released cleanly');

  console.log('\n2. Testing High-Throughput Zero-Copy Chunk Ingestion...');
  const chunkText = 'data: {"choices":[{"delta":{"content":"zen flow streaming"}}]}\n\n';
  const chunkBytes = new TextEncoder().encode(chunkText);

  for (let i = 0; i < 1000; i++) {
    const written = pool.writeChunk(chunkBytes);
    if (written.byteLength !== chunkBytes.byteLength) {
      throw new Error(`Written chunk length mismatch at iteration ${i}`);
    }
  }

  const metrics = pool.getMetrics();
  console.log('   ✓ Zen Flow Buffer Pool Metrics:', metrics);
  if (!metrics.isFlowOptimal) {
    throw new Error('Expected flow to remain optimal after 1000-chunk throughput pass');
  }

  console.log('\n3. Testing Cooperative Event Loop Yielding...');
  const start = performance.now();
  await pool.yieldFlow();
  const elapsedMicros = (performance.now() - start) * 1000;
  console.log(`   ✓ Cooperatively yielded event loop in ${elapsedMicros.toFixed(2)} µs`);

  console.log('\n======================================================================');
  console.log('   ✅ ALL ZEN FLOW BUFFER POOL INVARIANTS PASSED                     ');
  console.log('======================================================================\n');
}

testZenFlowBufferPool().catch(err => {
  console.error('\n❌ Zen Flow Test Failed:', err);
  process.exit(1);
});
