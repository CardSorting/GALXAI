/**
 * GALXAI: Supabase PostgreSQL Database Seed Utility
 * Bootstraps default workspaces, task queues, sample developer keys, and compute wallets.
 *
 * Run with: npx tsx scripts/seed-supabase.ts
 */

import {
  WorkspaceRepository,
  QueueRepository,
  ApiKeyRepository,
  ShardRepository,
  WalletRepository,
  EmbeddingsRepository
} from '../src/lib/supabase';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';

async function main() {
  console.log('======================================================================');
  console.log('   GALXAI: BOOTSTRAPPING SUPABASE POSTGRESQL DATABASE');
  console.log('======================================================================\n');

  const workspaceRepo = WorkspaceRepository.getInstance();
  const queueRepo = QueueRepository.getInstance();
  const apiKeyRepo = ApiKeyRepository.getInstance();
  const shardRepo = ShardRepository.getInstance();
  const walletRepo = WalletRepository.getInstance();
  const embeddingsRepo = EmbeddingsRepository.getInstance();

  const primaryUserId = 'usr_galx_developer_master';

  // 1. Seed Default Workspace
  console.log('1. Provisioning Primary Developer Workspace...');
  try {
    const ws = await workspaceRepo.createWorkspace({
      slug: 'default-workspace',
      name: 'GALXAI Production Workspace',
      tier: 'enterprise',
      ownerUserId: primaryUserId,
      monthlySpendCapUsd: 5000.0,
      metadata: { environment: 'production', multiTenant: true }
    });
    console.log(`   [✓] Created Workspace: ${ws.name} (${ws.id})`);
  } catch (err: any) {
    console.log(`   [i] Workspace note: ${err.message}`);
  }

  // 2. Seed Default CloudTasks-Style Queues
  console.log('2. Provisioning CloudTasks Asynchronous Queues...');
  const defaultQueues = [
    {
      id: 'default',
      name: 'Default General Tasks Queue',
      description: 'General high-concurrency background AI workloads',
      state: 'RUNNING' as const,
      rateLimits: {
        maxDispatchesPerSecond: 100,
        maxConcurrentDispatches: 50,
        maxBurstSize: 200
      },
      retryConfig: {
        maxAttempts: 5,
        minBackoffMs: 1000,
        maxBackoffMs: 60000,
        maxDoublings: 5,
        jitterFactor: 0.2
      },
      contentBasedDeduplication: true,
      defaultTenantMaxConcurrency: 25,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    },
    {
      id: 'reasoning-heavy',
      name: 'Deep Reasoning & Long-Running Swarms',
      description: 'Extended SLA queue for GPT-5.6 Sol and deep reasoning passes',
      state: 'RUNNING' as const,
      rateLimits: {
        maxDispatchesPerSecond: 20,
        maxConcurrentDispatches: 15,
        maxBurstSize: 30
      },
      retryConfig: {
        maxAttempts: 3,
        minBackoffMs: 5000,
        maxBackoffMs: 120000,
        maxDoublings: 3,
        jitterFactor: 0.3
      },
      contentBasedDeduplication: true,
      defaultTenantMaxConcurrency: 5,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    },
    {
      id: 'images-async',
      name: 'Visual Synthesis & Diffusion Queue',
      description: 'Asynchronous image generation (OpenAI GPT-Image suite)',
      state: 'RUNNING' as const,
      rateLimits: {
        maxDispatchesPerSecond: 30,
        maxConcurrentDispatches: 20,
        maxBurstSize: 50
      },
      retryConfig: {
        maxAttempts: 4,
        minBackoffMs: 2000,
        maxBackoffMs: 60000,
        maxDoublings: 4,
        jitterFactor: 0.2
      },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    }
  ];

  for (const q of defaultQueues) {
    try {
      await queueRepo.saveQueue(q);
      console.log(`   [✓] Queue Configured: ${q.name} (id: ${q.id})`);
    } catch (err: any) {
      console.log(`   [i] Queue ${q.id} note: ${err.message}`);
    }
  }

  // 3. Seed Developer Compute Wallet
  console.log('3. Provisioning Compute Wallet & 50% Match...');
  try {
    const wallet = await walletRepo.createOrGetWallet(primaryUserId);
    console.log(`   [✓] Wallet Initialized for ${primaryUserId}: $${wallet.balanceUsd.toFixed(2)} USD`);

    // Verify initial $10 deposit + $5 match
    if (!wallet.proofOfDepositVerified) {
      const dep = await walletRepo.verifyDepositAndApplyMatch({
        userId: primaryUserId,
        depositAmountUsd: 10.0,
        paymentRef: 'seed_init_pay_123'
      });
      console.log(`   [✓] Deposit Verified: +$${dep.depositAmount} Deposit + $${dep.matchGrant} Match = $${dep.newBalance} Balance`);
    }
  } catch (err: any) {
    console.log(`   [i] Wallet note: ${err.message}`);
  }

  // 4. Seed Developer API Key
  console.log('4. Generating Developer Gateway API Key...');
  try {
    const rawKey = 'galx_live_master_developer_key_001';
    const keyHash = GalxCryptoVault.hashApiKey(rawKey);
    await apiKeyRepo.saveGatewayKey({
      id: 'key_master_001',
      name: 'Primary Developer Cursor/CLI Key',
      userId: primaryUserId,
      prefix: 'galx_live_mast',
      keyHash,
      rateLimitPerMinute: 1200,
      totalRequests: 0,
      totalTokens: 0,
      revoked: false,
      createdAtMs: Date.now()
    });
    console.log(`   [✓] Developer Key Provisioned: galx_live_mast... (Hash: ${keyHash.substring(0, 12)}...)`);
  } catch (err: any) {
    console.log(`   [i] API key note: ${err.message}`);
  }

  // 5. Seed Encrypted Provider Shards
  console.log('5. Provisioning AES-256-GCM Encrypted Provider Shards...');
  try {
    const encOpenAI = GalxCryptoVault.encryptSecret(
      { apiKey: 'sk-proj-demo-openai-shard-001' },
      primaryUserId,
      'shard_openai_master',
      'openai'
    );
    await shardRepo.saveShard({
      id: 'shard_openai_master',
      userId: primaryUserId,
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'OpenAI Fleet Shard (Tier 5 Wholesale)',
      apiKeyMasked: 'sk-proj-...001',
      encryptedPayload: encOpenAI,
      encryptedSecrets: encOpenAI,
      shardMode: 'pooled',
      priority: 90,
      weight: 8,
      status: 'healthy',
      tokenBucket: {
        maxTokens: 50000000,
        remainingTokens: 50000000,
        reservedTokens: 0,
        refillRatePerMinute: 50000000,
        maxRequests: 10000,
        remainingRequests: 10000,
        lastRefillTimestampMs: Date.now()
      },
      stats: {
        totalRequestsServed: 0,
        totalTokensConsumed: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        averageLatencyMs: 180
      },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    const encOpenAI2 = GalxCryptoVault.encryptSecret(
      { apiKey: 'sk-proj-demo-openai-shard-002' },
      primaryUserId,
      'shard_openai_master_2',
      'openai'
    );
    await shardRepo.saveShard({
      id: 'shard_openai_master_2',
      userId: primaryUserId,
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'OpenAI Fleet Secondary Shard (Ultra Concurrency)',
      apiKeyMasked: 'sk-...002',
      encryptedPayload: encOpenAI2,
      encryptedSecrets: encOpenAI2,
      shardMode: 'pooled',
      priority: 85,
      weight: 7,
      status: 'healthy',
      tokenBucket: {
        maxTokens: 50000000,
        remainingTokens: 50000000,
        reservedTokens: 0,
        refillRatePerMinute: 50000000,
        maxRequests: 10000,
        remainingRequests: 10000,
        lastRefillTimestampMs: Date.now()
      },
      stats: {
        totalRequestsServed: 0,
        totalTokensConsumed: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        averageLatencyMs: 220
      },
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });
    console.log('   [✓] 2 High-Capacity Provider Shards Provisioned & Vaulted');
  } catch (err: any) {
    console.log(`   [i] Shards note: ${err.message}`);
  }

  console.log('\n======================================================================');
  console.log('   SUPABASE POSTGRESQL BOOTSTRAP COMPLETED SUCCESSFULLY');
  console.log('======================================================================');
}

main().catch(err => {
  console.error('Fatal bootstrapping error:', err);
  process.exit(1);
});
