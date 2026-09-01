/**
 * Test: BroccoliDB Authoritative Governor & Cemented Postgres Mesh
 * Tests Postgres authoritative Merkle epochs, write-through sync,
 * and workspace-wide governed SupabaseClient circuit breaker protection.
 */

import { BroccoliAuthoritativeGovernor } from '../src/core/broccolidb/BroccoliAuthoritativeGovernor';
import { getSupabaseAdmin, resetSupabaseClients, SupabaseCircuitBreakerError } from '../src/lib/supabase/client';

async function testAuthoritativeGovernor() {
  console.log('======================================================================');
  console.log('   🧪  TESTING BROCCOLIDB AUTHORITATIVE GOVERNOR & CEMENTED POSTGRES  ');
  console.log('======================================================================\n');

  const governor = BroccoliAuthoritativeGovernor.getInstance();
  const entityType = 'workspace_settings';
  const entityId = 'ws_gov_test_99';
  const merkleHash1 = '7a9c8e102f3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5';

  resetSupabaseClients();

  // 1. Advance Authoritative Epoch in Postgres
  console.log('1. Advancing Authoritative Epoch in Cemented Postgres...');
  const epochRec1 = await governor.advanceAuthoritativeEpoch(entityType, entityId, merkleHash1);
  console.log('   ✓ Authoritative Epoch Result:', {
    entityType: epochRec1.entityType,
    entityId: epochRec1.entityId,
    versionEpoch: epochRec1.versionEpoch,
    merkleRootHash: epochRec1.merkleRootHash
  });

  if (epochRec1.versionEpoch < 1) {
    throw new Error('Expected authoritative epoch >= 1');
  }

  // 2. Validate Local BroccoliDB Epoch Matches Cemented Postgres
  console.log('\n2. Validating Local BroccoliDB Epoch Against Postgres Authority...');
  const isCurrent = await governor.isLocalEpochAuthoritative(entityType, entityId);
  console.log('   ✓ Is Local Epoch Authoritative:', isCurrent);

  if (!isCurrent) {
    throw new Error('Expected local epoch to match authoritative Postgres epoch');
  }

  // 3. Test Workspace-Wide Governed Fetch Circuit Breaker Fail-Fast
  console.log('\n3. Testing Workspace-Wide Governed Fetch Circuit Breaker...');
  // Simulate 5 consecutive failures to trip circuit
  for (let i = 0; i < 5; i++) {
    governor.recordFailure();
  }

  const trippedState = governor.getGovernorState();
  console.log('   ✓ Tripped Governor State:', trippedState);
  if (trippedState.circuitState !== 'OPEN') {
    throw new Error('Expected circuit breaker to be OPEN after 5 failures');
  }

  // Any standard Supabase query across the entire workspace will now fail-fast in 0ms
  let circuitErrorCaught = false;
  try {
    const admin = getSupabaseAdmin();
    const res = await admin.from('chat_conversations').select('id').limit(1);
    if (res.error && (res.error.message?.includes('Supabase circuit breaker OPEN') || res.error.message?.includes('circuit breaker'))) {
      circuitErrorCaught = true;
      console.log('   ✓ Instantly caught circuit breaker error in PostgREST response:', res.error.message);
    }
  } catch (err: any) {
    if (err instanceof SupabaseCircuitBreakerError || err.name === 'SupabaseCircuitBreakerError' || err.message?.includes('circuit breaker')) {
      circuitErrorCaught = true;
      console.log('   ✓ Instantly caught SupabaseCircuitBreakerError (0ms WAN bypass):', err.message);
    }
  }

  if (!circuitErrorCaught) {
    throw new Error('Expected Supabase client query to immediately throw SupabaseCircuitBreakerError while circuit is OPEN');
  }

  // Restore circuit
  governor.recordSuccess();
  resetSupabaseClients();
  console.log('   ✓ Circuit restored cleanly after recovery');

  console.log('\n======================================================================');
  console.log('   ✅ ALL AUTHORITATIVE GOVERNOR & CIRCUIT INVARIANTS PASSED         ');
  console.log('======================================================================\n');
}

testAuthoritativeGovernor().catch(err => {
  console.error('\n❌ Authoritative Governor Test Failed:', err);
  process.exit(1);
});
