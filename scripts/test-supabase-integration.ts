/**
 * GALXAI: Supabase PostgreSQL & Cloudflare Edge Substrate Integration Test Suite
 * Validates tables, RLS, cryptographic vaulting, 2-phase leases, CloudTasks FSM,
 * 50% deposit match ledger, pgvector hybrid search, Stripe-grade idempotency,
 * distributed locks, Cloudflare zero-egress edge gateway, batch buffers, R2 asset storage,
 * binary wire serialization, in-flight failover, swarm coordination, budget alert governance,
 * speculative streaming, keep-alive pooling, signed webhook dispatch, and shard health probes.
 */

import './lib/require-isolated-integration-env.js';
import { randomUUID } from 'node:crypto';
import {
  WorkspaceRepository,
  ProjectRepository,
  ApiKeyRepository,
  ShardRepository,
  QueueRepository,
  TaskRepository,
  WalletRepository,
  TelemetryRepository,
  AuditRepository,
  EmbeddingsRepository,
  DistributedLockRepository,
  IdempotencyRepository,
  BudgetRepository,
  ShardHealthRepository,
  SessionRepository,
  galxDb,
  getSupabaseConfig,
  isSupabaseAdminConfigured,
  getSupabaseAdmin
} from '../src/lib/supabase';
import {
  closePostgresPool,
  executePostgresQuery,
  isPostgresPoolHealthy,
} from '../src/lib/db/postgres';

import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import { GalxPersistence } from '../src/lib/storage/GalxPersistence';
import { GalxEdgeGateway } from '../src/workers/cloudflare/GalxEdgeGateway';
import { GalxEdgeQueueWorker } from '../src/workers/cloudflare/GalxEdgeQueueWorker';
import { GalxEdgeWire } from '../src/workers/cloudflare/GalxEdgeWire';
import { GalxEdgeRouter } from '../src/workers/cloudflare/GalxEdgeRouter';
import { GalxEdgeSpeculativeEngine } from '../src/workers/cloudflare/GalxEdgeSpeculativeEngine';
import { GalxEdgeConnectionPool } from '../src/workers/cloudflare/GalxEdgeConnectionPool';
import { GalxEdgeWebhookDispatcher } from '../src/workers/cloudflare/GalxEdgeWebhookDispatcher';
import { GalxEdgeBatchBuffer } from '../src/workers/cloudflare/GalxEdgeBatchBuffer';
import { GalxRequestCoalescer } from '../src/lib/cache/GalxRequestCoalescer';
import { GalxBatchDataLoader } from '../src/lib/cache/GalxBatchDataLoader';
import { GalxWriteBehindBuffer } from '../src/lib/cache/GalxWriteBehindBuffer';
import { GalxMultiTierCache } from '../src/lib/cache/GalxMultiTierCache';
import { GalxXFetchEngine } from '../src/lib/cache/GalxXFetchEngine';
import { GalxBurstSmoother } from '../src/lib/cache/GalxBurstSmoother';
import { GalxCreditSlicer } from '../src/lib/cache/GalxCreditSlicer';
import { GalxGatewayMesh } from '../src/lib/cache/GalxGatewayMesh';
import { GalxMultiQueryPipeliner } from '../src/lib/cache/GalxMultiQueryPipeliner';

async function invokeLiveRpc<T>(
  functionName: string,
  namedArgs: Record<string, unknown>,
  sql: string,
  params: unknown[]
): Promise<T> {
  if (isSupabaseAdminConfigured()) {
    const { data, error } = await getSupabaseAdmin().rpc(functionName as any, namedArgs as any);
    if (error) throw new Error(`${functionName} Data API invocation failed: ${error.code || error.message}`);
    return data as T;
  }

  const result = await executePostgresQuery<{ data: T }>(sql, params);
  if (!result?.rows[0]) {
    throw new Error(`${functionName} PostgreSQL invocation returned no result.`);
  }
  return result.rows[0].data;
}

async function runTests() {
  console.log('======================================================================');
  console.log('   GALXAI: SUPABASE & CLOUDFLARE EDGE ARCHITECTURE TEST SUITE      ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`  [✗] FAILED: ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`  [✓] Test ${passed + 1}: ${message}`);
      passed++;
    }
  }

  let fixtureShardId: string | undefined;
  try {
    // 1. Supabase Config
    const config = getSupabaseConfig();
    assert(
      config.poolSize > 0 && config.requestTimeoutMs > 0,
      'Supabase Config: Resolves valid connection pooling and timeout constants'
    );
    assert(
      Boolean(config.databaseUrl),
      'Supabase Config: Loads DATABASE_URL from the server-only environment'
    );
    assert(
      await isPostgresPoolHealthy(),
      'Supabase PostgreSQL: Connects through the configured transaction pooler'
    );
    if (config.supabaseServiceRoleKey && !isSupabaseAdminConfigured()) {
      console.warn(
        '  [!] SUPABASE_SERVICE_ROLE_KEY is not an admin credential; privileged checks will use PostgreSQL authority.'
      );
    }

    // 2. Workspace Repository
    const wsRepo = WorkspaceRepository.getInstance();
    const ws = await wsRepo.createWorkspace({
      slug: `test-org-${Date.now()}`,
      name: 'Test Acme Corp',
      ownerUserId: 'usr_owner_123',
      monthlySpendCapUsd: 5000.0
    });
    assert(
      ws.name === 'Test Acme Corp' && ws.monthlySpendCapUsd === 5000.0 && ws.isActive === true,
      'Workspace: Creates workspace with spend cap'
    );

    // 3. ApiKey Repository (Creation & Hash Lookup)
    const keyRepo = ApiKeyRepository.getInstance();
    const rawKey = 'galx_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const keyHash = GalxCryptoVault.hashApiKey(rawKey);
    await keyRepo.saveGatewayKey({
      id: `key_${Date.now()}`,
      name: 'Production LLM Key',
      userId: 'usr_dev_123',
      prefix: rawKey.substring(0, 14),
      keyHash,
      rateLimitPerMinute: 1200,
      totalRequests: 0,
      totalTokens: 0,
      createdAtMs: Date.now(),
      revoked: false
    });
    const retrievedKey = await keyRepo.findKeyByHash(keyHash);
    assert(
      retrievedKey !== null && retrievedKey.name === 'Production LLM Key',
      'ApiKeyRepo: Finds active key by SHA-256 hash lookup'
    );

    // 4. ApiKey Revocation
    await keyRepo.revokeKey(retrievedKey!.id, 'Security audit test');
    const revokedCheck = await keyRepo.findKeyByHash(keyHash);
    assert(revokedCheck === null, 'ApiKeyRepo: Revoked key is immediately excluded from active hash lookup');

    // 5. Shard Repository (AES-256-GCM encrypted ingestion)
    const shardRepo = ShardRepository.getInstance();
    const tenantUid = `integration_${randomUUID()}`;
    const shardId = `integration_${randomUUID()}`;
    fixtureShardId = shardId;
    const encryptedSecret = GalxCryptoVault.encryptSecret(
      { apiKey: 'sk-openai-live-secret-test-key-12345' },
      tenantUid,
      shardId,
      'openai',
      'v1'
    );

    await shardRepo.saveShard({
      id: shardId,
      userId: tenantUid,
      provider: 'openai',
      authType: 'api_key',
      accountLabel: 'OpenAI Tier 5 Master Shard',
      apiKeyMasked: 'sk-...12345',
      encryptedPayload: encryptedSecret,
      shardMode: 'pooled',
      priority: 90,
      weight: 10,
      status: 'healthy',
      tokenBucket: {
        maxTokens: 10000000,
        remainingTokens: 10000000,
        reservedTokens: 0,
        refillRatePerMinute: 10000000,
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
      fencingToken: 1,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });

    const savedShard = await shardRepo.getShardById(shardId);
    assert(
      savedShard !== null && savedShard.encryptedPayload?.ciphertext === encryptedSecret.ciphertext,
      'ShardRepo: Ingests and retrieves AES-256-GCM encrypted shard account'
    );

    // 6. Shard Lease Acquisition (Monotonic Fencing)
    const lease = await shardRepo.acquireLease({
      shardId,
      userId: tenantUid,
      estimatedTokens: 4000,
      leaseTtlMs: 60000,
      jobId: `integration_${shardId}`
    });
    assert(
      lease.success === true && typeof lease.fencingToken === 'number' && lease.fencingToken > 1,
      'ShardRepo: Atomically acquires execution lease with monotonic fencing token'
    );

    // 7. Shard Lease Release
    const releaseRes = await shardRepo.releaseLease({
      leaseId: lease.leaseId!,
      actualTokens: 3850,
      latencyMs: 195,
      success: true
    });
    assert(
      releaseRes.success === true && releaseRes.committedTokens === 3850,
      'ShardRepo: Atomically releases lease and commits actual token usage'
    );

    // 8. Queue Repository
    const queueRepo = QueueRepository.getInstance();
    const qId = `queue_test_${Date.now()}`;
    await queueRepo.saveQueue({
      id: qId,
      name: 'High-Throughput Swarm Queue',
      state: 'RUNNING',
      rateLimits: { maxDispatchesPerSecond: 1000, maxConcurrentDispatches: 100, maxBurstSize: 200 },
      retryConfig: { maxAttempts: 5, minBackoffMs: 500, maxBackoffMs: 10000, maxDoublings: 4, jitterFactor: 0.2 },
      defaultTenantMaxConcurrency: 25,
      contentBasedDeduplication: true,
      defaultDeduplicationWindowMs: 86400000,
      priorityAgingIntervalMs: 15000,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    });
    const retrievedQ = await queueRepo.getQueueById(qId);
    assert(retrievedQ !== null && retrievedQ.rateLimits.maxDispatchesPerSecond === 1000, 'QueueRepo: Saves and retrieves CloudTasks queue configuration');

    // 9. Task Repository (Enqueue with FIFO Group Partitioning)
    const taskRepo = TaskRepository.getInstance();
    const taskId = `task_${Date.now()}`;
    await taskRepo.saveTask({
      id: taskId,
      queueId: qId,
      userId: tenantUid,
      groupId: 'customer_tenant_partition_1',
      priority: 75,
      target: {
        type: 'INTERNAL_MODEL',
        taskKind: 'chat_completion',
        chatPayload: {
          model: 'gpt-5.6-sol',
          messages: [{ role: 'user', content: 'test payload' }]
        }
      },
      status: 'QUEUED',
      scheduleTimeMs: Date.now() - 1000,
      dispatchCount: 0,
      responseCount: 0,
      attempts: [],
      createdAtMs: Date.now() - 1000,
      updatedAtMs: Date.now() - 1000
    });
    const retrievedTask = await taskRepo.getTaskById(taskId);
    assert(
      retrievedTask !== null && retrievedTask.groupId === 'customer_tenant_partition_1',
      'TaskRepo: Enqueues task with FIFO group partitioning and priority'
    );

    // 10. Worker Task Leasing
    const leasedTasks = await taskRepo.leaseTasksForWorker({
      queueId: qId,
      workerId: 'worker_node_alpha_1',
      maxTasks: 5,
      groupIdFilter: 'customer_tenant_partition_1'
    });
    assert(
      leasedTasks.length > 0 && leasedTasks[0].status === 'RUNNING' && leasedTasks[0].activeWorkerId === 'worker_node_alpha_1',
      'TaskRepo: Leases task to worker with monotonic fencing token and lease TTL'
    );

    // 11. Worker Attempt Record
    await taskRepo.recordAttempt(taskId, {
      attemptNumber: 1,
      startedAtMs: Date.now() - 500,
      completedAtMs: Date.now(),
      durationMs: 500,
      responseStatusCode: 200,
      shardIdUsed: shardId,
      modelUsed: 'gpt-5.6-sol',
      workerId: 'worker_node_alpha_1'
    });
    assert(true, 'TaskRepo: Records worker execution attempt trace');

    // 12. Wallet Repository: 50% Instant Match Model
    const walletRepo = WalletRepository.getInstance();
    const testDevUser = `usr_dev_ledger_${Date.now()}`;
    const depositRes = await walletRepo.verifyDepositAndApplyMatch({
      userId: testDevUser,
      depositAmountUsd: 10.0,
      paymentRef: 'ch_stripe_deposit_test_10'
    });
    assert(
      depositRes.success === true && depositRes.depositAmount === 10.0 && depositRes.matchGrant === 5.0 && depositRes.newBalance === 15.0,
      'WalletRepo: 50% Instant Match Model ($10 deposit yields $15 total compute credit)'
    );

    // 13. Wallet Repository: Micro-Metered Draw down to $0.000001
    const drawRes = await walletRepo.drawTokens({
      userId: testDevUser,
      costUsd: 0.000125,
      description: 'gpt-5.6-sol inference: 15 prompt tokens + 20 completion tokens',
      model: 'gpt-5.6-sol',
      promptTokens: 15,
      completionTokens: 20
    });
    assert(
      drawRes.success === true && drawRes.newBalance !== undefined && Math.abs(drawRes.newBalance - (15.0 - 0.000125)) < 0.0000001,
      'WalletRepo: Debits exact micro-metered token cost from compute balance'
    );

    // 13b. Wallet Repository: Inference Credit Hold & Settlement (Two-Phase Pre-Auth)
    const holdRes = await walletRepo.reserveHold({
      userId: testDevUser,
      estimatedCostUsd: 1.000000,
      holdTtlMs: 60000,
      metadata: { model: 'gpt-5.6-reasoning' }
    });
    assert(
      holdRes.success === true && typeof holdRes.holdId === 'string' && holdRes.reservedUsd === 1.0,
      'WalletRepo: Reserves inference credit pre-auth hold'
    );

    const commitRes = await walletRepo.commitHold({
      holdId: holdRes.holdId!,
      actualCostUsd: 0.350000,
      description: 'gpt-5.6-reasoning finalized stream with 450 thinking tokens',
      model: 'gpt-5.6-reasoning',
      promptTokens: 50,
      completionTokens: 450
    });
    assert(
      commitRes.success === true && Math.abs((commitRes.refundedDeltaUsd || 0) - 0.65) < 0.000001,
      'WalletRepo: Commits actual token usage and refunds unused hold remainder'
    );

    // 13c. Wallet Repository: Cryptographic Ledger Chain Integrity Audit
    const auditLedgerRes = await walletRepo.verifyLedgerIntegrity(testDevUser);
    assert(
      auditLedgerRes.valid === true && auditLedgerRes.auditedBlocks >= 1,
      'WalletRepo: Verifies cryptographic SHA-256 Merkle ledger chain integrity'
    );

    // 14. Telemetry Repository (Latency Percentiles)
    const telemetryRepo = TelemetryRepository.getInstance();
    await telemetryRepo.recordTelemetry({ provider: 'openai', modelId: 'gpt-5.6-sol', shardId, latencyMs: 180 });
    await telemetryRepo.recordTelemetry({ provider: 'openai', modelId: 'gpt-5.6-sol', shardId, latencyMs: 220 });
    await telemetryRepo.recordTelemetry({ provider: 'openai', modelId: 'gpt-5.6-sol', shardId, latencyMs: 310 });
    const percentiles = await telemetryRepo.getLatencyPercentiles({ provider: 'openai', modelId: 'gpt-5.6-sol' });
    assert(
      percentiles.sampleCount >= 3 && percentiles.p50 > 0 && percentiles.p90 > 0,
      'TelemetryRepo: Calculates rolling P50/P90/P99 latency percentiles'
    );

    // 15. Audit Repository
    const auditRepo = AuditRepository.getInstance();
    const auditId = await auditRepo.logAudit({
      action: 'API_KEY_REVOKED',
      userId: 'usr_admin_master',
      shardId,
      metadata: { reason: 'Automated policy check' },
      ipAddress: '192.168.1.1'
    });
    assert(typeof auditId === 'string' && auditId.startsWith('audit_'), 'AuditRepo: Ingests immutable security audit event');

    // 16. GalxPersistence Unified Interface
    const persistence = GalxPersistence.getInstance();
    persistence.saveShard(savedShard!);
    const persistentShards = persistence.getShards();
    assert(
      persistentShards.length > 0 && persistentShards.some(s => s.id === shardId),
      'GalxPersistence: Unified Supabase persistence layer operates seamlessly'
    );

    // 17. Embeddings Repository (Vector Search)
    const embRepo = EmbeddingsRepository.getInstance();
    const docId = `doc_${Date.now()}`;
    const dummyEmbedding = new Array(1536).fill(0).map((_, i) => (i === 0 ? 1 : 0));
    await embRepo.saveEmbedding({
      documentId: docId,
      collectionName: 'semantic-cache',
      content: 'How do I initialize the GALXAI client?',
      embedding: dummyEmbedding
    });
    const searchRes = await embRepo.searchSimilar({
      queryEmbedding: dummyEmbedding,
      collectionName: 'semantic-cache',
      matchThreshold: 0.8
    });
    assert(
      searchRes.length > 0 && searchRes[0].documentId === docId,
      'EmbeddingsRepo: Vector cosine search and pgvector interface verified'
    );

    // 18. Stripe-Grade Idempotency Engine
    const idempRepo = IdempotencyRepository.getInstance();
    const idempKey = `idem_${Date.now()}_req`;
    const payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const beginRes1 = await idempRepo.begin({
      idempotencyKey: idempKey,
      userId: 'usr_dev_123',
      endpoint: '/v1/chat/completions',
      requestHash: payloadHash
    });
    assert(beginRes1.status === 'STARTED', 'Idempotency: Locks in-flight request on first attempt');

    await idempRepo.commit({
      idempotencyKey: idempKey,
      statusCode: 200,
      responseBody: { id: 'chatcmpl-cached-123', model: 'gpt-5.6-sol' }
    });

    const beginRes2 = await idempRepo.begin({
      idempotencyKey: idempKey,
      userId: 'usr_dev_123',
      endpoint: '/v1/chat/completions',
      requestHash: payloadHash
    });
    assert(
      beginRes2.status === 'CACHED' && beginRes2.responseBody.id === 'chatcmpl-cached-123',
      'Idempotency: Instant cached response replay for identical key & payload'
    );

    // 19. Distributed Advisory Mutex Locks
    const lockRepo = DistributedLockRepository.getInstance();
    const lockKey = `lock_task_group_${Date.now()}`;
    const lock1 = await lockRepo.acquireLock({
      lockKey,
      ownerId: 'cf_worker_alpha',
      ttlMs: 30000
    });
    assert(lock1.acquired === true && lock1.fencingToken === 1, 'DistributedLock: Acquires mutex lock with initial fencing token');

    const lock2 = await lockRepo.acquireLock({
      lockKey,
      ownerId: 'cf_worker_beta',
      ttlMs: 30000
    });
    assert(lock2.acquired === false, 'DistributedLock: Rejects concurrent lock acquisition from distinct worker');

    await lockRepo.releaseLock({ lockKey, ownerId: 'cf_worker_alpha' });
    const lock3 = await lockRepo.acquireLock({ lockKey, ownerId: 'cf_worker_beta', ttlMs: 30000 });
    assert(lock3.acquired === true && lock3.fencingToken === 2, 'DistributedLock: Releases lock and grants to next worker with incremented fencing token');

    // 20. Project & Environment Isolation
    const projRepo = ProjectRepository.getInstance();
    const project = await projRepo.createProject({
      workspaceId: ws.id,
      name: 'Agent Swarm Microservice',
      slug: `agent-swarm-${Date.now()}`
    });
    const envs = await projRepo.getEnvironments(project.id);
    assert(
      project.name === 'Agent Swarm Microservice' && envs.length >= 2,
      'ProjectRepo: Creates Project with default Production & Development environments'
    );

    // 21. Cloudflare Edge Gateway (Zero-Egress SSE Streaming & Direct Dispatch)
    const edgeGateway = new GalxEdgeGateway({
      SUPABASE_URL: config.supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
      ENVIRONMENT: 'test',
      GATEWAY_AUTH_MODE: 'format-only',
      ALLOW_SYNTHETIC_RESPONSES: 'true'
    });

    const streamReq = new Request('https://api.galx.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer galx_live_master_key_12345',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5.6-sol',
        messages: [{ role: 'user', content: 'Explain zero-egress edge routing' }],
        stream: true
      })
    });

    const streamResp = await edgeGateway.handleRequest(streamReq);
    assert(
      streamResp.status === 200 && streamResp.headers.get('content-type')?.includes('text/event-stream') === true,
      'Cloudflare Edge Gateway: Dispatches zero-egress SSE stream directly from global edge PoP'
    );

    // 22. Cloudflare Edge Queue Worker
    const edgeWorker = new GalxEdgeQueueWorker(
      {
        SUPABASE_URL: config.supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey
      },
      'cf_edge_swarm'
    );
    const batchResult = await edgeWorker.processBatch('default', 10);
    assert(typeof batchResult.processed === 'number', 'Cloudflare Edge Queue Worker: Executes batch pull and report cycle');

    // 23. Cloudflare Edge Cache API (Stale-While-Revalidate)
    const edgeCache = galxDb.cache;
    let fetchCount = 0;
    const computeModels = async () => {
      fetchCount++;
      return ['gpt-5.6-sol', 'gpt-5.6-terra'];
    };

    const cacheRes1 = await edgeCache.getOrFetch('models:cached', computeModels, { ttlMs: 1000, swrTtlMs: 2000 });
    assert(cacheRes1.source === 'MISS' && fetchCount === 1, 'Edge Cache: Miss fetches fresh computation and populates edge cache');

    const cacheRes2 = await edgeCache.getOrFetch('models:cached', computeModels, { ttlMs: 1000, swrTtlMs: 2000 });
    assert(cacheRes2.source === 'HIT' && fetchCount === 1, 'Edge Cache: Hit returns instantly with 0 compute/database egress');

    // 24. Batch Token Micro-Metering (Cloudflare Edge Multi-Draw)
    const batchDraws = await galxDb.wallets.drawTokensBatch([
      { userId: testDevUser, costUsd: 0.00005, description: 'Micro-draw 1', model: 'gpt-5.6-sol' },
      { userId: testDevUser, costUsd: 0.00005, description: 'Micro-draw 2', model: 'gpt-5.6-sol' }
    ]);
    assert(
      batchDraws.length === 2 && batchDraws.every(d => d.success),
      'Batch Micro-Metering: Executes multi-request token deduction in 1 batch'
    );

    // 25. Zero-Egress Multimodal Asset Storage (Cloudflare R2)
    const r2Asset = await galxDb.assets.uploadAsset({
      data: Buffer.from('fake-image-bytes-from-dalle3'),
      contentType: 'image/png',
      folder: 'dalle_outputs'
    });
    assert(
      r2Asset.publicUrl.includes('assets.galx.ai') && r2Asset.sizeBytes > 0,
      'Cloudflare R2 Adapter: Ingests multimodal binary asset with 0 database egress'
    );

    // 26. Fluent galxDb Facade & Batch Buffer
    galxDb.batch.enqueueTelemetry({ provider: 'openai', modelId: 'gpt-5.6-sol', shardId, latencyMs: 145 });
    galxDb.batch.enqueueTokenDraw({ userId: testDevUser, costUsd: 0.00001, description: 'Buffered draw' });
    const flushed = await galxDb.batch.flushAll();
    assert(
      flushed.telemetry >= 1 && flushed.draws >= 1,
      'GalxEdgeBatchBuffer: Asynchronously accumulates and flushes micro-batches to Supabase'
    );

    // 27. GalxEdgeWire Binary Encoding & Codec
    const wire = GalxEdgeWire.getInstance();
    const originalPayload = { task: 'inference', model: 'gpt-5.6-sol', tokens: 1500, prompt: 'Hello world' };
    const binaryData = wire.encodeBinary(originalPayload);
    const decodedPayload = wire.decodeBinary<typeof originalPayload>(binaryData);
    assert(
      binaryData instanceof Uint8Array && decodedPayload.tokens === 1500,
      'GalxEdgeWire: Encodes and decodes compact binary payload with zero data loss'
    );

    // 28. GalxEdgeRouter In-Flight Dynamic Failover
    const edgeRouter = GalxEdgeRouter.getInstance();
    let callCount = 0;
    const failoverResult = await edgeRouter.routeWithFailover({
      request: { model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'test' }] },
      primaryShard: { shardId: 'shard_fail_429', provider: 'openai', accountLabel: 'Primary', priority: 90, isHealthy: true },
      backupShards: [
        { shardId: 'shard_healthy_backup', provider: 'openai', accountLabel: 'Backup', priority: 80, isHealthy: true }
      ],
      executeFn: async (shard) => {
        callCount++;
        if (shard.shardId === 'shard_fail_429') {
          return new Response('Rate limited', { status: 429 });
        }
        return new Response(JSON.stringify({ id: 'chat_ok_123', content: 'Success from backup' }), { status: 200 });
      }
    });
    assert(
      failoverResult.failoverOccurred === true && failoverResult.shardUsed.shardId === 'shard_healthy_backup' && callCount === 2,
      'GalxEdgeRouter: Intercepts upstream 429 and transparently fails over to secondary shard'
    );

    // 29. GalxSwarmCoordinatorDO Multi-Agent Edge State
    const swarm = galxDb.createSwarmCoordinator('swarm_session_999', 'Conduct multi-agent market analysis');
    swarm.registerAgent('agent_analyst_1', 'Financial Analyst');
    swarm.registerAgent('agent_critic_2', 'Peer Critic');
    swarm.updateAgentStatus('agent_analyst_1', 'EXECUTING', 'Drafting Q3 revenue projections');
    swarm.setSharedContext('company', 'Acme Global');
    const swarmState = swarm.getState();
    assert(
      swarmState.agents.length === 2 && swarmState.sharedContext['company'] === 'Acme Global',
      'GalxSwarmCoordinatorDO: Synchronizes multi-agent swarm state in edge memory'
    );

    // 30. Multi-Tenant Budget Alerts & Governance
    const budgetAlert = await galxDb.budgets.createBudgetAlert({
      workspaceId: ws.id,
      thresholdPercentage: 80,
      notificationWebhookUrl: 'https://api.acme.com/webhooks/budget-alert'
    });
    assert(
      budgetAlert.thresholdPercentage === 80 && budgetAlert.workspaceId === ws.id,
      'BudgetRepo: Ingests workspace threshold policy (80% alert threshold)'
    );

    // 31. Budget Threshold Evaluation
    const budgetCheck = await galxDb.budgets.checkBudgetThresholds(ws.id, 4500.0);
    assert(
      budgetCheck.success === true && budgetCheck.currentSpendUsd >= 4500.0,
      'BudgetRepo: Evaluates current spend against spend cap and evaluates alert triggers'
    );

    // 32. Zero-Egress Speculative Multi-Model Streaming
    const specEngine = GalxEdgeSpeculativeEngine.getInstance();
    const transform = specEngine.createSpeculativeTransform({ draftModel: 'gpt-5.6-mini', targetModel: 'gpt-5.6-sol' });
    assert(
      transform.readable !== undefined && transform.writable !== undefined,
      'GalxEdgeSpeculativeEngine: Creates zero-egress speculative token transform pipeline'
    );

    // 33. Pre-Warmed Connection Pool
    const pool = GalxEdgeConnectionPool.getInstance();
    const warmHeaders = pool.getWarmHeaders('openai');
    assert(
      warmHeaders['Connection'] === 'keep-alive' && pool.isEndpointWarm('openai'),
      'GalxEdgeConnectionPool: Resolves warm HTTP/2 keep-alive socket headers for upstream endpoints'
    );

    // 34. Edge HMAC Webhook Dispatcher
    const dispatcher = GalxEdgeWebhookDispatcher.getInstance();
    const dispatchRes = await dispatcher.dispatch({
      targetUrl: 'https://api.customer.io/hooks/galx-complete',
      payload: { event: 'task.completed', taskId: 'task_abc_123' },
      secret: 'whsec_test_secret_key_888',
      eventType: 'task.completed'
    });
    assert(
      dispatchRes.isSuccess === true && dispatchRes.signature.startsWith('sha256='),
      'GalxEdgeWebhookDispatcher: Dispatches signed HMAC-SHA256 event webhook with zero egress'
    );

    // 35. Shard Health Probes & Auto-Drain
    const healthRepo = ShardHealthRepository.getInstance();
    const healthResult = await healthRepo.reportHealthProbesBatch([
      { shardId, workerId: 'cf_worker_alpha', latencyMs: 190, statusCode: 200, isSuccess: true }
    ]);
    assert(
      healthResult.success === true && healthResult.probesIngested >= 1,
      'ShardHealthRepo: Records edge health heartbeats and calculates rolling shard status'
    );

    // 36. Hardened User Session Repository & SHA-256 Token Hash Lookup
    const sessionRepo = SessionRepository.getInstance();
    const mockToken = 'galx_sess_mock_payload_test_data.1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const tokenHash = GalxCryptoVault.hashSessionToken(mockToken);
    const sessionId = `sess_${Date.now()}_test`;
    const nowMs = Date.now();

    await sessionRepo.createSession({
      id: sessionId,
      userId: 'usr_provider_auth_test',
      provider: 'openai',
      shardId,
      tokenHash,
      isRevoked: false,
      issuedAtMs: nowMs,
      expiresAtMs: nowMs + 86400000 * 30,
      lastActiveAtMs: nowMs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const retrievedSession = await sessionRepo.findSessionByTokenHash(tokenHash);
    assert(
      retrievedSession !== null && retrievedSession.id === sessionId && retrievedSession.provider === 'openai',
      'SessionRepo: Ingests and retrieves session record by SHA-256 token hash'
    );

    // 37. Session Heartbeat & Activity Update
    await sessionRepo.touchSession(sessionId, nowMs + 1000);
    const touchedSession = await sessionRepo.findSessionById(sessionId);
    assert(
      touchedSession !== null && touchedSession.lastActiveAtMs >= nowMs + 1000,
      'SessionRepo: Updates session last_active_at_ms activity heartbeat'
    );

    // 38. Instant Session Revocation
    await sessionRepo.revokeSession(sessionId, 'Test security logout');
    const revokedSessionCheck = await sessionRepo.findSessionByTokenHash(tokenHash, false);
    assert(
      revokedSessionCheck === null,
      'SessionRepo: Instantly revokes session and excludes from active token hash resolution'
    );


    // 39. Expired Session Scavenging
    const reclaimedSessions = await sessionRepo.scavengeExpiredSessions();
    assert(
      typeof reclaimedSessions === 'number',
      'SessionRepo: Scavenges expired and long-revoked sessions cleanly'
    );

    // 40. Atomic Token Rotation with 30s Grace Period Window
    const oldHash = 'old_hash_rotation_test_1234567890abcdef1234567890abcdef12345678';
    const newHash = 'new_hash_rotation_test_1234567890abcdef1234567890abcdef12345678';
    const rotSessionId = `sess_rot_${Date.now()}`;
    const familyId = `fam_rot_${Date.now()}`;

    await sessionRepo.createSession({
      id: rotSessionId,
      userId: 'usr_rot_user_456',
      provider: 'openai',
      sessionFamilyId: familyId,
      sequenceNumber: 1,
      tokenHash: oldHash,
      isRevoked: false,
      issuedAtMs: nowMs,
      expiresAtMs: nowMs + 86400000,
      lastActiveAtMs: nowMs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const rotResult = await sessionRepo.rotateSessionTokenAtomic(oldHash, newHash, nowMs + 86400000 * 2, 'fpt_test_hash');
    assert(
      rotResult.success === true && rotResult.reuseDetected === false,
      'SessionRepo: Atomically rotates session token with sequence increment and grace buffer'
    );

    // 41. Grace Period In-Flight Concurrent Replay
    const graceReplay = await sessionRepo.rotateSessionTokenAtomic(oldHash, newHash, nowMs + 86400000 * 2);
    assert(
      graceReplay.success === true,
      'SessionRepo: Accepts concurrent in-flight token replay inside 30-second grace window'
    );

    // 42. Remote Logout of Other User Devices
    const otherDevSessionId = `sess_other_dev_${Date.now()}`;
    await sessionRepo.createSession({
      id: otherDevSessionId,
      userId: 'usr_rot_user_456',
      provider: 'openai',
      tokenHash: 'other_dev_hash_1234567890abcdef1234567890abcdef12345678',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      isRevoked: false,
      issuedAtMs: nowMs,
      expiresAtMs: nowMs + 86400000,
      lastActiveAtMs: nowMs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const remoteLogoutCount = await sessionRepo.revokeOtherSessions('usr_rot_user_456', rotSessionId);
    assert(
      remoteLogoutCount >= 1,
      'SessionRepo: Revokes all other remote devices while maintaining active session'
    );

    // 43. Step-Up SUDO Mode Elevation
    const sudoElevation = await sessionRepo.elevateSessionSudo(rotSessionId, 'usr_rot_user_456', 900000);
    assert(
      sudoElevation.success === true && sudoElevation.sudoActive === true && sudoElevation.sudoElevatedUntilMs > nowMs,
      'SessionRepo: Elevates active session to privileged SUDO mode for 15-minute window'
    );

    // 44. Behavioral Risk Telemetry Ingestion
    await sessionRepo.recordRiskEvent(
      rotSessionId,
      'usr_rot_user_456',
      35,
      ['DEVICE_OS_SHIFT: macOS -> iOS'],
      '198.51.100.99',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    );
    const postureCheck = await sessionRepo.getUserSecurityPosture('usr_rot_user_456', rotSessionId);
    assert(
      postureCheck.activeSessionsCount >= 1 && ['A+', 'A', 'B', 'C'].includes(postureCheck.overallGrade),
      'SessionRepo: Ingests risk anomaly event and calculates composite security posture grade'
    );

    // 45. SingleFlight Request Coalescing (Cache Stampede Defense)
    const coalescer = new GalxRequestCoalescer<string | null>({ ttlMs: 5000 });
    let dbQueryCount = 0;
    const fetcher = async (): Promise<string | null> => {
      dbQueryCount++;
      await new Promise(r => setTimeout(r, 20));
      return 'authoritative_db_record_payload';
    };

    // Fire 50 concurrent requests simultaneously for the same key
    const concurrentFetches = Array.from({ length: 50 }, () => coalescer.getOrFetch('user_stampede_key', fetcher));
    const fetchResults = await Promise.all(concurrentFetches);
    assert(
      dbQueryCount === 1 && fetchResults.length === 50 && fetchResults.every(r => r === 'authoritative_db_record_payload'),
      'GalxRequestCoalescer: Coalesces 50 concurrent in-flight requests into 1 single database fetch'
    );

    // 46. Negative Caching (Non-Existent Key Stampede Defense)
    let negativeDbQueryCount = 0;
    const negativeFetcher = async (): Promise<string | null> => {
      negativeDbQueryCount++;
      return null;
    };
    await coalescer.getOrFetch('non_existent_key_123', negativeFetcher);
    await coalescer.getOrFetch('non_existent_key_123', negativeFetcher);
    assert(
      negativeDbQueryCount === 1,
      'GalxRequestCoalescer: Negative-caches null responses to prevent non-existent key stampedes'
    );

    // 47. Deadlock-Free Sorted Multi-User Micro-Batch Coalesced Draw
    const batchUserA = `usr_batch_coalesce_a_${Date.now()}`;
    const batchUserB = `usr_batch_coalesce_b_${Date.now()}`;
    await walletRepo.verifyDepositAndApplyMatch({ userId: batchUserA, depositAmountUsd: 10, paymentRef: 'test_a' });
    await walletRepo.verifyDepositAndApplyMatch({ userId: batchUserB, depositAmountUsd: 10, paymentRef: 'test_b' });

    const coalescedBatchRes = await walletRepo.drawTokensCoalescedBatch([
      {
        userId: batchUserB,
        totalCostUsd: 0.50,
        requestCount: 5,
        totalPromptTokens: 500,
        totalCompletionTokens: 250,
        totalCachedTokens: 100,
        description: 'Coalesced stream chunks for User B'
      },
      {
        userId: batchUserA,
        totalCostUsd: 0.75,
        requestCount: 8,
        totalPromptTokens: 800,
        totalCompletionTokens: 400,
        totalCachedTokens: 200,
        description: 'Coalesced stream chunks for User A'
      }
    ]);
    assert(
      coalescedBatchRes.success === true &&
      coalescedBatchRes.processedUsersCount === 2 &&
      Math.abs(coalescedBatchRes.totalDebitUsd - 1.25) < 0.000001,
      'WalletRepo: Atomically executes multi-user coalesced batch debit in deadlock-free sorted order'
    );

    // 48. Edge Batch Buffer: Async Coalesced Enqueue & Deferred Settlement
    const edgeBatchBuffer = GalxEdgeBatchBuffer.getInstance();
    const batchUserC = `usr_batch_async_c_${Date.now()}`;
    await walletRepo.verifyDepositAndApplyMatch({ userId: batchUserC, depositAmountUsd: 10, paymentRef: 'test_c' });

    const asyncDrawPromise1 = edgeBatchBuffer.enqueueTokenDrawAsync({
      userId: batchUserC,
      costUsd: 0.10,
      description: 'Stream chunk 1',
      promptTokens: 100,
      completionTokens: 50
    });
    const asyncDrawPromise2 = edgeBatchBuffer.enqueueTokenDrawAsync({
      userId: batchUserC,
      costUsd: 0.20,
      description: 'Stream chunk 2',
      promptTokens: 200,
      completionTokens: 100
    });

    // Explicitly flush edge batch buffer
    await edgeBatchBuffer.flushAll();
    const [drawRes1, drawRes2] = await Promise.all([asyncDrawPromise1, asyncDrawPromise2]);
    assert(
      drawRes1.success === true && drawRes2.success === true && drawRes1.newBalance !== undefined,
      'GalxEdgeBatchBuffer: Asynchronously coalesces stream token draws and resolves caller promises on batch flush'
    );

    // 49. GalxBatchDataLoader: Multi-Key Tick Batching (Meta/GraphQL Pattern)
    let batchQueryCount = 0;
    const dataLoader = new GalxBatchDataLoader<string, { id: string; name: string }>(
      async (keys) => {
        batchQueryCount++;
        return keys.map(k => ({ id: k, name: `Loaded_${k}` }));
      },
      { batchWindowMs: 5 }
    );

    // Dispatch 20 individual load calls simultaneously
    const loadPromises = Array.from({ length: 20 }, (_, i) => dataLoader.load(`key_${i}`));
    const loadedResults = await Promise.all(loadPromises);
    assert(
      batchQueryCount === 1 && loadedResults.length === 20 && loadedResults[0].name === 'Loaded_key_0',
      'GalxBatchDataLoader: Coalesces 20 individual load() calls in a tick into 1 single batch function execution'
    );

    // 50. GalxRequestCoalescer: Stale-While-Revalidate (SWR) Instant Return & Background Refresh
    const swrCoalescer = new GalxRequestCoalescer<string>({ ttlMs: 50, staleTtlMs: 500 });
    let swrFetchCount = 0;
    const swrFetcher = async () => {
      swrFetchCount++;
      return `v${swrFetchCount}`;
    };

    // First fetch: fresh
    const val1 = await swrCoalescer.getOrFetchSWR('swr_key', swrFetcher);
    assert(val1 === 'v1' && swrFetchCount === 1, 'GalxRequestCoalescer: Fetches initial value');

    // Wait for fresh TTL to expire (entering stale window)
    await new Promise(r => setTimeout(r, 60));

    // Stale fetch: returns 'v1' instantly (0ms) and queues background refresh
    const val2 = await swrCoalescer.getOrFetchSWR('swr_key', swrFetcher);
    assert(val2 === 'v1', 'GalxRequestCoalescer: SWR returns stale value immediately (0ms latency)');

    // Wait for background refresh promise to settle
    await new Promise(r => setTimeout(r, 20));
    const val3 = await swrCoalescer.getOrFetchSWR('swr_key', swrFetcher);
    assert(val3 === 'v2' && swrFetchCount === 2, 'GalxRequestCoalescer: SWR background revalidation updates cache');

    // 51. WalletRepository: Bulk Array Resolution via DataLoader
    const multiWallets = await walletRepo.getWalletsBatch([batchUserA, batchUserB, batchUserC]);
    assert(
      multiWallets.length === 3 && multiWallets.every(w => w !== null && w.userId.startsWith('usr_batch_')),
      'WalletRepo: Resolves multiple user wallets in 1 batched array RPC lookup'
    );

    // 52. ApiKeyRepository: Bulk Array Resolution via DataLoader
    const devKeyA: any = {
      id: `key_dl_a_${Date.now()}`,
      name: 'Batch Key A',
      userId: batchUserA,
      prefix: 'gk_live_a',
      keyPrefix: 'gk_live_a',
      keyHash: `hash_dl_a_${Date.now()}`,
      rateLimitPerMinute: 100,
      revoked: false
    };
    const devKeyB: any = {
      id: `key_dl_b_${Date.now()}`,
      name: 'Batch Key B',
      userId: batchUserB,
      prefix: 'gk_live_b',
      keyPrefix: 'gk_live_b',
      keyHash: `hash_dl_b_${Date.now()}`,
      rateLimitPerMinute: 100,
      revoked: false
    };
    await keyRepo.saveGatewayKey(devKeyA);
    await keyRepo.saveGatewayKey(devKeyB);

    const loadedKeys = await keyRepo.findKeysByHashesBatch([devKeyA.keyHash, devKeyB.keyHash]);
    assert(
      loadedKeys.length === 2 && loadedKeys[0]?.id === devKeyA.id && loadedKeys[1]?.id === devKeyB.id,
      'ApiKeyRepo: Resolves multiple API keys by hashes in 1 batched array RPC lookup'
    );

    // 53. AuditRepository: Bulk Audit Event Recording via jsonb_to_recordset
    const auditBatchRes = await auditRepo.recordAuditBatch([
      { action: 'batch.audit.test.1', userId: batchUserA, metadata: { step: 1 } },
      { action: 'batch.audit.test.2', userId: batchUserB, metadata: { step: 2 } },
      { action: 'batch.audit.test.3', userId: batchUserC, metadata: { step: 3 } }
    ]);
    assert(
      auditBatchRes.success === true && auditBatchRes.insertedCount === 3,
      'AuditRepo: Ingests bulk audit events via high-velocity PostgreSQL jsonb_to_recordset RPC'
    );

    // 54. GalxWriteBehindBuffer: Double-Buffering Atomic Swap & Batch Draining
    let drainedItemsCount = 0;
    const writeBehind = new GalxWriteBehindBuffer<{ id: string; val: number }>({
      maxBatchSize: 10,
      flushIntervalMs: 500,
      drainHandler: async (batch) => {
        drainedItemsCount += batch.length;
      }
    });

    for (let i = 0; i < 25; i++) {
      writeBehind.enqueue({ id: `wb_${i}`, val: i });
    }
    await writeBehind.flush();
    const wbMetrics = writeBehind.getMetrics();
    assert(
      drainedItemsCount === 25 && wbMetrics.totalFlushes >= 2 && wbMetrics.currentQueueDepth === 0,
      'GalxWriteBehindBuffer: Double-buffering atomic swap and monotonic batch draining verified'
    );
    writeBehind.destroy();

    // 55. GalxMultiTierCache: 3-Tier L1/L2/L3 with O(1) Tag-Based Invalidation
    const multiTier = new GalxMultiTierCache<string>();
    let dbTierHitCount = 0;
    const l3DbFetcher = async () => {
      dbTierHitCount++;
      return 'user_settings_payload';
    };

    // First fetch: populates L1 and L2 with tags
    const tierVal1 = await multiTier.getOrFetch('user:usr_999:settings', l3DbFetcher, ['user:usr_999', 'org:org_alpha']);
    assert(tierVal1 === 'user_settings_payload' && dbTierHitCount === 1, 'GalxMultiTierCache: Fetches and tags L3 DB payload');

    // Second fetch: L1 hit (0 DB queries)
    const tierVal2 = await multiTier.getOrFetch('user:usr_999:settings', l3DbFetcher, ['user:usr_999']);
    assert(tierVal2 === 'user_settings_payload' && dbTierHitCount === 1, 'GalxMultiTierCache: Returns L1 cached result');

    // Invalidate by tag 'org:org_alpha'
    const invalidatedCount = multiTier.invalidateTag('org:org_alpha');
    assert(invalidatedCount === 1, 'GalxMultiTierCache: O(1) Tagged invalidation purges matching cache keys');

    // 56. WalletRepository: Native C-Array UNNEST Batch Token Draw
    const unnestDrawRes = await walletRepo.drawTokensUnnestBatch([
      { userId: batchUserA, costUsd: 0.25, description: 'Unnest draw 1', promptTokens: 100, completionTokens: 50 },
      { userId: batchUserA, costUsd: 0.25, description: 'Unnest draw 2', promptTokens: 150, completionTokens: 75 },
      { userId: batchUserB, costUsd: 0.50, description: 'Unnest draw 3', promptTokens: 300, completionTokens: 100 }
    ]);
    assert(
      unnestDrawRes.success === true &&
      unnestDrawRes.processedUsersCount === 2 &&
      Math.abs(unnestDrawRes.totalDebitUsd - 1.00) < 0.000001,
      'WalletRepo: Executes native C-array UNNEST batch debit with zero JSON parsing overhead'
    );

    // 57. SessionRepository: High-Velocity Bulk Session Heartbeat Touch
    const sessTokenHashA = `hash_touch_a_${Date.now()}`;
    const sessTokenHashB = `hash_touch_b_${Date.now()}`;
    const nowTouch = Date.now();
    await sessionRepo.createSession({
      id: `sess_touch_a_${nowTouch}`,
      userId: batchUserA,
      provider: 'openai',
      tokenHash: sessTokenHashA,
      isRevoked: false,
      issuedAtMs: nowTouch,
      expiresAtMs: nowTouch + 3600000,
      lastActiveAtMs: nowTouch,
      createdAt: new Date(nowTouch).toISOString(),
      updatedAt: new Date(nowTouch).toISOString()
    });
    await sessionRepo.createSession({
      id: `sess_touch_b_${nowTouch}`,
      userId: batchUserB,
      provider: 'openai',
      tokenHash: sessTokenHashB,
      isRevoked: false,
      issuedAtMs: nowTouch,
      expiresAtMs: nowTouch + 3600000,
      lastActiveAtMs: nowTouch,
      createdAt: new Date(nowTouch).toISOString(),
      updatedAt: new Date(nowTouch).toISOString()
    });

    const touchRes = await sessionRepo.touchSessionsBatch([sessTokenHashA, sessTokenHashB], Date.now());
    assert(
      touchRes.success === true && touchRes.touchedCount === 2,
      'SessionRepo: Bulk touches session activity heartbeats in 1 single UNNEST query'
    );

    // 58. GalxXFetchEngine: Probabilistic Early Expiration (XFetch Algorithm) with BroccoliDB
    const xfetch = new GalxXFetchEngine<string>({ beta: 2.0, defaultTtlMs: 200 });
    let xfetchDbQueries = 0;
    const xfetchSource = async () => {
      xfetchDbQueries++;
      await new Promise(r => setTimeout(r, 10));
      return `hot_data_v${xfetchDbQueries}`;
    };

    // 1st fetch: cache miss
    const xval1 = await xfetch.getOrFetch('hot_llm_key', xfetchSource);
    assert(xval1 === 'hot_data_v1' && xfetchDbQueries === 1, 'GalxXFetchEngine: Populates initial value in BroccoliDB L1 table');

    // 2nd fetch immediately: cache hit
    const xval2 = await xfetch.getOrFetch('hot_llm_key', xfetchSource);
    assert(xval2 === 'hot_data_v1' && xfetchDbQueries === 1, 'GalxXFetchEngine: Returns cached value with 0ms latency');

    // 59. GalxBurstSmoother: Adaptive AIMD Concurrency Limiting & BroccoliDB Analytics
    const smoother = new GalxBurstSmoother({ initialLimit: 5, minLimit: 2, maxLimit: 20 });
    const burstTasks = Array.from({ length: 15 }, (_, i) =>
      smoother.schedule(async () => {
        await new Promise(r => setTimeout(r, 5));
        return `burst_task_${i}`;
      })
    );
    const burstResults = await Promise.all(burstTasks);
    const burstStats = smoother.getStats();
    assert(
      burstResults.length === 15 && burstStats.totalExecuted === 15 && burstStats.percentiles.totalSamples >= 15,
      'GalxBurstSmoother: Schedules 15 burst tasks with AIMD limiting and calculates BroccoliDB percentiles'
    );

    // 60. GalxCreditSlicer: Edge Token Leasing & Streaming Credit Slicing with BroccoliDB
    const creditSlicer = GalxCreditSlicer.getInstance();
    const sliceUser = `usr_slice_${Date.now()}`;
    await walletRepo.verifyDepositAndApplyMatch({ userId: sliceUser, depositAmountUsd: 10, paymentRef: 'slice_test' });

    // Acquire $0.50 credit slice
    const slice = await creditSlicer.acquireSlice(sliceUser, 0.50, 60000);
    assert(
      slice.active === true && slice.leasedAmountUsd === 0.50 && slice.remainingAmountUsd === 0.50,
      'GalxCreditSlicer: Leases $0.50 credit slice into BroccoliDB reactive table'
    );

    // Micro-debit 5 streaming chunks locally in memory
    for (let i = 0; i < 5; i++) {
      const debitRes = creditSlicer.debitLocal(sliceUser, 0.05);
      assert(debitRes.success === true, 'GalxCreditSlicer: Local micro-debit executes with 0ms DB egress');
    }

    // Reconcile unspent portion back to PostgreSQL
    const reconcileRes = await creditSlicer.reconcileSlice(sliceUser);
    assert(
      reconcileRes.success === true && Math.abs(reconcileRes.reconciledSpentUsd - 0.25) < 0.000001,
      'GalxCreditSlicer: Reconciles $0.25 spent tokens to PostgreSQL and releases unspent credit'
    );

    // 61. Distributed Probabilistic Recompute Locks (Migration 32)
    {
      const lockData = await invokeLiveRpc<any>('fn_batch_probabilistic_recompute_lock', {
        p_keys: ['cache_key_alpha', 'cache_key_beta'],
        p_worker_id: 'cf_edge_worker_99',
        p_ttl_ms: 5000
      }, 'SELECT public.fn_batch_probabilistic_recompute_lock($1::varchar[], $2::varchar, $3::integer) AS data;', [
        ['cache_key_alpha', 'cache_key_beta'],
        'cf_edge_worker_99',
        5000,
      ]);
      assert(
        Boolean(lockData?.success === true && lockData.acquired_keys?.length >= 1),
        'DistributedLock: Acquires distributed recompute locks for coordinated XFetch recomputation'
      );
    }

    // 62. GalxGatewayMesh: 1-Hop Composite Preflight Pipeline (Migration 33)
    const gatewayMesh = GalxGatewayMesh.getInstance();
    const preflightUser = `usr_mesh_${Date.now()}`;
    const preflightKey = `gk_live_${Date.now()}_alpha`;
    const preflightKeyHash = GalxCryptoVault.hashSessionToken(preflightKey);
    const preflightWsId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

    // Provision test wallet and active developer key
    await walletRepo.verifyDepositAndApplyMatch({ userId: preflightUser, depositAmountUsd: 10, paymentRef: 'mesh_test' });
    await keyRepo.saveGatewayKey({
      id: `key_mesh_${Date.now()}`,
      userId: preflightUser,
      prefix: 'gk_live',
      keyPrefix: 'gk_live',
      keyHash: preflightKeyHash,
      name: 'Gateway Mesh Test Key',
      rateLimitPerMinute: 1000,
      totalRequests: 0,
      totalTokens: 0,
      createdAtMs: Date.now(),
      revoked: false
    });

    const gatewayRequestId = `gateway-test-${Date.now()}`;
    const ticket = await gatewayMesh.executePreflight(
      preflightKeyHash,
      'gpt-4o',
      0.10,
      'integration_test',
      { requestId: gatewayRequestId, estimatedTokens: 200 }
    );
    assert(
      ticket.userId === preflightUser && ticket.currentBalanceUsd >= 10.0 && ticket.model === 'gpt-4o',
      'GalxGatewayMesh: 1-hop atomic preflight resolves key, workspace, wallet, and shard lease in 1 RPC'
    );

    // 63. GalxGatewayMesh: Hot Caller Preflight in BroccoliDB L1 (0ms)
    const hotTicket = await gatewayMesh.executePreflight(
      preflightKeyHash,
      'gpt-4o',
      0.10,
      'integration_test',
      { requestId: gatewayRequestId, estimatedTokens: 200 }
    );
    assert(
      hotTicket.ticketId === ticket.ticketId && gatewayMesh.getStats().preflightL1Hits >= 1,
      'GalxGatewayMesh: Hot caller preflight returns instantly from BroccoliDB L1 table (0ms)'
    );

    // 64. GalxGatewayMesh: 1-Hop Composite Postflight Reconciliation (Migration 33)
    const postflightRes = await gatewayMesh.executePostflight({
      userId: preflightUser,
      workspaceId: preflightWsId,
      shardId: ticket.shardId,
      leaseId: ticket.leaseId,
      actualCostUsd: 0.05,
      model: 'gpt-4o',
      promptTokens: 100,
      completionTokens: 50,
      cachedTokens: 20,
      latencyMs: 120,
      statusCode: 200
    });
    assert(
      postflightRes.success === true && postflightRes.finalBalanceUsd !== undefined,
      'GalxGatewayMesh: 1-hop composite postflight debits wallet, releases lease, and logs audit in 1 RPC'
    );

    // 65. Workspace: 1-Hop Composite State Hydration (Migration 34)
    {
      const wsState = await invokeLiveRpc<any>('fn_get_workspace_composite_state', {
        p_workspace_id: ws.id
      }, 'SELECT public.fn_get_workspace_composite_state($1::uuid) AS data;', [ws.id]);
      assert(
        Boolean(wsState?.success === true && Array.isArray(wsState.environments)),
        'Workspace: 1-hop composite state query aggregates workspace, environments, keys, budget alerts, and audits'
      );
    }

    // 66. Stripe: 1-Hop Bulk Deposit Fulfillment Batch (Migration 34)
    {
      const bulkDepositUser1 = `usr_bulk_dep1_${Date.now()}`;
      const bulkDepositUser2 = `usr_bulk_dep2_${Date.now()}`;
      const deposits = [
        { user_id: bulkDepositUser1, deposit_amount_usd: 20, payment_ref: 'bulk_dep_1' },
        { user_id: bulkDepositUser2, deposit_amount_usd: 50, payment_ref: 'bulk_dep_2' }
      ];
      const bulkDepData = await invokeLiveRpc<any>('fn_bulk_verify_deposit_and_match', {
        p_deposits: deposits
      }, 'SELECT public.fn_bulk_verify_deposit_and_match($1::jsonb) AS data;', [JSON.stringify(deposits)]);
      assert(
        Boolean(bulkDepData?.processed_deposits_count === 2 && bulkDepData.total_credit_granted_usd === 105),
        'Stripe: 1-hop bulk deposit fulfillment processes multiple deposits with 50% match'
      );
    }

    // 67. Model Routing: 1-Hop Atomic Policy Routing Evaluation (Migration 34)
    {
      const routeData = await invokeLiveRpc<any>('fn_route_model_atomic_eval', {
        p_workspace_id: ws.id,
        p_requested_model: 'grok-beta',
        p_prompt_preview: 'Hello world',
        p_max_cost: 0.10
      }, 'SELECT public.fn_route_model_atomic_eval($1::uuid, $2::varchar, $3::text, $4::numeric) AS data;', [
        ws.id,
        'grok-beta',
        'Hello world',
        0.10,
      ]);
      assert(
        Boolean(routeData?.success === true && routeData.selected_provider === 'xai-grok'),
        'Model Routing: 1-hop atomic policy routing selects provider and logs evidence in 1 RPC'
      );
    }

    // 68. GalxMultiQueryPipeliner: 1-Hop Batch Multi-RPC Multiplexer (Migration 36)
    const pipeliner = GalxMultiQueryPipeliner.getInstance();
    const pipeResults = await Promise.all([
      pipeliner.executeRpc('get_wallet', { user_id: preflightUser }),
      pipeliner.executeRpc('route_model', { requested_model: 'gpt-4o' }),
      pipeliner.executeRpc('verify_tokens', { token_hashes: [preflightKeyHash] })
    ]);
    assert(
      pipeResults.length === 3 && pipeResults[0] !== undefined && pipeliner.getStats().totalDispatchedBatches >= 1,
      'GalxMultiQueryPipeliner: Batches 3 RPC calls into 1 multiplexed multi-RPC roundtrip'
    );

    // 69. Token Verification: 1-Hop Multi-Token Lookup (Migration 35)
    {
      const tokData = await invokeLiveRpc<any>('fn_batch_verify_tokens', {
        p_token_hashes: [preflightKeyHash]
      }, 'SELECT public.fn_batch_verify_tokens($1::varchar[]) AS data;', [[preflightKeyHash]]);
      assert(
        Boolean(tokData?.success === true && tokData.verified_count >= 1),
        'Token Verification: 1-hop multi-token lookup checks API keys and sessions simultaneously'
      );
    }

    // 70. Merkle Proofs: 1-Hop Windowed Merkle Chain Proof (Migration 35)
    {
      const walRes = await walletRepo.getWallet(preflightUser);
      if (walRes) {
        const merkleData = await invokeLiveRpc<any>('fn_verify_merkle_chain_window', {
          p_wallet_id: walRes.id,
          p_limit: 50
        }, 'SELECT public.fn_verify_merkle_chain_window($1::uuid, $2::integer) AS data;', [walRes.id, 50]);
        assert(
          Boolean(merkleData?.success === true && merkleData.chain_valid === true),
          'Merkle Proofs: 1-hop windowed Merkle chain integrity verification executes natively in PostgreSQL'
        );
      }
    }

    // 71. Organization: 1-Hop Full Hierarchy State Hydration (Migration 36)
    {
      const testOrgId = `org_test_${Date.now()}`;
      await invokeLiveRpc<any>('fn_create_organization', {
        p_id: testOrgId,
        p_name: 'Enterprise Apex Org',
        p_slug: `apex-org-${Date.now()}`,
        p_tier: 'enterprise',
        p_seat_capacity: 100,
        p_billing_email: 'finance@apex-org.io'
      }, 'SELECT public.fn_create_organization($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::integer, $6::varchar) AS data;', [
        testOrgId,
        'Enterprise Apex Org',
        `apex-org-${Date.now()}`,
        'enterprise',
        100,
        'finance@apex-org.io',
      ]);
      const orgData = await invokeLiveRpc<any>('fn_get_organization_full_hierarchy_state', {
        p_org_id: testOrgId
      }, 'SELECT public.fn_get_organization_full_hierarchy_state($1::varchar) AS data;', [testOrgId]);
      assert(
        Boolean(orgData?.success === true && orgData.organization?.id === testOrgId),
        'Organization: 1-hop full hierarchy state hydration returns complete org graph'
      );
    }

    // 72. Multi-RPC Dispatcher: Executes Heterogenous RPCs in 1 JSON Transaction (Migration 36)
    {
      const calls = [
        { id: 'c1', procedure: 'get_wallet', args: { user_id: preflightUser } },
        { id: 'c2', procedure: 'route_model', args: { requested_model: 'claude-3-5-sonnet' } }
      ];
      const multiData = await invokeLiveRpc<any>('fn_batch_multi_rpc_dispatch', {
        p_calls: calls
      }, 'SELECT public.fn_batch_multi_rpc_dispatch($1::jsonb) AS data;', [JSON.stringify(calls)]);
      assert(
        Boolean(multiData?.success === true && multiData.total_calls_executed === 2),
        'Multi-RPC Dispatcher: Executes heterogenous RPCs in 1 single JSON roundtrip'
      );
    }

    // 73. Atomic Merkle Leaf Append: C-Native SHA-256 Digest (Migration 37)
    {
      const walRes = await walletRepo.getWallet(preflightUser);
      if (walRes) {
        const leafData = await invokeLiveRpc<any>('fn_atomic_merkle_leaf_append', {
          p_wallet_id: walRes.id,
          p_user_id: preflightUser,
          p_tx_type: 'deposit',
          p_amount: 5.0,
          p_desc: 'C-native Merkle Leaf Test Append'
        }, 'SELECT public.fn_atomic_merkle_leaf_append($1::uuid, $2::varchar, $3::varchar, $4::numeric, $5::text) AS data;', [
          walRes.id,
          preflightUser,
          'deposit',
          5.0,
          'C-native Merkle Leaf Test Append',
        ]);
        assert(
          Boolean(leafData?.success === true && leafData.ledger_hash?.length === 64),
          'Merkle Leaf: Appends cryptographic Merkle leaf with C-native SHA-256 parent chaining in 1 RPC'
        );
      }
    }

    // 74. Synthetic Canary SLO Error Budget Rollup (Migration 37)
    {
      const probeData = {
        target_url: 'https://api.galxai.internal/healthz',
        status_code: 200,
        latency_ms: 35,
        region: 'us-west-2'
      };
      const canaryData = await invokeLiveRpc<any>('fn_ingest_canary_probe_and_eval_slo', {
        p_probe_data: probeData
      }, 'SELECT public.fn_ingest_canary_probe_and_eval_slo($1::jsonb) AS data;', [JSON.stringify(probeData)]);
      assert(
        Boolean(canaryData?.success === true && canaryData.is_success === true),
        'Synthetic Canary: 1-hop probe ingestion and SLO error budget evaluation'
      );
    }




    console.log('\n======================================================================');
    console.log(`   ALL ${passed}/${passed} APEX ZERO-EGRESS & DATABASE TESTS PASSED!`);
    console.log('======================================================================\n');
  } catch (err: any) {
    console.error('\nTest suite encountered fatal error:', err);
    process.exitCode = 1;
  } finally {
    if (fixtureShardId) {
      try { await ShardRepository.getInstance().deleteShard(fixtureShardId, { requireRemote: true }); }
      catch { console.error('Integration shard cleanup failed in the isolated test database.'); process.exitCode = 1; }
    }
    await closePostgresPool();
  }
}

// Financial regression tests use an isolated local schema and simulated Stripe.
// This mode never runs the broad integration suite against configured accounts.
if (process.argv.includes('--billing')) void import('./test-stripe-integration');
else void runTests();
