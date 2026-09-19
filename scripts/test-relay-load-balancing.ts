import assert from 'node:assert/strict';
import test from 'node:test';
import type { GalxShardAccount, GalxRotationStrategy, TokenBucketState } from '../src/core/contracts/GalxContracts.js';
import { GalxCircuitBreaker } from '../src/core/circuit/GalxCircuitBreaker.js';
import { ContinuousTokenBucketRateGovernor } from '../src/core/governor/ContinuousTokenBucketRateGovernor.js';
import { GalxCredentialPool } from '../src/core/pool/GalxCredentialPool.js';
import { GalxShardSyncBuffer } from '../src/core/pool/GalxShardSyncBuffer.js';
import { StandardPoolScheduler } from '../src/relay/standard-pool-scheduler.js';
import {
  RELAY_LOAD_TIER,
  RELAY_LOAD_TIER_CONFIG,
  runHostileFairness,
  runQuotaBoundaryAttacks,
  runQueueWarfare,
  runStandardSchedulerRaceChecks,
  runSeededStateMachines,
  runSyntheticMmo
} from './relay-load-war-game.js';

// The production pool normally writes best-effort telemetry through a shared
// write-behind buffer. This test file is a closed-world simulation: disable
// that egress at the shared seam so a load test can never contact Supabase or
// a provider, even if a release crosses the normal telemetry batch threshold.
const syntheticSyncBuffer = GalxShardSyncBuffer.getInstance() as any;
syntheticSyncBuffer.enqueueProbe = () => {};
syntheticSyncBuffer.enqueueStateTransition = () => {};
syntheticSyncBuffer.flushNow = async () => ({ probesFlushed: 0, transitionsFlushed: 0 });

type SyntheticSubstrate = {
  accounts: Map<string, GalxShardAccount>;
  listAccounts: (_userId?: string, provider?: string) => GalxShardAccount[];
  getAccount: (id: string) => GalxShardAccount | undefined;
  updateAccount: (account: GalxShardAccount) => void;
  onRetract: (_listener: (shardId: string) => void) => void;
};

function syntheticSubstrate(
  accounts: GalxShardAccount[]
): SyntheticSubstrate {
  const byId = new Map(accounts.map(account => [account.id, account]));
  return {
    accounts: byId,
    listAccounts: (_userId, provider) => [...byId.values()].filter(account => !provider || account.provider === provider),
    getAccount: id => byId.get(id),
    updateAccount: account => byId.set(account.id, account),
    onRetract: () => {}
  };
}

function makeAccount(
  id: string,
  governor: ContinuousTokenBucketRateGovernor,
  nowMs: number,
  options: { weight?: number; status?: GalxShardAccount['status']; bucket?: TokenBucketState } = {}
): GalxShardAccount {
  return {
    id,
    userId: `owner-${id}`,
    provider: 'openai',
    authType: 'api_key',
    accountLabel: `Synthetic ${id}`,
    apiKeyMasked: 'synthetic',
    priority: 10,
    weight: options.weight ?? 1,
    status: options.status ?? 'healthy',
    tokenBucket: options.bucket ?? governor.createDefaultBucket(10_000_000, 0, 10_000, nowMs),
    stats: {
      totalRequestsServed: 0,
      totalTokensConsumed: 0,
      consecutiveFailures: 0,
      averageLatencyMs: 500
    },
    fencingToken: 1,
    createdAtMs: nowMs,
    updatedAtMs: nowMs
  };
}

function makePool(
  count: number,
  nowMs: number,
  strategy: GalxRotationStrategy = 'adaptive_headroom',
  bucketFactory?: (governor: ContinuousTokenBucketRateGovernor, index: number) => TokenBucketState
) {
  const governor = new ContinuousTokenBucketRateGovernor();
  const accounts = Array.from({ length: count }, (_, index) => makeAccount(
    `synthetic-${index}`,
    governor,
    nowMs,
    { bucket: bucketFactory?.(governor, index) }
  ));
  const substrate = syntheticSubstrate(accounts);
  const pool = new GalxCredentialPool(
    substrate as any,
    governor,
    new GalxCircuitBreaker(),
    strategy,
    { isAuthorityConfigured: () => false } as any
  );
  return { pool, substrate, governor };
}

test('synthetic standard dispatch remains balanced under a high-throughput reservation burst', () => {
  const scheduler = new StandardPoolScheduler(() => 0);
  const candidates = ['a', 'b', 'c', 'd'].map(id => ({ id, lastUsedAtMs: 0, availableSlots: 8 }));
  const counts = new Map(candidates.map(candidate => [candidate.id, 0]));

  for (let round = 0; round < 500; round++) {
    const reservations = Array.from({ length: 32 }, () => scheduler.reserve(candidates));
    assert.ok(reservations.every(Boolean), `round ${round} should fill the synthetic fleet capacity`);
    assert.equal(scheduler.reserve(candidates), undefined, 'a full burst must shed instead of over-admitting');
    for (const reservation of reservations) {
      const selected = reservation!;
      counts.set(selected.candidate.id, (counts.get(selected.candidate.id) ?? 0) + 1);
      selected.release();
    }
  }

  assert.deepEqual([...counts.values()], [4000, 4000, 4000, 4000]);
});

test('synthetic weighted routing preserves proportional share without provider dispatch', () => {
  const nowMs = Date.now();
  const governor = new ContinuousTokenBucketRateGovernor();
  const accounts = [
    makeAccount('weighted-1', governor, nowMs, { weight: 1 }),
    makeAccount('weighted-2', governor, nowMs, { weight: 2 }),
    makeAccount('weighted-3', governor, nowMs, { weight: 3 })
  ];
  const substrate = syntheticSubstrate(accounts);
  const pool = new GalxCredentialPool(
    substrate as any,
    governor,
    new GalxCircuitBreaker(),
    'smooth_weighted_round_robin',
    { isAuthorityConfigured: () => false } as any
  );
  const counts = new Map(accounts.map(account => [account.id, 0]));

  for (let i = 0; i < 600; i++) {
    const result = pool.acquireLease({
      userId: `weighted-tenant-${i}`,
      jobId: `weighted-job-${i}`,
      provider: 'openai',
      estimatedTokens: 100,
      maxInFlightPerShard: 8,
      queueIfExhausted: false,
      nowMs
    });
    assert.ok(result.lease);
    counts.set(result.lease!.shardId, (counts.get(result.lease!.shardId) ?? 0) + 1);
    assert.equal(pool.releaseLease(result.lease!.leaseId, { tokensConsumed: 100, success: true, nowMs }), true);
  }

  assert.deepEqual(
    accounts.map(account => counts.get(account.id)),
    [100, 200, 300],
    'weighted rotation should not collapse onto the first healthy account'
  );
});

test('synthetic burst cannot over-commit token capacity or request slots', () => {
  const nowMs = Date.now();
  const tokenBound = makePool(4, nowMs, 'adaptive_headroom', governor =>
    governor.createDefaultBucket(2_000, 0, 10_000, nowMs)
  );
  const tokenLeases: Array<{ leaseId: string; shardId: string }> = [];

  for (let i = 0; i < 200; i++) {
    const result = tokenBound.pool.acquireLease({
      userId: `token-tenant-${i}`,
      jobId: `token-job-${i}`,
      provider: 'openai',
      estimatedTokens: 1_000,
      maxInFlightPerShard: 100,
      queueIfExhausted: false,
      nowMs
    });
    if (result.lease) tokenLeases.push(result.lease);
    else assert.equal(result.status, 'all_shards_cooldown');
  }

  assert.equal(tokenLeases.length, 8, 'each synthetic account may hold only its token budget');
  assert.deepEqual(
    [...new Set(tokenLeases.map(lease => lease.shardId))].sort(),
    ['synthetic-0', 'synthetic-1', 'synthetic-2', 'synthetic-3']
  );
  for (const account of tokenBound.substrate.accounts.values()) {
    assert.equal(account.tokenBucket.reservedTokens, 2_000);
    assert.equal(tokenBound.pool.getInFlightCount(account.id), 2);
  }
  for (const lease of tokenLeases) tokenBound.pool.releaseLease(lease.leaseId, { tokensConsumed: 1_000, success: true, nowMs });

  const requestBound = makePool(4, nowMs, 'adaptive_headroom', governor =>
    governor.createDefaultBucket(1_000_000, 0, 2, nowMs)
  );
  const requestLeases: Array<{ leaseId: string; shardId: string }> = [];
  for (let i = 0; i < 200; i++) {
    const result = requestBound.pool.acquireLease({
      userId: `request-tenant-${i}`,
      jobId: `request-job-${i}`,
      provider: 'openai',
      estimatedTokens: 1_000,
      maxInFlightPerShard: 100,
      queueIfExhausted: false,
      nowMs
    });
    if (result.lease) requestLeases.push(result.lease);
    else assert.equal(result.status, 'all_shards_cooldown');
  }

  assert.equal(requestLeases.length, 8, 'in-flight work must reserve the request-slot budget');
  assert.deepEqual(
    [...requestBound.substrate.accounts.values()].map(account => requestBound.pool.getInFlightCount(account.id)),
    [2, 2, 2, 2]
  );
  for (const lease of requestLeases) requestBound.pool.releaseLease(lease.leaseId, { tokensConsumed: 1_000, success: true, nowMs });
});

test('synthetic recovery excludes a cooling account and bounds a waiting-room herd', async () => {
  const nowMs = Date.now();
  const governor = new ContinuousTokenBucketRateGovernor();
  const accounts = [
    makeAccount('cooling', governor, nowMs, {
      status: 'cooldown',
      bucket: governor.createDefaultBucket(10_000_000, 0, 10_000, nowMs)
    }),
    makeAccount('healthy', governor, nowMs)
  ];
  accounts[0] = { ...accounts[0], cooldownUntilMs: nowMs + 60_000 };
  const substrate = syntheticSubstrate(accounts);
  const pool = new GalxCredentialPool(
    substrate as any,
    governor,
    new GalxCircuitBreaker(),
    'adaptive_headroom',
    { isAuthorityConfigured: () => false } as any
  );

  const selected: Array<{ leaseId: string; shardId: string }> = [];
  for (let i = 0; i < 50; i++) {
    const result = pool.acquireLease({
      userId: `recovery-tenant-${i}`,
      jobId: `recovery-job-${i}`,
      provider: 'openai',
      estimatedTokens: 100,
      maxInFlightPerShard: 100,
      queueIfExhausted: false,
      nowMs
    });
    assert.ok(result.lease);
    selected.push(result.lease!);
    pool.releaseLease(result.lease!.leaseId, { tokensConsumed: 100, success: true, nowMs });
  }
  assert.ok(selected.every(lease => lease.shardId === 'healthy'));

  const held = pool.acquireLease({
    userId: 'waiting-tenant',
    jobId: 'waiting-held',
    provider: 'openai',
    estimatedTokens: 100,
    maxInFlightPerShard: 1,
    leaseTtlMs: 100,
    queueIfExhausted: false,
    nowMs
  });
  assert.ok(held.lease);

  const attempts = Array.from({ length: 600 }, (_, i) => pool.acquireLease({
    userId: `waiting-${i}`,
    jobId: `waiting-${i}`,
    provider: 'openai',
    estimatedTokens: 100,
    maxInFlightPerShard: 1,
    deadlineMs: nowMs + 250,
    queueIfExhausted: true,
    nowMs
  }));
  const queued = attempts.filter(result => result.status === 'queued');
  const shed = attempts.filter(result => result.status === 'shed_overflow');
  assert.equal(queued.length, 500, 'the waiting room must stay bounded');
  assert.equal(shed.length, 100, 'excess callers must be shed with an explicit bounded-capacity result');

  pool.drainAdmissionQueue(nowMs + 1_000);
  const settled = await Promise.all(queued.map(result => result.queuedPromise));
  assert.ok(settled.every(result => result?.status === 'queue_timeout'));
  pool.releaseLease(held.lease!.leaseId, { tokensConsumed: 100, success: true, nowMs: nowMs + 1_000 });
});

test('synthetic waiting-room wake-up drains expired capacity without a provider request', async () => {
  const nowMs = Date.now();
  const bounded = makePool(1, nowMs, 'adaptive_headroom', governor =>
    governor.createDefaultBucket(10_000, 0, 1, nowMs)
  );
  const held = bounded.pool.acquireLease({
    userId: 'wake-held',
    jobId: 'wake-held',
    provider: 'openai',
    estimatedTokens: 100,
    maxInFlightPerShard: 1,
    leaseTtlMs: 40,
    queueIfExhausted: false,
    nowMs
  });
  assert.ok(held.lease);

  const queued = bounded.pool.acquireLease({
    userId: 'wake-next',
    jobId: 'wake-next',
    provider: 'openai',
    estimatedTokens: 100,
    maxInFlightPerShard: 1,
    deadlineMs: nowMs + 500,
    queueIfExhausted: true,
    nowMs
  });
  assert.equal(queued.status, 'queued');

  let timeout!: NodeJS.Timeout;
  const timeoutGuard = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('admission wake-up did not fire')), 1_000);
  });
  const result = await Promise.race([queued.queuedPromise!, timeoutGuard]);
  clearTimeout(timeout);
  assert.ok(result.lease);
  assert.equal(bounded.pool.releaseLease(result.lease!.leaseId, { tokensConsumed: 100, success: true }), true);
});

test('synthetic queue warfare keeps the bounded waiting room safe at every edge', async () => {
  const report = await runQueueWarfare();
  assert.deepEqual(report.cases.map(item => [item.target, item.queued, item.shed]), [
    [499, 499, 0],
    [500, 500, 0],
    [501, 500, 1]
  ]);
  assert.equal(report.maxQueueDepth, 500);
  assert.equal(report.drainCycles, 4);
  console.log(`[relay-load] queue-war ${JSON.stringify(report)}`);
});

test('synthetic seeded state machines survive hostile quota, lease, timing, and recovery transitions', () => {
  const config = RELAY_LOAD_TIER_CONFIG[RELAY_LOAD_TIER];
  const stateMachines = runSeededStateMachines();
  const expectedSeeds = process.env.RELAY_LOAD_SEED
    ? [Number(process.env.RELAY_LOAD_SEED)]
    : config.stateMachineSeeds;
  assert.deepEqual(stateMachines.seeds, expectedSeeds);
  assert.equal(stateMachines.reports.length, expectedSeeds.length);
  assert.ok(stateMachines.invariants >= expectedSeeds.length * config.stateMachineOperations);
  console.log(`[relay-load] state-machines ${JSON.stringify(stateMachines)}`);
});

test('synthetic MMO traffic remains bounded and makes progress through account recovery', () => {
  const report = runSyntheticMmo();
  const summary = report.report as { admitted: number; queued: number; maxQueueDepth: number; fairnessJain: number; invariantChecks: number };
  assert.ok(report.operations > 0);
  assert.ok(summary.admitted > 0);
  assert.ok(summary.queued > 0, 'heterogeneous users should exercise the synthetic waiting room');
  assert.ok(summary.maxQueueDepth <= 500);
  assert.ok(summary.fairnessJain > 0.35, 'healthy capacity must continue to make progress');
  assert.ok(summary.invariantChecks >= RELAY_LOAD_TIER_CONFIG[RELAY_LOAD_TIER].mmoTicks);
  console.log(`[relay-load] mmo ${JSON.stringify(report)}`);
});

test('synthetic hostile fairness and scheduler races preserve progress without dispatch', () => {
  const fairness = runHostileFairness();
  const races = runStandardSchedulerRaceChecks();
  assert.ok(Object.values(fairness.counts).every(count => count > 0));
  assert.ok(fairness.fairness > 0.65);
  assert.equal(races.maxReservations, 9);
  assert.equal(races.releasesOutOfOrder, 9);
  console.log(`[relay-load] fairness-races ${JSON.stringify({ fairness, races })}`);
});

test('synthetic quota boundary attacks reject stale and over-limit admissions', () => {
  const report = runQuotaBoundaryAttacks();
  assert.equal(report.limitMinusOne, true);
  assert.equal(report.exactLimit, true);
  assert.equal(report.limitPlusOneRejected, true);
  assert.equal(report.simultaneousFinalSlotLeases, 1);
  assert.equal(report.eligibilityAdmissionRaceRejected, true);
  console.log(`[relay-load] quota-boundaries ${JSON.stringify(report)}`);
});
