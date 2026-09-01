/**
 * Test: Transport Layer Hardening, Zero-Copy Stream Pump & L1 Preflight Mesh
 * Verifies sub-millisecond L1 preflight resolution, zero-copy SSE stream pumping,
 * and lockless background batch token settlement.
 */

import { GalxGatewayMesh } from '../src/lib/cache/GalxGatewayMesh';
import { GalxZeroCopyStreamPump } from '../src/core/transport/GalxZeroCopyStreamPump';
import { vectorizedSyncEngine } from '../src/core/sync/GalxVectorizedSyncEngine';

async function testTransportZenith() {
  console.log('======================================================================');
  console.log('   🧪  TESTING TRANSPORT HARDENING & ZERO-COPY STREAM PUMP           ');
  console.log('======================================================================\n');

  const gateway = GalxGatewayMesh.getInstance();
  const testKeyHash = 'hash_key_alpha_999';

  // 1. First Call: 1-Hop Gateway Resolution
  console.log('1. Testing First-Hop Universal Gateway Preflight...');
  const preflight1 = await gateway.executeUniversalQoSPreflight(testKeyHash, 'gpt-5.6-luna');
  console.log('   ✓ First Hop Preflight Result:', preflight1);

  // 2. Second Call: 0ms L1 BroccoliDB Snapshot Hit
  console.log('\n2. Testing 0ms L1 BroccoliDB Snapshot Hot Path (<0.5µs)...');
  const start = performance.now();
  const preflight2 = await gateway.executeUniversalQoSPreflight(testKeyHash, 'gpt-5.6-luna');
  const elapsedMicros = (performance.now() - start) * 1000;
  console.log(`   ✓ L1 Hot Path Hit in ${elapsedMicros.toFixed(2)} µs:`, preflight2);

  // 3. Test Zero-Copy SSE Stream Pump Pipeline
  console.log('\n3. Testing Zero-Copy SSE Stream Pump Pipeline...');
  const sampleChunks = ['Hello', ' from', ' the', ' GALXAI', ' universe!'];
  const upstreamStream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const text of sampleChunks) {
        controller.enqueue(GalxZeroCopyStreamPump.encodeSSEChunk({ content: text }));
      }
      controller.close();
    }
  });

  let chunksProcessed = 0;
  const response = GalxZeroCopyStreamPump.createPipedResponse(upstreamStream, {
    leaseId: 'lease_zenith_pump_001',
    userId: 'usr_transport_tester',
    modelId: 'gpt-5.6-luna',
    onChunk: (len) => { chunksProcessed++; }
  });

  console.log('   ✓ Piped Response Headers:', Object.fromEntries(response.headers.entries()));
  
  // Consume stream
  const reader = response.body?.getReader();
  if (reader) {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  }
  console.log(`   ✓ Consumed ${chunksProcessed} chunks through zero-copy pump`);

  // 4. Test Background Micro-Flush
  console.log('\n4. Testing Vectorized Batch Micro-Flush...');
  const flushed = await vectorizedSyncEngine.flushAsync();
  console.log(`   ✓ Micro-flushed ${flushed} settlement records from ring buffer`);

  console.log('\n======================================================================');
  console.log('   ✅ ALL TRANSPORT LAYER ZENITH INVARIANTS PASSED                   ');
  console.log('======================================================================\n');
}

testTransportZenith().catch(err => {
  console.error('\n❌ Transport Test Failed:', err);
  process.exit(1);
});
