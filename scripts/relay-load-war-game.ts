import assert from 'node:assert/strict';
import type {
  CircuitFailureClassification,
  CredentialStatus,
  GalxShardAccount,
  GalxRotationStrategy,
  ShardAcquisitionResult,
  ShardLease,
  TokenBucketState
} from '../src/core/contracts/GalxContracts.js';
import { GalxCircuitBreaker } from '../src/core/circuit/GalxCircuitBreaker.js';
import { ContinuousTokenBucketRateGovernor } from '../src/core/governor/ContinuousTokenBucketRateGovernor.js';
import { GalxCredentialPool } from '../src/core/pool/GalxCredentialPool.js';
import { PoolScheduler } from '../src/relay/pool-scheduler.js';

/**
 * This file is deliberately a closed-world simulator. It has no provider
 * adapter, no network client, and no authority repository. The pool is driven
 * with synthetic accounts and a fake clock so a failing seed is replayable.
 */

export type RelayLoadTier = 'smoke' | 'stress' | 'war';

const SYNTHETIC_EPOCH_MS = 1_700_000_000_000;
const MAX_SYNTHETIC_QUEUE_DEPTH = 500;

export const RELAY_LOAD_TIER: RelayLoadTier = (() => {
  const requested = process.env.RELAY_LOAD_TIER;
  if (requested === 'stress' || requested === 'war') return requested;
  return 'smoke';
})();

export const RELAY_LOAD_TIER_CONFIG: Record<RelayLoadTier, {
  stateMachineSeeds: number[];
  stateMachineOperations: number;
  mmoTicks: number;
  mmoUsers: number;
  expectedMinimumOperations: number;
}> = {
  smoke: {
    stateMachineSeeds: [0x51a7e, 0xc0ffee],
    stateMachineOperations: 1_800,
    mmoTicks: 500,
    mmoUsers: 42,
    expectedMinimumOperations: 2_000
  },
  stress: {
    stateMachineSeeds: [0x51a7e, 0xc0ffee, 0xdecade, 0x7eadbeef],
    stateMachineOperations: 6_000,
    mmoTicks: 600,
    mmoUsers: 60,
    expectedMinimumOperations: 20_000
  },
  war: {
    stateMachineSeeds: [0x51a7e, 0xc0ffee, 0xdecade, 0x7eadbeef, 0x13579, 0x2468a],
    stateMachineOperations: 10_000,
    mmoTicks: 800,
    mmoUsers: 90,
    expectedMinimumOperations: 60_000
  }
};

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 0x1_0000_0000;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(values: readonly T[]): T {
    assert.ok(values.length > 0, 'a seeded picker requires at least one value');
    return values[this.int(0, values.length - 1)];
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/**
 * The production circuit breaker intentionally adds jitter. War-game seeds
 * need a stable replay, so this test-only breaker preserves the same failure
 * classes while making synthetic backoff deterministic.
 */
class DeterministicCircuitBreaker extends GalxCircuitBreaker {
  override dissectUpstreamError(
    statusCode: number,
    errorBody: string,
    headers?: Record<string, string | number | undefined>,
    nowMs = Date.now(),
    account?: GalxShardAccount
  ): CircuitFailureClassification {
    const currentStatus = account?.status || 'healthy';
    const retryAfter = headers?.['retry-after'];
    if (statusCode === 429) {
      const cooldownMs = typeof retryAfter === 'number'
        ? Math.max(1_000, retryAfter * 1_000)
        : typeof retryAfter === 'string' && /^\d+(?:\.\d+)?$/.test(retryAfter.trim())
          ? Math.max(1_000, Number(retryAfter) * 1_000)
          : 30_000;
      return {
        newStatus: 'cooldown',
        cooldownMs,
        isPermanent: false,
        category: 'tpm_rpm_rate_limited',
        resetAtTimestampMs: nowMs + cooldownMs,
        reason: 'Synthetic deterministic quota response.'
      };
    }
    if (statusCode === 408 || statusCode >= 500) {
      const consecutive = (account?.stats?.consecutiveFailures || 0) + 1;
      const recovering = ['half_open', 'cooldown', 'exhausted'].includes(currentStatus);
      if (!recovering && consecutive < 3 && !retryAfter) {
        return {
          newStatus: currentStatus,
          isPermanent: false,
          category: statusCode === 408 ? 'socket_timeout' : 'transient_5xx',
          reason: 'Synthetic transient failure; health remains available.'
        };
      }
      const cooldownMs = retryAfter ? 1_000 : Math.min(300_000, 15_000 * 2 ** Math.min(4, consecutive - 1));
      return {
        newStatus: 'cooldown',
        cooldownMs,
        isPermanent: false,
        category: statusCode === 408 ? 'socket_timeout' : 'origin_overloaded',
        resetAtTimestampMs: nowMs + cooldownMs,
        reason: 'Synthetic deterministic transient failure.'
      };
    }
    return super.dissectUpstreamError(statusCode, errorBody, headers, nowMs, account);
  }
}

class FakeClock {
  public nowMs: number;

  constructor(startMs = SYNTHETIC_EPOCH_MS) {
    this.nowMs = startMs;
  }

  advance(deltaMs: number): void {
    assert.ok(deltaMs >= 0, 'the synthetic clock cannot run backwards');
    this.nowMs += deltaMs;
  }
}

type TerminalRequestState = 'completed' | 'failed' | 'cancelled' | 'expired' | 'rejected' | 'shed';
type RequestState = 'arrived' | 'admitted' | 'queued' | TerminalRequestState;

type SyntheticRequest = {
  id: string;
  userId: string;
  state: RequestState;
  estimatedTokens: number;
  arrivedAtMs: number;
  leaseId?: string;
  shardId?: string;
  terminalAtMs?: number;
  profile?: MmoProfile;
};

type ActiveRequest = SyntheticRequest & {
  state: 'admitted';
  leaseId: string;
  shardId: string;
  releaseAtMs: number;
  admissionLimit: number;
};

type WarMetrics = {
  operations: number;
  arrived: number;
  admitted: number;
  queued: number;
  rejected: number;
  shed: number;
  cancelled: number;
  expired: number;
  completed: number;
  failed: number;
  maxQueueDepth: number;
  maxConcurrentLeases: number;
  invariantChecks: number;
  invariantViolations: number;
  routed: Map<string, number>;
  recoveryAdmissions: Map<string, number>;
};

function createMetrics(accountIds: readonly string[]): WarMetrics {
  return {
    operations: 0,
    arrived: 0,
    admitted: 0,
    queued: 0,
    rejected: 0,
    shed: 0,
    cancelled: 0,
    expired: 0,
    completed: 0,
    failed: 0,
    maxQueueDepth: 0,
    maxConcurrentLeases: 0,
    invariantChecks: 0,
    invariantViolations: 0,
    routed: new Map(accountIds.map(id => [id, 0])),
    recoveryAdmissions: new Map(accountIds.map(id => [id, 0]))
  };
}

function queueDepth(pool: GalxCredentialPool): number {
  return ((pool as unknown as { admissionQueue: unknown[] }).admissionQueue || []).length;
}

function assertQueueQuiesced(pool: GalxCredentialPool): void {
  assert.equal(queueDepth(pool), 0);
  assert.equal((pool as any).admissionWakeTimer, undefined, 'an empty queue must not retain a wake-up timer');
  assert.equal((pool as any).admissionWakeAtMs, 0, 'an empty queue must not retain a wake-up deadline');
}

function jainFairness(values: readonly number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0 || values.length === 0) return 1;
  return (total * total) / (values.length * values.reduce((sum, value) => sum + value * value, 0));
}

function makeWarAccount(
  id: string,
  governor: ContinuousTokenBucketRateGovernor,
  nowMs: number,
  index: number,
  options: {
    weight?: number;
    status?: CredentialStatus;
    maxTokens?: number;
    maxRequests?: number;
    refillTokensPerMinute?: number;
  } = {}
): GalxShardAccount {
  const maxTokens = options.maxTokens ?? (70_000 + index * 19_000);
  const maxRequests = options.maxRequests ?? (360 + index * 41);
  return {
    id,
    userId: `war-owner-${id}`,
    provider: 'openai',
    authType: 'api_key',
    accountLabel: `Synthetic ${id}`,
    apiKeyMasked: 'synthetic',
    priority: 10 + (index % 4),
    weight: options.weight ?? (1 + index % 4),
    status: options.status ?? 'healthy',
    tokenBucket: governor.createDefaultBucket(
      maxTokens,
      options.refillTokensPerMinute ?? Math.max(1_000, Math.floor(maxTokens / 3)),
      maxRequests,
      nowMs
    ),
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

function createSyntheticPool(options: {
  count: number;
  nowMs: number;
  strategy?: GalxRotationStrategy;
  bucketFactory?: (governor: ContinuousTokenBucketRateGovernor, index: number) => TokenBucketState;
  weights?: number[];
  circuitBreaker?: GalxCircuitBreaker;
}): {
  pool: GalxCredentialPool;
  substrate: ReturnType<typeof createSyntheticSubstrate>;
  governor: ContinuousTokenBucketRateGovernor;
  accounts: GalxShardAccount[];
} {
  const governor = new ContinuousTokenBucketRateGovernor();
  const accounts = Array.from({ length: options.count }, (_, index) => {
    const account = makeWarAccount(`war-account-${index}`, governor, options.nowMs, index, {
      weight: options.weights?.[index],
      maxTokens: 90_000,
      maxRequests: 2_000,
      refillTokensPerMinute: 90_000
    });
    const bucket = options.bucketFactory?.(governor, index);
    return bucket ? { ...account, tokenBucket: bucket } : account;
  });
  const substrate = createSyntheticSubstrate(accounts);
  const pool = new GalxCredentialPool(
    substrate as any,
    governor,
    options.circuitBreaker ?? new DeterministicCircuitBreaker(),
    options.strategy ?? 'least_utilized',
    { isAuthorityConfigured: () => false } as any
  );
  return { pool, substrate, governor, accounts };
}

function createSyntheticSubstrate(accounts: GalxShardAccount[]) {
  const byId = new Map(accounts.map(account => [account.id, account]));
  return {
    accounts: byId,
    listAccounts: (_userId?: string, provider?: string) =>
      [...byId.values()].filter(account => !provider || account.provider === provider),
    getAccount: (id: string) => byId.get(id),
    updateAccount: (account: GalxShardAccount) => byId.set(account.id, account),
    onRetract: (_listener: (shardId: string) => void) => {}
  };
}

function isTerminal(state: RequestState): state is TerminalRequestState {
  return ['completed', 'failed', 'cancelled', 'expired', 'rejected', 'shed'].includes(state);
}

function prohibitedAtAdmission(account: GalxShardAccount, nowMs: number): boolean {
  const cooldownUntil = account.cooldownUntilTimestampMs || account.cooldownUntilMs || 0;
  return account.permissionRetracted
    || ['dead', 'paused', 'revoked', 'quarantined'].includes(account.status)
    || (['cooldown', 'exhausted'].includes(account.status) && cooldownUntil > nowMs);
}

class WarGameFailure extends Error {
  constructor(
    message: string,
    readonly details: {
      seed: number;
      operationIndex: number;
      eventTrace: string[];
      accountSnapshot: Array<Record<string, unknown>>;
      activeRequests: string[];
      queueDepth: number;
    }
  ) {
    super(`${message}\n${JSON.stringify(details, null, 2)}`);
    this.name = 'WarGameFailure';
  }
}

class SyntheticStateMachine {
  readonly clock = new FakeClock();
  readonly random: SeededRandom;
  readonly pool: GalxCredentialPool;
  readonly substrate: ReturnType<typeof createSyntheticSubstrate>;
  readonly accounts: GalxShardAccount[];
  readonly metrics: WarMetrics;
  readonly records = new Map<string, SyntheticRequest>();
  readonly active = new Map<string, ActiveRequest>();
  readonly recoveryAt = new Map<string, number>();
  readonly eventTrace: string[] = [];
  readonly seed: number;
  readonly maxInFlightPerShard: number;
  private sequence = 0;
  private operationIndex = 0;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.random = new SeededRandom(this.seed);
    const created = createSyntheticPool({ count: 8, nowMs: this.clock.nowMs, strategy: 'least_utilized' });
    this.pool = created.pool;
    this.substrate = created.substrate;
    this.accounts = created.accounts;
    this.metrics = createMetrics(this.accounts.map(account => account.id));
    this.maxInFlightPerShard = 8;
  }

  run(operationCount: number): WarMetrics {
    for (let index = 0; index < operationCount; index++) {
      this.operationIndex = index;
      this.metrics.operations++;
      this.advanceForTrafficShape(index);
      this.recoverDueAccounts();
      this.expireDueLeases();

      const activePressure = this.active.size > this.accounts.length * 3;
      const operation = activePressure
        ? this.random.pick(['ARRIVE', 'ARRIVE', 'RELEASE', 'CANCEL', 'EXPIRE', 'DEplete', 'RECOVER', 'WAKE'] as const)
        : this.random.pick(['ARRIVE', 'ARRIVE', 'ARRIVE', 'RELEASE', 'DEplete', 'RECOVER', 'COOLDOWN', 'FAULT', 'WAKE'] as const);
      this.eventTrace.push(`${index}:${operation}:t=${this.clock.nowMs}`);
      switch (operation) {
        case 'ARRIVE': this.arrive(); break;
        case 'RELEASE': this.releaseOne('success'); break;
        case 'CANCEL': this.releaseOne('cancel'); break;
        case 'EXPIRE': this.forceExpiry(); break;
        case 'DEplete': this.depleteOneAccount(); break;
        case 'RECOVER': this.recoverOneAccount(); break;
        case 'COOLDOWN': this.cooldownOneAccount(); break;
        case 'FAULT': this.releaseOne(this.random.pick(['429', 'timeout', '5xx'] as const)); break;
        case 'WAKE': this.pool.drainAdmissionQueue(this.clock.nowMs); break;
      }
      this.checkInvariants(`after ${operation}`);
    }

    this.clock.advance(120_000);
    this.recoverDueAccounts();
    this.expireDueLeases();
    this.pool.drainAdmissionQueue(this.clock.nowMs);
    this.checkInvariants('after traffic drain');
    if (this.active.size !== 0 || this.pool.getActiveLeasesCount() !== 0) {
      this.fail('scheduler did not quiesce after synthetic traffic stopped');
    }
    if (queueDepth(this.pool) !== 0) this.fail('synthetic state machine left queue entries behind');
    if ([...this.records.values()].some(request => !isTerminal(request.state))) {
      this.fail('synthetic state machine left a request without a terminal state');
    }
    return this.metrics;
  }

  private advanceForTrafficShape(index: number): void {
    const phase = index % 720;
    if (phase < 48) this.clock.advance(0); // synchronized thundering herd
    else if (phase < 180) this.clock.advance(this.random.int(1, 4)); // rising staircase
    else if (phase < 330) this.clock.advance(this.random.int(8, 20)); // sustained saturation
    else if (phase < 420) this.clock.advance(1_000); // quiet period
    else if (phase < 540) this.clock.advance(0); // burst immediately after silence
    else this.clock.advance(this.random.int(25, 80));
  }

  private arrive(): void {
    const id = `sm-${this.seed.toString(16)}-${this.sequence++}`;
    const estimatedTokens = this.random.pick([1, 8, 25, 100, 400, 1_500, 4_000]);
    const userId = `synthetic-user-${this.random.int(0, 31)}`;
    const request: SyntheticRequest = {
      id,
      userId,
      state: 'arrived',
      estimatedTokens,
      arrivedAtMs: this.clock.nowMs
    };
    this.records.set(id, request);
    this.metrics.arrived++;

    if (this.random.chance(0.07)) {
      this.terminal(request, 'cancelled');
      return;
    }

    const accountStates = new Map(this.accounts.map(account => [account.id, account]));
    const result = this.pool.acquireLease({
      userId,
      jobId: id,
      provider: 'openai',
      estimatedTokens,
      maxInFlightPerShard: this.maxInFlightPerShard,
      maxTenantPooledInFlight: 12,
      leaseTtlMs: this.random.int(30, 260),
      queueIfExhausted: false,
      nowMs: this.clock.nowMs
    });
    if (result.lease) {
      const accountBeforeAdmission = accountStates.get(result.lease.shardId)!;
      if (prohibitedAtAdmission(accountBeforeAdmission, this.clock.nowMs)) {
        this.fail(`prohibited account ${result.lease.shardId} admitted request ${id}`);
      }
      request.state = 'admitted';
      request.leaseId = result.lease.leaseId;
      request.shardId = result.lease.shardId;
      const admissionLimit = this.pool.calculateAdaptiveInFlightLimit(accountBeforeAdmission, this.maxInFlightPerShard);
      if (this.pool.getInFlightCount(result.lease.shardId) > admissionLimit) {
        this.fail(`request ${id} exceeded the account's admission ceiling at acquisition`);
      }
      const active = request as ActiveRequest;
      active.state = 'admitted';
      active.leaseId = result.lease.leaseId;
      active.shardId = result.lease.shardId;
      active.releaseAtMs = this.clock.nowMs + this.random.int(5, 240);
      active.admissionLimit = admissionLimit;
      this.active.set(id, active);
      this.metrics.admitted++;
      this.metrics.routed.set(result.lease.shardId, (this.metrics.routed.get(result.lease.shardId) || 0) + 1);
      if (this.recoveryAt.has(result.lease.shardId)) {
        this.metrics.recoveryAdmissions.set(
          result.lease.shardId,
          (this.metrics.recoveryAdmissions.get(result.lease.shardId) || 0) + 1
        );
      }
    } else {
      this.terminal(request, result.status === 'shed_overflow' ? 'shed' : 'rejected');
    }
  }

  private releaseOne(kind: 'success' | 'cancel' | '429' | 'timeout' | '5xx'): void {
    const candidates = [...this.active.values()];
    if (candidates.length === 0) return;
    const active = this.random.pick(candidates);
    if (kind === 'timeout') {
      this.clock.advance(Math.max(0, active.releaseAtMs - this.clock.nowMs) + 1);
      this.expireDueLeases();
      return;
    }

    const options = kind === 'cancel'
      ? { tokensConsumed: 0, success: false, statusCode: 499, errorReason: 'client_cancelled', healthImpact: 'neutral' as const, nowMs: this.clock.nowMs }
      : kind === '429'
        ? { tokensConsumed: 0, success: false, statusCode: 429, errorReason: 'synthetic quota response', upstreamHeaders: { 'retry-after': '1' }, nowMs: this.clock.nowMs }
        : kind === '5xx'
          ? { tokensConsumed: 0, success: false, statusCode: 503, errorReason: 'synthetic upstream overload', nowMs: this.clock.nowMs }
          : { tokensConsumed: Math.floor(active.estimatedTokens * (0.3 + this.random.next() * 0.7)), success: true, latencyMs: this.random.int(10, 2_400), nowMs: this.clock.nowMs };
    const released = this.pool.releaseLease(active.leaseId, options);
    if (!released) {
      if (this.pool.isLeaseValid(active.leaseId, this.clock.nowMs)) {
        this.fail(`active lease ${active.leaseId} disappeared before release`);
      }
      this.terminal(active, 'expired');
      this.active.delete(active.id);
      return;
    }
    this.active.delete(active.id);
    this.terminal(active, kind === 'cancel' ? 'cancelled' : kind === 'success' ? 'completed' : 'failed');
  }

  private forceExpiry(): void {
    const candidates = [...this.active.values()];
    if (candidates.length === 0) return;
    const selected = this.random.pick(candidates);
    this.clock.advance(Math.max(0, selected.releaseAtMs - this.clock.nowMs) + 1);
    this.expireDueLeases();
  }

  private expireDueLeases(): void {
    this.pool.scavengeExpiredLeases(this.clock.nowMs);
    for (const active of [...this.active.values()]) {
      if (this.clock.nowMs >= active.releaseAtMs || !this.pool.isLeaseValid(active.leaseId, this.clock.nowMs)) {
        if (this.pool.isLeaseValid(active.leaseId, this.clock.nowMs)) continue;
        this.active.delete(active.id);
        this.terminal(active, 'expired');
      }
    }
  }

  private depleteOneAccount(): void {
    const account = this.random.pick(this.accounts);
    const current = this.substrate.getAccount(account.id)!;
    const next: GalxShardAccount = {
      ...current,
      status: 'exhausted',
      cooldownUntilMs: this.clock.nowMs + this.random.int(20, 240),
      tokenBucket: {
        ...current.tokenBucket,
        remainingTokens: Math.min(current.tokenBucket.remainingTokens, 0),
        remainingRequests: Math.min(current.tokenBucket.remainingRequests, 0)
      },
      updatedAtMs: this.clock.nowMs
    };
    this.substrate.updateAccount(next);
    this.recoveryAt.set(account.id, next.cooldownUntilMs!);
  }

  private cooldownOneAccount(): void {
    const account = this.random.pick(this.accounts);
    const current = this.substrate.getAccount(account.id)!;
    const until = this.clock.nowMs + this.random.int(15, 200);
    this.substrate.updateAccount({ ...current, status: 'cooldown', cooldownUntilMs: until, updatedAtMs: this.clock.nowMs });
    this.recoveryAt.set(account.id, until);
  }

  private recoverOneAccount(): void {
    const account = this.random.pick(this.accounts);
    this.recoverAccount(account.id);
  }

  private recoverDueAccounts(): void {
    for (const [accountId, recoverAt] of this.recoveryAt.entries()) {
      if (this.clock.nowMs >= recoverAt) {
        this.recoverAccount(accountId);
        this.recoveryAt.delete(accountId);
      }
    }
  }

  private recoverAccount(accountId: string): void {
    const current = this.substrate.getAccount(accountId);
    if (!current) return;
    this.substrate.updateAccount({
      ...current,
      status: 'healthy',
      cooldownUntilMs: undefined,
      cooldownUntilTimestampMs: undefined,
      tokenBucket: {
        ...current.tokenBucket,
        remainingTokens: current.tokenBucket.maxTokens,
        remainingRequests: current.tokenBucket.maxRequests,
        reservedTokens: current.tokenBucket.reservedTokens || 0,
        lastRefillTimestampMs: this.clock.nowMs
      },
      updatedAtMs: this.clock.nowMs
    });
  }

  private terminal(request: SyntheticRequest, state: TerminalRequestState): void {
    if (isTerminal(request.state)) {
      this.fail(`request ${request.id} reached terminal state twice (${request.state} -> ${state})`);
    }
    request.state = state;
    request.terminalAtMs = this.clock.nowMs;
    if (state === 'cancelled') this.metrics.cancelled++;
    else if (state === 'expired') this.metrics.expired++;
    else if (state === 'completed') this.metrics.completed++;
    else if (state === 'failed') this.metrics.failed++;
    else if (state === 'rejected') this.metrics.rejected++;
    else if (state === 'shed') this.metrics.shed++;
  }

  private checkInvariants(label: string): void {
    this.metrics.invariantChecks++;
    const depth = queueDepth(this.pool);
    this.metrics.maxQueueDepth = Math.max(this.metrics.maxQueueDepth, depth);
    this.metrics.maxConcurrentLeases = Math.max(this.metrics.maxConcurrentLeases, this.pool.getActiveLeasesCount());
    if (depth > MAX_SYNTHETIC_QUEUE_DEPTH) this.fail(`${label}: admission queue exceeded ${MAX_SYNTHETIC_QUEUE_DEPTH}`);
    if (this.pool.getActiveLeasesCount() !== this.active.size) {
      this.fail(`${label}: tracked active lease count diverged from pool state`);
    }
    const leaseIds = [...this.active.values()].map(active => active.leaseId);
    if (new Set(leaseIds).size !== leaseIds.length) this.fail(`${label}: one lease was admitted twice`);

    for (const account of this.accounts) {
      const current = this.substrate.getAccount(account.id)!;
      const inFlight = this.pool.getInFlightCount(account.id);
      const currentLimit = this.pool.calculateAdaptiveInFlightLimit(current, this.maxInFlightPerShard);
      const activeLimits = [...this.active.values()]
        .filter(active => active.shardId === account.id)
        .map(active => active.admissionLimit);
      const limit = Math.max(currentLimit, ...activeLimits, 0);
      if (inFlight < 0 || inFlight > limit) this.fail(`${label}: ${account.id} exceeded in-flight capacity`);
      const bucket = current.tokenBucket;
      const reserved = bucket.reservedTokens || 0;
      if (reserved < 0 || reserved > bucket.maxTokens || bucket.remainingTokens < 0 || bucket.remainingRequests < 0) {
        this.fail(`${label}: ${account.id} has invalid token/request accounting`);
      }
      // Request tokens are committed on settlement while in-flight leases are
      // the local reservation. A settled request can therefore lower
      // remainingRequests while another lease is still in flight; the
      // admission boundary is checked before each new lease instead of
      // treating that legitimate overlap as accounting drift.
    }

    for (const request of this.records.values()) {
      if (request.state === 'admitted' && !this.active.has(request.id)) {
        this.fail(`${label}: admitted request ${request.id} has no active lease`);
      }
      if (isTerminal(request.state) && this.active.has(request.id)) {
        this.fail(`${label}: terminal request ${request.id} still owns a lease`);
      }
    }
  }

  private fail(message: string): never {
    this.metrics.invariantViolations++;
    throw new WarGameFailure(message, {
      seed: this.seed,
      operationIndex: this.operationIndex,
      eventTrace: this.eventTrace.slice(-120),
      accountSnapshot: this.accounts.map(account => {
        const current = this.substrate.getAccount(account.id)!;
        return {
          id: current.id,
          status: current.status,
          inFlight: this.pool.getInFlightCount(current.id),
          remainingTokens: current.tokenBucket.remainingTokens,
          reservedTokens: current.tokenBucket.reservedTokens || 0,
          remainingRequests: current.tokenBucket.remainingRequests,
          cooldownUntilMs: current.cooldownUntilMs
        };
      }),
      activeRequests: [...this.active.values()].map(request => `${request.id}:${request.leaseId}:${request.shardId}`),
      queueDepth: queueDepth(this.pool)
    });
  }
}

type MmoProfile = 'occasional' | 'bursty' | 'sustained' | 'cancellation-heavy' | 'high-cost' | 'low-cost';

type MmoUser = {
  id: string;
  profile: MmoProfile;
  burstUntilTick: number;
};

type PendingMmoRequest = SyntheticRequest & {
  state: 'queued';
  deadlineTick: number;
};

class SyntheticMmo {
  readonly clock = new FakeClock();
  readonly random: SeededRandom;
  readonly pool: GalxCredentialPool;
  readonly substrate: ReturnType<typeof createSyntheticSubstrate>;
  readonly accounts: GalxShardAccount[];
  readonly metrics: WarMetrics;
  readonly records = new Map<string, SyntheticRequest>();
  readonly active = new Map<string, ActiveRequest>();
  readonly pending: PendingMmoRequest[] = [];
  readonly users: MmoUser[];
  readonly recoveryAt = new Map<string, number>();
  readonly recoveredAt = new Map<string, number>();
  readonly recoveryAdmissions = new Map<string, number>();
  readonly seed: number;
  readonly eventTrace: string[] = [];
  readonly maxInFlightPerShard = 8;
  private sequence = 0;
  private tick = 0;
  private invariantChecks = 0;

  constructor(seed: number, userCount: number) {
    this.seed = seed >>> 0;
    this.random = new SeededRandom(this.seed ^ 0xa5a5a5a5);
    const created = createSyntheticPool({
      count: 9,
      nowMs: this.clock.nowMs,
      strategy: 'smooth_weighted_round_robin',
      weights: [1, 1, 2, 2, 3, 3, 4, 5, 7]
    });
    this.pool = created.pool;
    this.substrate = created.substrate;
    this.accounts = created.accounts;
    this.metrics = createMetrics(this.accounts.map(account => account.id));
    this.users = Array.from({ length: userCount }, (_, index) => ({
      id: `mmo-user-${index}`,
      profile: (['occasional', 'bursty', 'sustained', 'cancellation-heavy', 'high-cost', 'low-cost'] as const)[index % 6],
      burstUntilTick: -1
    }));
  }

  run(ticks: number): {
    metrics: WarMetrics;
    fairness: number;
    pendingAtDrain: number;
    operations: number;
  } {
    for (this.tick = 0; this.tick < ticks; this.tick++) {
      this.clock.advance(this.tick % 700 < 30 ? 0 : this.tick % 700 < 300 ? 5 : this.tick % 700 < 480 ? 25 : 700);
      this.eventTrace.push(`tick=${this.tick}:t=${this.clock.nowMs}:pending=${this.pending.length}:active=${this.active.size}`);
      this.transitionAccounts();
      this.expireLeases();
      this.drainSyntheticQueue();

      for (const user of this.users) {
        if (this.shouldArrive(user)) this.arrive(user);
      }
      this.drainSyntheticQueue();
      this.checkInvariants('MMO tick');
    }

    this.clock.advance(120_000);
    this.expireLeases();
    for (const pending of [...this.pending]) {
      this.terminal(pending, 'expired');
    }
    this.pending.length = 0;
    this.expireLeases();
    this.checkInvariants('MMO drain');
    assert.equal(this.active.size, 0, 'MMO active leases must quiesce after traffic stops');
    assert.equal(this.pool.getActiveLeasesCount(), 0, 'MMO pool leases must quiesce after traffic stops');
    assert.equal(this.pending.length, 0, 'MMO pending queue must drain after traffic stops');
    assert.ok([...this.records.values()].every(request => isTerminal(request.state)), 'MMO requests must have exactly one terminal state');

    const distribution = [...this.metrics.routed.values()];
    return {
      metrics: this.metrics,
      fairness: jainFairness(distribution),
      pendingAtDrain: this.metrics.maxQueueDepth,
      operations: this.metrics.operations
    };
  }

  private shouldArrive(user: MmoUser): boolean {
    switch (user.profile) {
      case 'occasional': return this.tick % 37 === user.id.length % 11;
      case 'sustained': return true;
      case 'cancellation-heavy': return this.random.chance(0.62);
      case 'high-cost': return this.tick % 3 === 0;
      case 'low-cost': return this.random.chance(0.84);
      case 'bursty':
        if (this.tick >= user.burstUntilTick && this.random.chance(0.055)) {
          user.burstUntilTick = this.tick + this.random.int(5, 26);
        }
        return this.tick < user.burstUntilTick;
    }
  }

  private arrive(user: MmoUser): void {
    const id = `mmo-${this.seed.toString(16)}-${this.sequence++}`;
    const estimatedTokens = user.profile === 'high-cost'
      ? this.random.pick([3_000, 8_000, 15_000])
      : user.profile === 'low-cost'
        ? this.random.pick([1, 4, 12, 40])
        : this.random.pick([25, 100, 600, 1_500]);
    const request: SyntheticRequest = {
      id,
      userId: user.id,
      state: 'arrived',
      estimatedTokens,
      arrivedAtMs: this.clock.nowMs,
      profile: user.profile
    };
    this.records.set(id, request);
    this.metrics.operations++;
    this.metrics.arrived++;

    if (user.profile === 'cancellation-heavy' && this.random.chance(0.42)) {
      this.terminal(request, 'cancelled');
      return;
    }
    const result = this.attemptAdmission(request);
    if (result.lease) {
      this.admit(request, result.lease);
      return;
    }
    if (this.pending.length < MAX_SYNTHETIC_QUEUE_DEPTH && result.status === 'all_shards_cooldown') {
      request.state = 'queued';
      const pending = request as PendingMmoRequest;
      pending.deadlineTick = this.tick + this.random.int(4, 45);
      this.pending.push(pending);
      this.metrics.queued++;
      this.metrics.maxQueueDepth = Math.max(this.metrics.maxQueueDepth, this.pending.length);
      return;
    }
    this.terminal(request, 'shed');
  }

  private attemptAdmission(request: SyntheticRequest): ShardAcquisitionResult {
    return this.pool.acquireLease({
      userId: request.userId,
      jobId: request.id,
      provider: 'openai',
      estimatedTokens: request.estimatedTokens,
      maxInFlightPerShard: this.maxInFlightPerShard,
      maxTenantPooledInFlight: 15,
      leaseTtlMs: this.random.int(20, 190),
      queueIfExhausted: false,
      nowMs: this.clock.nowMs
    });
  }

  private admit(request: SyntheticRequest, lease: ShardLease): void {
    const account = this.substrate.getAccount(lease.shardId)!;
    if (prohibitedAtAdmission(account, this.clock.nowMs)) {
      throw new Error(`MMO admitted prohibited account ${lease.shardId}`);
    }
    request.state = 'admitted';
    request.leaseId = lease.leaseId;
    request.shardId = lease.shardId;
    const admissionLimit = this.pool.calculateAdaptiveInFlightLimit(account, this.maxInFlightPerShard);
    if (this.pool.getInFlightCount(lease.shardId) > admissionLimit) {
      throw new Error(`MMO request ${request.id} exceeded the account's admission ceiling at acquisition`);
    }
    const active = request as ActiveRequest;
    active.state = 'admitted';
    active.leaseId = lease.leaseId;
    active.shardId = lease.shardId;
    active.releaseAtMs = this.clock.nowMs + this.random.int(5, 180);
    active.admissionLimit = admissionLimit;
    this.active.set(request.id, active);
    this.metrics.admitted++;
    this.metrics.routed.set(lease.shardId, (this.metrics.routed.get(lease.shardId) || 0) + 1);
    if (this.recoveredAt.has(lease.shardId)) {
      this.metrics.recoveryAdmissions.set(lease.shardId, (this.metrics.recoveryAdmissions.get(lease.shardId) || 0) + 1);
    }
  }

  private drainSyntheticQueue(): void {
    const remaining: PendingMmoRequest[] = [];
    for (const pending of this.pending) {
      if (this.tick >= pending.deadlineTick) {
        this.terminal(pending, 'expired');
        continue;
      }
      if (pending.profile === 'cancellation-heavy' && this.random.chance(0.24)) {
        this.terminal(pending, 'cancelled');
        continue;
      }
      const result = this.attemptAdmission(pending);
      if (result.lease) {
        this.admit(pending, result.lease);
      } else if (result.status === 'all_shards_cooldown') {
        remaining.push(pending);
      } else {
        this.terminal(pending, 'shed');
      }
    }
    this.pending.length = 0;
    this.pending.push(...remaining);
  }

  private expireLeases(): void {
    for (const active of [...this.active.values()]) {
      if (this.clock.nowMs < active.releaseAtMs) continue;
      const kind = this.random.chance(active.profile === 'cancellation-heavy' ? 0.45 : 0.08)
        ? 'cancel'
        : this.random.chance(0.04) ? 'fault' : 'success';
      if (kind === 'cancel') {
        this.pool.releaseLease(active.leaseId, {
          tokensConsumed: 0,
          success: false,
          statusCode: 499,
          errorReason: 'client_cancelled',
          healthImpact: 'neutral',
          nowMs: this.clock.nowMs
        });
        this.terminal(active, 'cancelled');
      } else if (kind === 'fault') {
        this.pool.releaseLease(active.leaseId, {
          tokensConsumed: 0,
          success: false,
          statusCode: this.random.chance(0.5) ? 429 : 503,
          errorReason: 'synthetic fault injection',
          upstreamHeaders: { 'retry-after': '1' },
          nowMs: this.clock.nowMs
        });
        this.terminal(active, 'failed');
      } else {
        this.pool.releaseLease(active.leaseId, {
          tokensConsumed: Math.floor(active.estimatedTokens * (0.25 + this.random.next() * 0.75)),
          success: true,
          latencyMs: this.random.int(10, 1_800),
          nowMs: this.clock.nowMs
        });
        this.terminal(active, 'completed');
      }
      this.active.delete(active.id);
    }
    this.pool.scavengeExpiredLeases(this.clock.nowMs);
    for (const active of [...this.active.values()]) {
      if (!this.pool.isLeaseValid(active.leaseId, this.clock.nowMs)) {
        this.active.delete(active.id);
        this.terminal(active, 'expired');
      }
    }
  }

  private transitionAccounts(): void {
    for (const [id, recoverAt] of this.recoveryAt.entries()) {
      if (this.clock.nowMs < recoverAt) continue;
      const current = this.substrate.getAccount(id)!;
      this.substrate.updateAccount({ ...current, status: 'healthy', cooldownUntilMs: undefined, cooldownUntilTimestampMs: undefined, updatedAtMs: this.clock.nowMs });
      this.recoveryAt.delete(id);
      this.recoveredAt.set(id, this.tick);
    }
    if (this.tick % 113 === 0) {
      const account = this.accounts[(this.tick / 113) % this.accounts.length | 0];
      const current = this.substrate.getAccount(account.id)!;
      const until = this.clock.nowMs + 120;
      this.substrate.updateAccount({ ...current, status: 'cooldown', cooldownUntilMs: until, updatedAtMs: this.clock.nowMs });
      this.recoveryAt.set(account.id, until);
    }
    if (this.tick % 181 === 0) {
      const account = this.accounts[(this.tick / 181 + 3) % this.accounts.length | 0];
      const current = this.substrate.getAccount(account.id)!;
      const until = this.clock.nowMs + 90;
      this.substrate.updateAccount({ ...current, status: 'paused', cooldownUntilMs: until, updatedAtMs: this.clock.nowMs });
      this.recoveryAt.set(account.id, until);
    }
  }

  private terminal(request: SyntheticRequest, state: TerminalRequestState): void {
    if (isTerminal(request.state)) throw new Error(`MMO request ${request.id} reached terminal state twice`);
    request.state = state;
    request.terminalAtMs = this.clock.nowMs;
    if (state === 'cancelled') this.metrics.cancelled++;
    else if (state === 'expired') this.metrics.expired++;
    else if (state === 'completed') this.metrics.completed++;
    else if (state === 'failed') this.metrics.failed++;
    else if (state === 'rejected') this.metrics.rejected++;
    else if (state === 'shed') this.metrics.shed++;
  }

  private checkInvariants(label: string): void {
    this.invariantChecks++;
    const depth = this.pending.length;
    this.metrics.maxQueueDepth = Math.max(this.metrics.maxQueueDepth, depth);
    this.metrics.maxConcurrentLeases = Math.max(this.metrics.maxConcurrentLeases, this.pool.getActiveLeasesCount());
    if (depth > MAX_SYNTHETIC_QUEUE_DEPTH) throw new Error(`MMO ${label}: synthetic queue exceeded 500`);
    if (this.pool.getActiveLeasesCount() !== this.active.size) {
      throw new Error(`MMO ${label}: lease count drift pool=${this.pool.getActiveLeasesCount()} tracked=${this.active.size} poolIds=${JSON.stringify((this.pool as any).activeLeases ? [...(this.pool as any).activeLeases.keys()] : [])} trackedIds=${JSON.stringify([...this.active.values()].map(item => item.leaseId))}`);
    }
    const leaseIds = [...this.active.values()].map(active => active.leaseId);
    if (new Set(leaseIds).size !== leaseIds.length) throw new Error(`MMO ${label}: one lease was admitted twice`);
    for (const account of this.accounts) {
      const current = this.substrate.getAccount(account.id)!;
      const inFlight = this.pool.getInFlightCount(account.id);
      const currentLimit = this.pool.calculateAdaptiveInFlightLimit(current, this.maxInFlightPerShard);
      const activeLimits = [...this.active.values()]
        .filter(active => active.shardId === account.id)
        .map(active => active.admissionLimit);
      if (inFlight < 0 || inFlight > Math.max(currentLimit, ...activeLimits, 0)) {
        throw new Error(`MMO ${label}: ${account.id} exceeded capacity`);
      }
      const bucket = current.tokenBucket;
      if ((bucket.reservedTokens || 0) < 0 || (bucket.reservedTokens || 0) > bucket.maxTokens || bucket.remainingTokens < 0 || bucket.remainingRequests < 0) {
        throw new Error(`MMO ${label}: ${account.id} quota accounting drift`);
      }
    }
    for (const request of this.records.values()) {
      if (isTerminal(request.state) && (this.active.has(request.id) || this.pending.some(item => item.id === request.id))) {
        throw new Error(`MMO ${label}: terminal request ${request.id} remained scheduled`);
      }
    }
  }
}

type QueueCaseReport = {
  target: number;
  queued: number;
  shed: number;
  afterCancellation: number;
};

function queueRequest(
  pool: GalxCredentialPool,
  id: string,
  nowMs: number,
  controller?: AbortController,
  deadlineMs = nowMs + 60_000
): ShardAcquisitionResult {
  return pool.acquireLease({
    userId: `queue-user-${id}`,
    jobId: id,
    provider: 'openai',
    estimatedTokens: 10,
    maxInFlightPerShard: 1,
    leaseTtlMs: 60_000,
    deadlineMs,
    queueIfExhausted: true,
    signal: controller?.signal,
    nowMs
  });
}

async function settleQueued(results: ShardAcquisitionResult[]): Promise<ShardAcquisitionResult[]> {
  return Promise.all(results.map(result => result.queuedPromise!));
}

async function createHeldQueuePool(nowMs: number): Promise<{
  pool: GalxCredentialPool;
  held: ShardLease;
  substrate: ReturnType<typeof createSyntheticSubstrate>;
}> {
  return createHeldQueuePoolWithTtl(nowMs, 60_000);
}

async function createHeldQueuePoolWithTtl(nowMs: number, heldLeaseTtlMs: number): Promise<{
  pool: GalxCredentialPool;
  held: ShardLease;
  substrate: ReturnType<typeof createSyntheticSubstrate>;
}> {
  const created = createSyntheticPool({
    count: 1,
    nowMs,
    strategy: 'least_utilized',
    bucketFactory: governor => governor.createDefaultBucket(1_000_000, 0, 1_000_000, nowMs)
  });
  const held = created.pool.acquireLease({
    userId: 'queue-held-user',
    jobId: 'queue-held',
    provider: 'openai',
    estimatedTokens: 10,
    maxInFlightPerShard: 1,
    leaseTtlMs: heldLeaseTtlMs,
    queueIfExhausted: false,
    nowMs
  });
  assert.ok(held.lease, 'queue war must start with a held lease');
  return { pool: created.pool, held: held.lease, substrate: created.substrate };
}

export async function runQueueWarfare(): Promise<{
  cases: QueueCaseReport[];
  cancellationResults: number;
  deadlineResults: number;
  mixedDeadlineAdmissions: number;
  recoveryAdmissions: number;
  drainWhileArriving: number;
  drainCycles: number;
  maxQueueDepth: number;
}> {
  const nowMs = SYNTHETIC_EPOCH_MS;
  const cases: QueueCaseReport[] = [];
  let maxQueueDepth = 0;
  let deadlineResults = 0;
  let mixedDeadlineAdmissions = 0;
  let recoveryAdmissions = 0;
  let drainWhileArriving = 0;

  for (const target of [499, 500, 501]) {
    const { pool, held } = await createHeldQueuePool(nowMs);
    const controllers = Array.from({ length: target }, () => new AbortController());
    const results = controllers.map((controller, index) => queueRequest(pool, `exact-${target}-${index}`, nowMs, controller));
    const queued = results.filter(result => result.status === 'queued');
    const shed = results.filter(result => result.status === 'shed_overflow');
    maxQueueDepth = Math.max(maxQueueDepth, queueDepth(pool));
    assert.equal(queued.length, Math.min(target, 500));
    assert.equal(shed.length, Math.max(0, target - 500));
    assert.equal(queueDepth(pool), Math.min(target, 500));
    for (const controller of controllers) controller.abort();
    const settled = await settleQueued(queued);
    assert.ok(settled.every(result => result.status === 'cancelled'));
    assertQueueQuiesced(pool);
    assert.equal(pool.releaseLease(held.leaseId, { tokensConsumed: 0, success: true, nowMs }), true);
    cases.push({ target, queued: queued.length, shed: shed.length, afterCancellation: queueDepth(pool) });
  }

  const { pool, held } = await createHeldQueuePool(nowMs);
  const controllers = Array.from({ length: 500 }, () => new AbortController());
  const mass = controllers.map((controller, index) => queueRequest(pool, `mass-${index}`, nowMs, controller));
  assert.equal(queueDepth(pool), 500);
  for (const index of [...Array.from({ length: 40 }, (_, i) => i), ...Array.from({ length: 40 }, (_, i) => 230 + i), ...Array.from({ length: 40 }, (_, i) => 460 + i)]) {
    controllers[index].abort();
  }
  assert.equal(queueDepth(pool), 380);
  const lastController = new AbortController();
  const beforeAdmission = queueRequest(pool, 'cancel-before-admission', nowMs, lastController);
  assert.equal(beforeAdmission.status, 'queued');
  lastController.abort();
  assert.equal((await beforeAdmission.queuedPromise!).status, 'cancelled');
  assert.equal(queueDepth(pool), 380);
  const massQueued = mass.filter(result => result.status === 'queued');
  pool.drainAdmissionQueue(nowMs + 60_000);
  const deadlineSettled = await settleQueued(massQueued);
  assert.ok(deadlineSettled.every(result => result.status === 'queue_timeout' || result.status === 'cancelled'));
  deadlineResults = deadlineSettled.length;
  for (const controller of controllers) controller.abort();
  assertQueueQuiesced(pool);
  assert.equal(pool.releaseLease(held.leaseId, { tokensConsumed: 0, success: true, nowMs: nowMs + 60_000 }), true);

  // Mixed deadlines plus arrivals during a drain. The first wave expires in
  // one scheduler tick; the remaining wave is admitted one lease at a time
  // while new callers join the back of the waiting room.
  const mixedNow = nowMs + 80_000;
  const mixedSetup = await createHeldQueuePoolWithTtl(mixedNow, 1_000);
  const mixedEntries: Array<{ result: ShardAcquisitionResult; controller: AbortController }> = [];
  const mixedSettled: ShardAcquisitionResult[] = [];
  const releasedMixedLeases = new Set<string>();
  const addMixed = (id: string, deadlineMs: number): void => {
    const controller = new AbortController();
    const result = queueRequest(mixedSetup.pool, id, mixedNow, controller, deadlineMs);
    mixedEntries.push({ result, controller });
    if (result.status === 'queued') {
      result.queuedPromise!.then(settled => mixedSettled.push(settled));
    } else if (result.lease) {
      mixedDeadlineAdmissions++;
      releasedMixedLeases.add(result.lease.leaseId);
      assert.equal(mixedSetup.pool.releaseLease(result.lease.leaseId, { tokensConsumed: 0, success: true, nowMs: mixedNow }), true);
    }
  };
  for (let index = 0; index < 120; index++) {
    addMixed(`mixed-${index}`, mixedNow + (index % 3 === 0 ? 1_010 : 1_500));
  }
  assert.equal(queueDepth(mixedSetup.pool), 120);
  mixedSetup.pool.drainAdmissionQueue(mixedNow + 1_010);
  await Promise.resolve();
  assert.ok(mixedSettled.length >= 40, 'the simultaneous short deadlines must expire together');
  assert.ok(mixedSettled.filter(result => result.status === 'queue_timeout').length >= 40);

  assert.equal(mixedSetup.pool.isLeaseValid(mixedSetup.held.leaseId, mixedNow + 1_010), false);
  for (let cycle = 0; cycle < 180; cycle++) {
    if (cycle < 20) {
      addMixed(`mixed-new-${cycle}`, mixedNow + 2_000);
      drainWhileArriving++;
    }
    await Promise.resolve();
    for (const settled of mixedSettled.splice(0)) {
      if (settled.lease) {
        mixedDeadlineAdmissions++;
        releasedMixedLeases.add(settled.lease.leaseId);
        assert.equal(mixedSetup.pool.releaseLease(settled.lease.leaseId, { tokensConsumed: 0, success: true, nowMs: mixedNow + 12 + cycle }), true);
      }
    }
    mixedSetup.pool.drainAdmissionQueue(mixedNow + 1_012 + cycle);
    maxQueueDepth = Math.max(maxQueueDepth, queueDepth(mixedSetup.pool));
  }
  mixedSetup.pool.drainAdmissionQueue(mixedNow + 2_000);
  const mixedFinal = await settleQueued(mixedEntries.filter(entry => entry.result.status === 'queued').map(entry => entry.result));
  for (const settled of mixedFinal) {
    if (settled.lease) {
      mixedDeadlineAdmissions++;
      if (!releasedMixedLeases.has(settled.lease.leaseId)) {
        releasedMixedLeases.add(settled.lease.leaseId);
        assert.equal(mixedSetup.pool.releaseLease(settled.lease.leaseId, { tokensConsumed: 0, success: true, nowMs: mixedNow + 2_000 }), true);
      }
    }
  }
  for (const entry of mixedEntries) entry.controller.abort();
  assertQueueQuiesced(mixedSetup.pool);
  assert.ok(mixedDeadlineAdmissions > 0, 'mixed deadlines must make progress during queue drain');

  // Recovery while full: a healthy transition may admit work, but never more
  // than the released capacity. Remaining callers are explicitly cancelled.
  const recoveryNow = nowMs + 100_000;
  const recoverySetup = await createHeldQueuePoolWithTtl(recoveryNow, 1_000);
  const currentRecoveryAccount = recoverySetup.substrate.getAccount('war-account-0')!;
  recoverySetup.substrate.updateAccount({ ...currentRecoveryAccount, status: 'cooldown', cooldownUntilMs: recoveryNow + 50 });
  const recoveryControllers = Array.from({ length: 500 }, () => new AbortController());
  const recoveryResults = recoveryControllers.map((controller, index) => queueRequest(recoverySetup.pool, `recovery-${index}`, recoveryNow, controller, recoveryNow + 2_000));
  assert.equal(queueDepth(recoverySetup.pool), 500);
  recoverySetup.substrate.updateAccount({ ...recoverySetup.substrate.getAccount('war-account-0')!, status: 'healthy', cooldownUntilMs: undefined });
  assert.equal(recoverySetup.pool.releaseLease(recoverySetup.held.leaseId, { tokensConsumed: 0, success: true, nowMs: recoveryNow + 60 }), true);
  await Promise.resolve();
  const releasedRecoveryLeases = new Set<string>();
  const firstRecovery = await Promise.all(recoveryResults.filter(result => result.status === 'queued').slice(0, 1).map(result => result.queuedPromise!));
  recoveryAdmissions += firstRecovery.filter(result => !!result.lease).length;
  for (const result of firstRecovery) {
    if (result.lease) {
      releasedRecoveryLeases.add(result.lease.leaseId);
      assert.equal(recoverySetup.pool.releaseLease(result.lease.leaseId, { tokensConsumed: 0, success: true, nowMs: recoveryNow + 61 }), true);
    }
  }
  recoverySetup.pool.drainAdmissionQueue(recoveryNow + 500);
  const recoverySettled = await settleQueued(recoveryResults.filter(result => result.status === 'queued'));
  recoveryAdmissions += recoverySettled.filter(result => !!result.lease).length;
  for (const result of recoverySettled) {
    if (result.lease && !releasedRecoveryLeases.has(result.lease.leaseId)) {
      releasedRecoveryLeases.add(result.lease.leaseId);
      assert.equal(recoverySetup.pool.releaseLease(result.lease.leaseId, { tokensConsumed: 0, success: true, nowMs: recoveryNow + 500 }), true);
    }
  }
  for (const controller of recoveryControllers) controller.abort();
  assertQueueQuiesced(recoverySetup.pool);
  assert.ok(recoveryAdmissions >= 1, 'recovery must admit at least one waiting caller');

  let drainCycles = 0;
  for (let cycle = 0; cycle < 4; cycle++) {
    const cyclePool = await createHeldQueuePool(nowMs + cycle * 1_000);
    const cycleControllers = Array.from({ length: 500 }, () => new AbortController());
    const cycleResults = cycleControllers.map((controller, index) => queueRequest(cyclePool.pool, `cycle-${cycle}-${index}`, nowMs + cycle * 1_000, controller));
    maxQueueDepth = Math.max(maxQueueDepth, queueDepth(cyclePool.pool));
    for (const controller of cycleControllers) controller.abort();
    await settleQueued(cycleResults);
    assertQueueQuiesced(cyclePool.pool);
    assert.equal(cyclePool.pool.releaseLease(cyclePool.held.leaseId, { tokensConsumed: 0, success: true, nowMs }), true);
    drainCycles++;
  }

  return {
    cases,
    cancellationResults: 40 * 3 + 500,
    deadlineResults,
    mixedDeadlineAdmissions,
    recoveryAdmissions,
    drainWhileArriving,
    drainCycles,
    maxQueueDepth
  };
}

export function runSeededStateMachines(): {
  tier: RelayLoadTier;
  seeds: number[];
  operations: number;
  reports: Array<Record<string, unknown>>;
  invariants: number;
  routed: Record<string, number>;
} {
  const config = RELAY_LOAD_TIER_CONFIG[RELAY_LOAD_TIER];
  const requestedSeedText = process.env.RELAY_LOAD_SEED;
  const requestedSeed = requestedSeedText === undefined ? undefined : Number(requestedSeedText);
  if (requestedSeedText !== undefined && (!Number.isInteger(requestedSeed) || !config.stateMachineSeeds.includes(requestedSeed!))) {
    throw new Error(`RELAY_LOAD_SEED must match a configured ${RELAY_LOAD_TIER} seed: ${config.stateMachineSeeds.join(', ')}`);
  }
  const seeds = requestedSeed === undefined ? config.stateMachineSeeds : [requestedSeed];
  const reports: Array<Record<string, unknown>> = [];
  let operations = 0;
  let invariants = 0;
  const routed: Record<string, number> = {};
  for (const seed of seeds) {
    const game = new SyntheticStateMachine(seed);
    const metrics = game.run(config.stateMachineOperations);
    operations += metrics.operations;
    invariants += metrics.invariantChecks;
    for (const [accountId, count] of metrics.routed.entries()) routed[accountId] = (routed[accountId] || 0) + count;
    reports.push({
      seed,
      operations: metrics.operations,
      admitted: metrics.admitted,
      rejected: metrics.rejected,
      cancelled: metrics.cancelled,
      expired: metrics.expired,
      completed: metrics.completed,
      failed: metrics.failed,
      maxQueueDepth: metrics.maxQueueDepth,
      maxConcurrentLeases: metrics.maxConcurrentLeases,
      invariantChecks: metrics.invariantChecks
    });
  }
  return { tier: RELAY_LOAD_TIER, seeds, operations, reports, invariants, routed };
}

export function runSyntheticMmo(): {
  tier: RelayLoadTier;
  seed: number;
  users: number;
  ticks: number;
  operations: number;
  report: Record<string, unknown>;
} {
  const config = RELAY_LOAD_TIER_CONFIG[RELAY_LOAD_TIER];
  const seed = 0xfeedface ^ config.mmoUsers;
  const mmo = new SyntheticMmo(seed, config.mmoUsers);
  const result = mmo.run(config.mmoTicks);
  const routed = Object.fromEntries(result.metrics.routed.entries());
  const recovery = Object.fromEntries(result.metrics.recoveryAdmissions.entries());
  return {
    tier: RELAY_LOAD_TIER,
    seed,
    users: config.mmoUsers,
    ticks: config.mmoTicks,
    operations: result.operations,
    report: {
      admitted: result.metrics.admitted,
      queued: result.metrics.queued,
      rejectedOrShed: result.metrics.rejected + result.metrics.shed,
      cancelled: result.metrics.cancelled,
      expired: result.metrics.expired,
      completed: result.metrics.completed,
      failed: result.metrics.failed,
      perAccountRouting: routed,
      maxQueueDepth: result.metrics.maxQueueDepth,
      maxConcurrentLeases: result.metrics.maxConcurrentLeases,
      fairnessJain: jainFairness([...result.metrics.routed.values()]),
      recoveryBehavior: recovery,
      invariantChecks: mmo['invariantChecks']
    }
  };
}

export function runHostileFairness(): {
  operations: number;
  counts: Record<string, number>;
  fairness: number;
  recoveredAccountAdmissions: number;
} {
  const nowMs = SYNTHETIC_EPOCH_MS;
  const governor = new ContinuousTokenBucketRateGovernor();
  const accounts = [
    makeWarAccount('fair-1', governor, nowMs, 0, { weight: 1, maxTokens: 2_000_000, maxRequests: 20_000, refillTokensPerMinute: 2_000_000 }),
    makeWarAccount('fair-2', governor, nowMs, 1, { weight: 2, maxTokens: 2_000_000, maxRequests: 20_000, refillTokensPerMinute: 2_000_000 }),
    makeWarAccount('fair-3', governor, nowMs, 2, { weight: 4, maxTokens: 2_000_000, maxRequests: 20_000, refillTokensPerMinute: 2_000_000 })
  ];
  const substrate = createSyntheticSubstrate(accounts);
  const pool = new GalxCredentialPool(substrate as any, governor, new GalxCircuitBreaker(), 'smooth_weighted_round_robin', { isAuthorityConfigured: () => false } as any);
  const counts = new Map(accounts.map(account => [account.id, 0]));
  let recoveredAccountAdmissions = 0;
  let now = nowMs;
  for (let operation = 0; operation < 4_200; operation++) {
    now += operation % 120 < 20 ? 0 : 1;
    if (operation % 211 === 30) {
      const current = substrate.getAccount('fair-1')!;
      substrate.updateAccount({ ...current, status: 'cooldown', cooldownUntilMs: now + 35 });
    }
    if (operation % 211 === 70) {
      const current = substrate.getAccount('fair-1')!;
      substrate.updateAccount({ ...current, status: 'healthy', cooldownUntilMs: undefined });
      recoveredAccountAdmissions++;
    }
    if (operation % 337 === 60) {
      const current = substrate.getAccount('fair-2')!;
      substrate.updateAccount({ ...current, status: 'paused', cooldownUntilMs: now + 22 });
    }
    if (operation % 337 === 90) {
      const current = substrate.getAccount('fair-2')!;
      substrate.updateAccount({ ...current, status: 'healthy', cooldownUntilMs: undefined });
    }
    if (operation % 503 === 100) {
      const current = substrate.getAccount('fair-3')!;
      substrate.updateAccount({ ...current, status: 'exhausted', cooldownUntilMs: now + 18 });
    }
    if (operation % 503 === 130) {
      const current = substrate.getAccount('fair-3')!;
      substrate.updateAccount({ ...current, status: 'healthy', cooldownUntilMs: undefined });
    }
    const result = pool.acquireLease({
      userId: `fair-user-${operation % 64}`,
      jobId: `fair-job-${operation}`,
      provider: 'openai',
      estimatedTokens: operation % 17 === 0 ? 4_000 : 100,
      maxInFlightPerShard: 20,
      queueIfExhausted: false,
      nowMs: now
    });
    if (result.lease) {
      counts.set(result.lease.shardId, (counts.get(result.lease.shardId) || 0) + 1);
      assert.equal(pool.releaseLease(result.lease.leaseId, { tokensConsumed: 100, success: true, nowMs: now }), true);
    }
    for (const account of accounts) {
      const current = substrate.getAccount(account.id)!;
      assert.ok(pool.getInFlightCount(account.id) >= 0);
      assert.ok((current.tokenBucket.reservedTokens || 0) <= current.tokenBucket.maxTokens);
    }
  }
  assert.ok((counts.get('fair-1') || 0) > 0, 'a recovered account must re-enter service');
  assert.ok((counts.get('fair-2') || 0) > 0, 'an intermittently unavailable account must make progress');
  assert.ok((counts.get('fair-3') || 0) > 0, 'a recovered exhausted account must make progress');
  return {
    operations: 4_200,
    counts: Object.fromEntries(counts),
    fairness: jainFairness([...counts.values()]),
    recoveredAccountAdmissions
  };
}

export function runSchedulerRaceChecks(): {
  operations: number;
  maxReservations: number;
  releasesOutOfOrder: number;
} {
  const scheduler = new PoolScheduler(() => 0);
  const candidates = [
    { id: 'race-a', lastUsedAtMs: 0, availableSlots: 3 },
    { id: 'race-b', lastUsedAtMs: 0, availableSlots: 3 },
    { id: 'race-c', lastUsedAtMs: 0, availableSlots: 3 }
  ];
  const reservations = Array.from({ length: 9 }, () => scheduler.reserve(candidates)).filter(Boolean);
  assert.equal(reservations.length, 9);
  assert.equal(scheduler.reserve(candidates), undefined, 'the final capacity boundary must shed');
  const reversed = [...reservations].reverse();
  for (const reservation of reversed) reservation!.release();
  assert.equal(candidates.reduce((sum, candidate) => sum + candidate.availableSlots, 0), 9);
  assert.equal(scheduler.reserve(candidates)?.candidate.id, 'race-a');
  return { operations: 11, maxReservations: 9, releasesOutOfOrder: reversed.length };
}

export function runQuotaBoundaryAttacks(): {
  operations: number;
  limitMinusOne: boolean;
  exactLimit: boolean;
  limitPlusOneRejected: boolean;
  simultaneousFinalSlotLeases: number;
  eligibilityAdmissionRaceRejected: boolean;
} {
  const nowMs = SYNTHETIC_EPOCH_MS;

  const belowLimit = createSyntheticPool({
    count: 1,
    nowMs,
    strategy: 'least_utilized',
    bucketFactory: governor => governor.createDefaultBucket(1_000, 0, 3, nowMs)
  });
  const below = belowLimit.pool.acquireLease({
    userId: 'quota-below', jobId: 'quota-below', provider: 'openai', estimatedTokens: 999,
    maxInFlightPerShard: 2, queueIfExhausted: false, nowMs
  });
  assert.ok(below.lease, 'limit - 1 must be admitted');
  assert.equal(belowLimit.pool.releaseLease(below.lease.leaseId, { tokensConsumed: 999, success: true, nowMs }), true);

  const exactLimit = createSyntheticPool({
    count: 1,
    nowMs,
    strategy: 'least_utilized',
    bucketFactory: governor => governor.createDefaultBucket(1_000, 0, 3, nowMs)
  });
  const exact = exactLimit.pool.acquireLease({
    userId: 'quota-exact', jobId: 'quota-exact', provider: 'openai', estimatedTokens: 1_000,
    maxInFlightPerShard: 2, queueIfExhausted: false, nowMs
  });
  assert.ok(exact.lease, 'exact token limit must be admitted once');

  const aboveLimit = createSyntheticPool({
    count: 1,
    nowMs,
    strategy: 'least_utilized',
    bucketFactory: governor => governor.createDefaultBucket(1_000, 0, 3, nowMs)
  });
  const above = aboveLimit.pool.acquireLease({
    userId: 'quota-above', jobId: 'quota-above', provider: 'openai', estimatedTokens: 1_001,
    maxInFlightPerShard: 2, queueIfExhausted: false, nowMs
  });
  assert.equal(above.lease, undefined, 'limit + 1 must not be admitted');
  assert.equal(above.status, 'all_shards_cooldown');

  const requestBoundary = createSyntheticPool({
    count: 1,
    nowMs,
    strategy: 'least_utilized',
    bucketFactory: governor => governor.createDefaultBucket(100_000, 0, 3, nowMs)
  });
  const requestLeases = Array.from({ length: 4 }, (_, index) => requestBoundary.pool.acquireLease({
    userId: `request-boundary-${index}`,
    jobId: `request-boundary-${index}`,
    provider: 'openai',
    estimatedTokens: 1,
    maxInFlightPerShard: 3,
    queueIfExhausted: false,
    nowMs
  })).filter(result => result.lease).map(result => result.lease!);
  assert.equal(requestLeases.length, 3, 'exact request-slot limit must admit only three simultaneous leases');
  assert.equal(requestBoundary.pool.getInFlightCount('war-account-0'), 3);
  for (const lease of requestLeases) requestBoundary.pool.releaseLease(lease.leaseId, { tokensConsumed: 1, success: true, nowMs });

  const finalSlot = createSyntheticPool({
    count: 1,
    nowMs,
    strategy: 'least_utilized',
    bucketFactory: governor => governor.createDefaultBucket(1, 0, 100, nowMs)
  });
  const finalLeases = Array.from({ length: 64 }, (_, index) => finalSlot.pool.acquireLease({
    userId: `final-slot-${index}`, jobId: `final-slot-${index}`, provider: 'openai', estimatedTokens: 1,
    maxInFlightPerShard: 64, queueIfExhausted: false, nowMs
  })).filter(result => result.lease).map(result => result.lease!);
  assert.equal(finalLeases.length, 1, 'simultaneous callers must compete atomically for the final token');
  finalSlot.pool.releaseLease(finalLeases[0].leaseId, { tokensConsumed: 1, success: true, nowMs });

  class EligibilityAdmissionRaceGovernor extends ContinuousTokenBucketRateGovernor {
    override reserve(bucket: TokenBucketState, _tokensToReserve: number, _nowMs = Date.now()): { bucket: TokenBucketState; reserved: boolean } {
      return { bucket: { ...bucket, reservedTokens: bucket.reservedTokens || 0 }, reserved: false };
    }
  }
  const raceGovernor = new EligibilityAdmissionRaceGovernor();
  const raceAccount = makeWarAccount('quota-race', raceGovernor, nowMs, {
    maxTokens: 1_000,
    maxRequests: 3,
    refillTokensPerMinute: 0
  });
  const raceSubstrate = createSyntheticSubstrate([raceAccount]);
  const racePool = new GalxCredentialPool(raceSubstrate as any, raceGovernor, new GalxCircuitBreaker(), 'least_utilized', { isAuthorityConfigured: () => false } as any);
  const race = racePool.acquireLease({
    userId: 'quota-race-user', jobId: 'quota-race', provider: 'openai', estimatedTokens: 100,
    maxInFlightPerShard: 2, queueIfExhausted: false, nowMs
  });
  assert.equal(race.lease, undefined, 'quota depletion between eligibility and admission must reject');
  assert.equal(racePool.getInFlightCount('quota-race'), 0);
  assert.equal(racePool.getTenantPooledInFlightCount('quota-race-user'), 0);
  assert.equal(raceSubstrate.getAccount('quota-race')!.tokenBucket.reservedTokens || 0, 0);

  return {
    operations: 1 + 1 + 1 + 4 + 64 + 1,
    limitMinusOne: true,
    exactLimit: true,
    limitPlusOneRejected: true,
    simultaneousFinalSlotLeases: finalLeases.length,
    eligibilityAdmissionRaceRejected: true
  };
}

export async function runRelayLoadWarGames(): Promise<{
  tier: RelayLoadTier;
  seeds: number[];
  operations: number;
  invariants: number;
  queue: Awaited<ReturnType<typeof runQueueWarfare>>;
  stateMachines: ReturnType<typeof runSeededStateMachines>;
  mmo: ReturnType<typeof runSyntheticMmo>;
  fairness: ReturnType<typeof runHostileFairness>;
  races: ReturnType<typeof runSchedulerRaceChecks>;
  quotas: ReturnType<typeof runQuotaBoundaryAttacks>;
}> {
  const queue = await runQueueWarfare();
  const stateMachines = runSeededStateMachines();
  const mmo = runSyntheticMmo();
  const fairness = runHostileFairness();
  const races = runSchedulerRaceChecks();
  const quotas = runQuotaBoundaryAttacks();
  const operations = stateMachines.operations + mmo.operations + races.operations + quotas.operations + queue.cases.reduce((sum, item) => sum + item.target, 0);
  const invariants = stateMachines.invariants + (mmo.report.invariantChecks as number) + fairness.operations + races.operations;
  assert.ok(operations >= RELAY_LOAD_TIER_CONFIG[RELAY_LOAD_TIER].expectedMinimumOperations, `tier ${RELAY_LOAD_TIER} did not execute enough synthetic operations`);
  return {
    tier: RELAY_LOAD_TIER,
    seeds: [...RELAY_LOAD_TIER_CONFIG[RELAY_LOAD_TIER].stateMachineSeeds, mmo.seed],
    operations,
    invariants,
    queue,
    stateMachines,
    mmo,
    fairness,
    races,
    quotas
  };
}
