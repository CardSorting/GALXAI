/**
 * GALXAI: Automated Verification of API Key Minting, Cryptographic Checksums,
 * Seeded Account Association, Identity Resolution, Wallet Pre-Auth, and End-to-End Route Ingestion.
 *
 * Usage: npx tsx scripts/test-api-key-with-seeded-account.ts
 */

import { NextRequest } from 'next/server';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import { ApiKeyRepository, WalletRepository, WorkspaceRepository } from '../src/lib/supabase';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { GalxPersistence } from '../src/lib/storage/GalxPersistence';
import { GET as getModels } from '../src/app/v1/models/route';

async function run() {
  console.log('======================================================================');
  console.log('   GALXAI: API KEY CREATION & SEEDED ACCOUNT END-TO-END TEST');
  console.log('======================================================================\n');

  const apiKeyRepo = ApiKeyRepository.getInstance();
  const walletRepo = WalletRepository.getInstance();
  const workspaceRepo = WorkspaceRepository.getInstance();
  const authEngine = GalxAuthEngine.getInstance();
  const persistence = GalxPersistence.getInstance();

  const seededUserId = 'usr_galx_developer_master';

  // STEP 1: Verify Seeded Account Substrate (Workspace & Wallet)
  console.log('--- STEP 1: Verifying Seeded Account Substrate ---');
  const seededWallet = await walletRepo.createOrGetWallet(seededUserId);
  console.log(`[✓] Seeded Account: ${seededUserId}`);
  console.log(`    Current Wallet Balance : $${seededWallet.balanceUsd.toFixed(4)} USD`);
  console.log(`    Deposit Verified       : ${seededWallet.proofOfDepositVerified}`);

  if (seededWallet.balanceUsd <= 0) {
    console.log('    Applying initial deposit + 50% promotional match for test...');
    const match = await walletRepo.verifyDepositAndApplyMatch({
      userId: seededUserId,
      depositAmountUsd: 10.0,
      paymentRef: `test_deposit_${Date.now()}`
    });
    console.log(`[✓] Wallet funded: New Balance = $${match.newBalance} USD`);
  }

  // STEP 2: Dynamically Mint a Fresh Gateway API Key
  console.log('\n--- STEP 2: Minting Fresh Gateway API Key ---');
  const keyName = 'Automated Verification Agent Key';
  const { apiKey, keyPrefix, keyHash, checksum, environment } = GalxCryptoVault.generateGatewayKey(
    keyName,
    seededUserId,
    { environment: 'live' }
  );

  const keyId = `key_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[✓] Minted Raw API Key : ${apiKey}`);
  console.log(`    Key ID             : ${keyId}`);
  console.log(`    Key Prefix         : ${keyPrefix}`);
  console.log(`    Key SHA-256 Hash   : ${keyHash.substring(0, 16)}...`);
  console.log(`    Embedded Checksum  : ${checksum}`);
  console.log(`    Environment        : ${environment}`);

  // STEP 3: Offline Format & Checksum Verification
  console.log('\n--- STEP 3: Validating Cryptographic Key Format (Zero DB Egress) ---');
  const formatCheck = GalxCryptoVault.validateKeyFormat(apiKey);
  if (!formatCheck.valid || formatCheck.environment !== 'live') {
    throw new Error(`Offline format validation failed for key: ${apiKey}`);
  }
  console.log(`[✓] Valid Key Checksum Verified: env=${formatCheck.environment}`);

  // Intentionally tamper with checksum to verify offline forgery rejection
  const tamperedKey = `${apiKey.slice(0, -2)}xx`;
  const tamperedCheck = GalxCryptoVault.validateKeyFormat(tamperedKey);
  if (tamperedCheck.valid) {
    throw new Error('Security Failure: Tampered key with invalid checksum was accepted!');
  }
  console.log(`[✓] Tampered Key Correctly Rejected by Checksum Guard: ${tamperedKey.slice(-10)}`);

  // STEP 4: Persist Key to Supabase / In-Memory Table
  console.log('\n--- STEP 4: Persisting API Key with Seeded User Association ---');
  const newGatewayKey = {
    id: keyId,
    prefix: keyPrefix,
    keyPrefix,
    keyHash,
    name: keyName,
    userId: seededUserId,
    rateLimitPerMinute: 300,
    totalRequests: 0,
    totalTokens: 0,
    createdAtMs: Date.now(),
    revoked: false,
    environment: 'live' as const,
    scopes: ['*'],
    checksum,
    computePool: 'priority_dedicated' as const,
    freeMonthlyGrantUsd: 30.00
  };

  await apiKeyRepo.saveGatewayKey(newGatewayKey);
  console.log(`[✓] API Key successfully saved and registered in BroccoliDB & PostgreSQL`);

  // STEP 5: Validate Key via ApiKeyRepository
  console.log('\n--- STEP 5: Validating Key Resolution via ApiKeyRepository ---');
  const validationResult = await apiKeyRepo.validateGatewayKey(apiKey);
  if (!validationResult.valid || !validationResult.key) {
    throw new Error(`Failed to validate gateway key: ${validationResult.error}`);
  }
  console.log(`[✓] Key Resolution Successful:`);
  console.log(`    Resolved Key ID    : ${validationResult.key.id}`);
  console.log(`    Resolved User ID   : ${validationResult.key.userId}`);
  console.log(`    Rate Limit RPM     : ${validationResult.key.rateLimitPerMinute}`);

  // STEP 6: Validate HTTP Request Authentication via GalxAuthEngine
  console.log('\n--- STEP 6: Testing HTTP Request Identity Resolution ---');
  const authHeaders = new Headers({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  });

  const resolvedIdentity = await authEngine.resolveAuthIdentity({ headers: authHeaders });
  if (!resolvedIdentity.authenticated || resolvedIdentity.userId !== seededUserId) {
    throw new Error(`AuthEngine failed to resolve authenticated identity for seeded user: ${JSON.stringify(resolvedIdentity)}`);
  }
  console.log(`[✓] GalxAuthEngine Identity Resolution:`);
  console.log(`    Authenticated      : ${resolvedIdentity.authenticated}`);
  console.log(`    User ID            : ${resolvedIdentity.userId}`);
  console.log(`    Auth Type          : ${resolvedIdentity.authType}`);
  console.log(`    Priority Tier      : ${resolvedIdentity.isPriorityUser}`);

  // Test custom x-api-key header variant
  const xApiKeyHeaders = new Headers({
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  });
  const resolvedFromXApiKey = await authEngine.resolveAuthIdentity({ headers: xApiKeyHeaders });
  if (!resolvedFromXApiKey.authenticated || resolvedFromXApiKey.userId !== seededUserId) {
    throw new Error(`AuthEngine failed with x-api-key header: ${JSON.stringify(resolvedFromXApiKey)}`);
  }
  console.log(`[✓] Resolved cleanly via x-api-key header convention`);

  // STEP 7: Test End-to-End API Route Execution (/v1/models)
  console.log('\n--- STEP 7: Invoking End-to-End API Route (GET /v1/models) ---');
  const req = new NextRequest('https://galx.ai/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'x-forwarded-for': '127.0.0.1'
    }
  });

  const routeResponse = await getModels(req);
  if (routeResponse.status !== 200) {
    const errorBody = await routeResponse.text();
    throw new Error(`GET /v1/models returned HTTP ${routeResponse.status}: ${errorBody}`);
  }

  const payload = await routeResponse.json();
  console.log(`[✓] HTTP 200 OK Returned from /v1/models`);
  console.log(`    Object Type        : ${payload.object}`);
  console.log(`    Models Available   : ${payload.data?.length} models returned`);
  console.log(`    Sample Model ID    : ${payload.data?.[0]?.id}`);

  // STEP 8: Test Compute Wallet Inference Hold Pre-Auth and Settlement
  console.log('\n--- STEP 8: Testing Wallet Inference Credit Hold & Settlement ---');
  const holdAmount = 0.0050; // $0.005 hold for streaming completion
  const reserveResult = await walletRepo.reserveHold({
    userId: seededUserId,
    estimatedCostUsd: holdAmount,
    holdTtlMs: 60000,
    metadata: { keyId, model: payload.data?.[0]?.id || 'gpt-5.6-sol' }
  });

  if (!reserveResult.success || !reserveResult.holdId) {
    throw new Error(`Failed to reserve inference hold: ${reserveResult.reason}`);
  }

  console.log(`[✓] Inference Hold Reserved:`);
  console.log(`    Hold ID            : ${reserveResult.holdId}`);
  console.log(`    Held Amount        : $${reserveResult.reservedUsd?.toFixed(4)} USD`);
  console.log(`    Available Balance  : $${reserveResult.newBalance?.toFixed(4)} USD`);

  // Commit actual usage ($0.0035 committed, $0.0015 refunded remainder)
  const actualCost = 0.0035;
  const commitResult = await walletRepo.commitHold({
    holdId: reserveResult.holdId,
    actualCostUsd: actualCost,
    promptTokens: 320,
    completionTokens: 1100,
    metadata: { tokensUsed: 1420 }
  });

  if (!commitResult.success) {
    throw new Error(`Failed to commit inference hold: ${commitResult.reason}`);
  }

  console.log(`[✓] Inference Hold Committed & Remainder Released:`);
  console.log(`    Committed Cost     : $${commitResult.actualCostUsd?.toFixed(4)} USD`);
  console.log(`    Released Remainder : $${commitResult.refundedDeltaUsd?.toFixed(4)} USD`);
  console.log(`    Final Wallet Balance: $${commitResult.newBalance?.toFixed(4)} USD`);

  // STEP 9: Test Key Revocation & Invalidation Defense
  console.log('\n--- STEP 9: Testing Immediate Key Revocation & Cache Invalidation ---');
  await apiKeyRepo.revokeKey(keyId, seededUserId);
  console.log(`[✓] Key ${keyId} revoked`);

  const revokedValidation = await apiKeyRepo.validateGatewayKey(apiKey);
  if (revokedValidation.valid) {
    throw new Error('Security Failure: Revoked key was still validated as active!');
  }
  console.log(`[✓] Revocation Enforced: ${revokedValidation.error}`);

  const revokedIdentity = await authEngine.resolveAuthIdentity({ headers: authHeaders });
  if (revokedIdentity.authenticated) {
    throw new Error('Security Failure: Revoked key was authenticated by GalxAuthEngine!');
  }
  console.log(`[✓] GalxAuthEngine blocked revoked key with status: authenticated=false`);

  console.log('\n======================================================================');
  console.log('   ALL API KEY & SEEDED ACCOUNT TESTS PASSED WITH 100% INTEGRITY!   ');
  console.log('======================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Test Execution Failed:', err);
  process.exit(1);
});
