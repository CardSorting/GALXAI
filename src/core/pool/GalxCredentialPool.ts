import * as crypto from 'node:crypto';
import type {
  GalxShardAccount,
  ShardLease,
  GalxRotationStrategy,
  ShardAcquisitionRequest,
  ShardAcquisitionResult,
  PoolStats
} from '../contracts/GalxContracts';
import { GalxCredentialSubstrate } from '../substrate/GalxCredentialSubstrate';
import { ContinuousTokenBucketRateGovernor } from '../governor/ContinuousTokenBucketRateGovernor';
import { GalxCircuitBreaker } from '../circuit/GalxCircuitBreaker';
import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import { GalxShardSyncBuffer } from './GalxShardSyncBuffer';

interface QueuedAdmissionRequest {
  id: string;
  req: ShardAcquisitionRequest;
  enqueuedAtMs: number;
  resolve: (res: ShardAcquisitionResult) => void;
  reject: (err: any) => void;
  timeoutTimer: NodeJS.Timeout;
}

/**
 * Enterprise Adaptive Quota Cycling & Shard Governor for GALXAI.
 *
 * Implements:
 * 1. Predictive Hydraulic Headroom Cycling (P-AHT) with Dual-Window Quota Calculus (Token Bucket + Sliding 5/hr Log).
 * 2. 2-Phase Atomic Token Reservation with Microsecond Monotonic Fencing Tokens.
 * 3. Adaptive In-Flight Concurrency Limiting (AIMD / EWMA latency gradient).
 * 4. Anti-Stampede Bounded Admission Queue (Waiting Room) for transient pool-wide exhaustion.
 * 5. Strict Single-Canary Slotting & Slow-Start Quadratic Warmup Damping.
 * 6. Out-of-Band Quota Resynchronization & Model Capability Routing.
 * 7. Asynchronous Write-Behind Egress Buffering (GalxShardSyncBuffer) for Supabase PostgreSQL.
 */
export class GalxCredentialPool {
  private readonly substrate: GalxCredentialSubstrate;
  private readonly rateGovernor: ContinuousTokenBucketRateGovernor;
  private readonly circuitBreaker: GalxCircuitBreaker;
  private strategy: GalxRotationStrategy;
  private readonly activeLeases = new Map<string, ShardLease>();
  public readonly leaseTable: BroccoliDbTable<ShardLease & { id: string }>;
  private readonly inFlightCounts = new Map<string, number>();
  private readonly tenantInFlightCounts = new Map<string, number>();

  // Smooth Weighted Round-Robin internal state
  private readonly swrrCurrentWeights = new Map<string, number>();

  // Anti-Stampede Bounded Admission Queue (Waiting Room)
  private readonly admissionQueue: QueuedAdmissionRequest[] = [];
  private readonly syncBuffer = GalxShardSyncBuffer.getInstance();

  constructor(
    substrate: GalxCredentialSubstrate,
    rateGovernor = new ContinuousTokenBucketRateGovernor(),
    circuitBreaker = new GalxCircuitBreaker(),
    strategy: GalxRotationStrategy = 'adaptive_headroom'
  ) {
    this.substrate = substrate;
    this.rateGovernor = rateGovernor;
    this.circuitBreaker = circuitBreaker;
    this.strategy = strategy;

    this.leaseTable = new BroccoliDbTable<ShardLease & { id: string }>('pool_leases');
    this.leaseTable.createIndex('shardId');
    this.leaseTable.createIndex('userId');
    this.leaseTable.createSortedIndex('expiresAtMs');
    this.leaseTable.createSortedIndex('acquiredAtMs');

    // Invalidate active leases when credentials are deleted or retracted
    this.substrate.onRetract((shardId) => {
      this.abortActiveLeasesForShard(shardId);
    });
  }

  getTenantPooledInFlightCount(userId: string): number {
    return this.tenantInFlightCounts.get(userId) || 0;
  }

  setStrategy(strategy: GalxRotationStrategy): void {
    this.strategy = strategy;
  }

  getStrategy(): GalxRotationStrategy {
    return this.strategy;
  }

  getInFlightCount(shardId: string): number {
    return this.inFlightCounts.get(shardId) || 0;
  }

  getActiveLeasesCount(): number {
    return this.activeLeases.size;
  }

  /**
   * Calculates dynamic in-flight concurrency limit (AIMD) based on shard latency gradient.
   */
  public calculateAdaptiveInFlightLimit(account: GalxShardAccount, configuredMax = 10): number {
    const avgLatency = account.stats?.averageLatencyMs || 500;
    if (avgLatency > 2000) {
      return Math.max(2, Math.floor(configuredMax * 0.4)); // Heavily throttled
    }
    if (avgLatency > 1200) {
      return Math.max(3, Math.floor(configuredMax * 0.7)); // Moderately throttled
    }
    if (avgLatency < 400) {
      return Math.min(25, configuredMax + 4); // Boosted
    }
    return configuredMax;
  }

  /**
   * Forecasts earliest reset timestamp across all provider shards for admission queueing.
   */
  public getEarliestPoolResetTimeMs(provider: string, nowMs = Date.now()): number {
    const accounts = this.substrate.listAccounts(undefined, provider as any);
    if (accounts.length === 0) return nowMs + 30_000;

    let earliestReset = Infinity;
    for (const acc of accounts) {
      const cooldownUntil = acc.cooldownUntilTimestampMs || acc.cooldownUntilMs || 0;
      if (cooldownUntil > nowMs && cooldownUntil < earliestReset) {
        earliestReset = cooldownUntil;
      }
      if (acc.slidingWindowQuota?.lastExhaustionResetAtMs && acc.slidingWindowQuota.lastExhaustionResetAtMs > nowMs) {
        if (acc.slidingWindowQuota.lastExhaustionResetAtMs < earliestReset) {
          earliestReset = acc.slidingWindowQuota.lastExhaustionResetAtMs;
        }
      }
    }

    return earliestReset < Infinity ? earliestReset : nowMs + 10_000;
  }

  /**
   * Calculates auto-tuned dynamic reliability weight based on Laplace-smoothed uptime and EWMA latency.
   */
  public calculateDynamicReliabilityWeight(account: GalxShardAccount): number {
    const baseWeight = Math.max(1, account.weight || 1);
    const stats = account.stats;
    if (!stats || !stats.totalRequestsServed) {
      return baseWeight;
    }

    const total = stats.totalRequestsServed;
    const successes = stats.successfulRequests ?? Math.max(0, total - (stats.failedRequests || 0));
    // Laplace-smoothed success ratio
    const successRatio = (successes + 10) / (total + 10);

    // Latency dampening
    const avgLatency = stats.averageLatencyMs || 600;
    const latencyFactor = Math.min(1.4, Math.max(0.6, Math.pow(600 / Math.max(100, avgLatency), 0.2)));

    return Math.max(0.5, baseWeight * successRatio * latencyFactor);
  }

  /**
   * Scavenges and reclaims any expired execution leases left behind by timed-out workers.
   */
  scavengeExpiredLeases(nowMs = Date.now()): number {
    let reclaimed = 0;
    for (const [leaseId, lease] of this.activeLeases.entries()) {
      if (nowMs >= lease.expiresAtMs) {
        this.activeLeases.delete(leaseId);
        this.leaseTable.delete(leaseId);
        const current = this.inFlightCounts.get(lease.shardId) || 0;
        if (current <= 1) {
          this.inFlightCounts.delete(lease.shardId);
        } else {
          this.inFlightCounts.set(lease.shardId, current - 1);
        }

        const curTenant = this.tenantInFlightCounts.get(lease.userId) || 0;
        if (curTenant <= 1) {
          this.tenantInFlightCounts.delete(lease.userId);
        } else {
          this.tenantInFlightCounts.set(lease.userId, curTenant - 1);
        }

        // Release soft token reservation back to the account bucket
        const account = this.substrate.getAccount(lease.shardId);
        if (account) {
          const recoveredBucket = this.rateGovernor.commit(account.tokenBucket, 0, lease.estimatedTokens, 0, nowMs);
          this.substrate.updateAccount({ ...account, tokenBucket: recoveredBucket });
        }

        reclaimed++;
      }
    }

    if (reclaimed > 0) {
      this.drainAdmissionQueue(nowMs);
    }

    return reclaimed;
  }

  /**
   * Reflexively drains waiting admission requests when capacity opens.
   */
  public drainAdmissionQueue(nowMs = Date.now()): void {
    if (this.admissionQueue.length === 0) return;

    for (let i = 0; i < this.admissionQueue.length; i++) {
      const item = this.admissionQueue[i];
      const result = this.acquireLeaseDirect(item.req, nowMs);
      if (result.lease) {
        clearTimeout(item.timeoutTimer);
        this.admissionQueue.splice(i, 1);
        i--;
        item.resolve(result);
      }
    }
  }

  /**
   * Atomically acquires an exclusive execution lease on the optimal shard account.
   * Supports bounded admission queuing if the pool is momentarily saturated.
   */
  acquireLease(req: ShardAcquisitionRequest, nowMs = req.nowMs || Date.now()): ShardAcquisitionResult {
    const directResult = this.acquireLeaseDirect(req, nowMs);
    if (directResult.lease || req.queueIfExhausted === false) {
      return directResult;
    }

    // Anti-Stampede Bounded Admission Queueing
    const maxWaitMs = req.maxQueueWaitMs ?? 4000;
    const earliestResetMs = this.getEarliestPoolResetTimeMs(req.provider, nowMs);
    const resetDeltaMs = earliestResetMs - nowMs;

    if (resetDeltaMs <= maxWaitMs && this.admissionQueue.length < 500) {
      const id = `wait_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let resolvePromise!: (res: ShardAcquisitionResult) => void;
      let rejectPromise!: (err: any) => void;

      const queuedPromise = new Promise<ShardAcquisitionResult>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });

      const timeoutTimer = setTimeout(() => {
        const idx = this.admissionQueue.findIndex((q) => q.id === id);
        if (idx !== -1) {
          this.admissionQueue.splice(idx, 1);
          resolvePromise({
            status: 'queue_timeout',
            reason: `Admission queue deadline exceeded (${maxWaitMs}ms wait)`
          });
        }
      }, maxWaitMs);

      if (timeoutTimer.unref) timeoutTimer.unref();

      this.admissionQueue.push({
        id,
        req,
        enqueuedAtMs: nowMs,
        resolve: resolvePromise,
        reject: rejectPromise,
        timeoutTimer
      });

      return {
        status: 'queued',
        queuedPromise,
        estimatedWaitMs: Math.max(50, resetDeltaMs),
        earliestPoolResetMs: earliestResetMs
      };
    }

    return directResult;
  }

  /**
   * Core synchronous lease acquisition check.
   */
  private acquireLeaseDirect(req: ShardAcquisitionRequest, nowMs = req.nowMs || Date.now()): ShardAcquisitionResult {
    // 1. Scavenge expired leases
    this.scavengeExpiredLeases(nowMs);

    const leaseTtlMs = req.leaseTtlMs || 60_000;
    const baseMaxInFlight = req.maxInFlightPerShard || 10;
    const estimatedTokens = req.estimatedTokens || 1000;
    const isPriorityUser = !!req.isPriorityUser;

    // 2. Fetch all active accounts for the target provider
    let availableAccounts = this.substrate.listAccounts(undefined, req.provider);

    if (req.targetShardId) {
      availableAccounts = availableAccounts.filter((acc) => acc.id === req.targetShardId);
    }
    if (req.targetAccountId) {
      availableAccounts = availableAccounts.filter((acc) => acc.accountId === req.targetAccountId);
    }

    if (availableAccounts.length === 0) {
      return {
        reason: `No active credential shards available for provider '${req.provider}'${req.targetAccountId ? ` matching account '${req.targetAccountId}'` : ''}${req.targetShardId ? ` matching shard '${req.targetShardId}'` : ''}`,
        status: 'pool_exhausted'
      };
    }

    // 2b. Privacy & Compliance Capability Filtering
    const isHipaaReq = !!req.hipaaRequired || req.privacyProfile === 'hipaa' || req.privacyProfile === 'confidential' || req.privacyProfile === 'strict';
    const isEuReq = req.dataResidency === 'eu' || req.privacyProfile === 'gdpr';
    const isZdrReq = !!req.zdrRequired || req.privacyProfile === 'zdr' || isHipaaReq;

    const complianceEligibleAccounts = availableAccounts.filter((acc) => {
      const caps = acc.privacyCapabilities || {
        hipaaCompliant: true,
        zdrCertified: true,
        dataResidency: 'global',
        baaSigned: true,
        piiFiltering: true
      };

      if (isHipaaReq && (!caps.hipaaCompliant || !caps.baaSigned)) return false;
      if (isEuReq && caps.dataResidency !== 'eu' && caps.dataResidency !== 'global') return false;
      if (isZdrReq && !caps.zdrCertified) return false;
      return true;
    });

    if (complianceEligibleAccounts.length === 0) {
      return {
        reason: `No active ${req.provider} shards meet the required privacy compliance criteria (HIPAA BAA: ${isHipaaReq}, EU Residency: ${isEuReq}, ZDR: ${isZdrReq})`,
        status: 'no_compliant_shards'
      };
    }

    // 3. Filter accounts through 6-State Circuit Breaker, Model Gating, and Adaptive Concurrency Limits
    const candidateAccounts = complianceEligibleAccounts.filter((acc) => {
      const circuitEval = this.circuitBreaker.evaluateAccountStatus(acc, nowMs, req.targetModel);
      if (!circuitEval.canAttempt) return false;

      const inFlight = this.inFlightCounts.get(acc.id) || 0;
      const adaptiveLimit = this.calculateAdaptiveInFlightLimit(acc, baseMaxInFlight);
      if (inFlight >= adaptiveLimit) return false;

      // Check Sliding Window Quota (5/hr, 40/3hr)
      if (acc.slidingWindowQuota) {
        const windowCheck = this.rateGovernor.canConsumeSlidingWindow(acc.slidingWindowQuota, 1, nowMs);
        if (!windowCheck.canConsume) return false;
      }

      return true;
    });

    if (candidateAccounts.length === 0) {
      return {
        reason: `All compliant shards for provider '${req.provider}' are in cooldown, quota-exhausted, or saturated at maximum capacity`,
        status: 'all_shards_cooldown',
        earliestPoolResetMs: this.getEarliestPoolResetTimeMs(req.provider, nowMs)
      };
    }

    // 4. Rate-Governor Token Bucket Capacity Check
    const capableCandidates = candidateAccounts.filter((acc) =>
      this.rateGovernor.canConsume(acc.tokenBucket, estimatedTokens, 1, nowMs)
    );

    const finalCandidates = capableCandidates.length > 0 ? capableCandidates : candidateAccounts;

    // 5. Anti-Starvation Fair-Share Concurrency Ceiling for Tenant
    const currentTenantInFlight = this.tenantInFlightCounts.get(req.userId) || 0;
    const maxTenantLimit = req.maxTenantPooledInFlight || (isPriorityUser ? 40 : 20);
    if (currentTenantInFlight >= maxTenantLimit) {
      return {
        reason: `Tenant '${req.userId}' reached maximum simultaneous concurrent gateway allocation (${maxTenantLimit})`,
        status: 'tenant_pool_quota_capped'
      };
    }

    // 6. Select optimal candidate
    const selectedAccount = this.selectOptimalShard(
      finalCandidates,
      baseMaxInFlight,
      nowMs,
      isPriorityUser,
      estimatedTokens,
      req.userId
    );

    // If candidate is in half_open state, reserve strict single canary slot
    const evalStatus = this.circuitBreaker.evaluateAccountStatus(selectedAccount, nowMs, req.targetModel);
    if (evalStatus.status === 'half_open') {
      const acquiredCanary = this.circuitBreaker.acquireCanarySlot(selectedAccount.id);
      if (!acquiredCanary) {
        // Another worker is probing; skip this shard
        const remainingCandidates = finalCandidates.filter(c => c.id !== selectedAccount.id);
        if (remainingCandidates.length === 0) {
          return {
            reason: `Shard ${selectedAccount.id} is currently under half-open single-canary verification`,
            status: 'all_shards_cooldown'
          };
        }
        return this.acquireLeaseDirect({ ...req, targetShardId: remainingCandidates[0].id }, nowMs);
      }
    }

    this.tenantInFlightCounts.set(req.userId, currentTenantInFlight + 1);

    // 7. Phase 1: Soft Token Reservation & Sliding Window Log update
    const { bucket: reservedBucket } = this.rateGovernor.reserve(selectedAccount.tokenBucket, estimatedTokens, nowMs);

    let updatedSlidingWindow = selectedAccount.slidingWindowQuota;
    if (updatedSlidingWindow) {
      updatedSlidingWindow = this.rateGovernor.recordSlidingWindowConsumption(updatedSlidingWindow, 1, nowMs);
    }

    // 8. Generate Monotonic Fenced Lease & Increment In-Flight Telemetry
    const fencingToken = (selectedAccount.fencingToken || 0) + 1;
    const leaseId = `lease_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const updatedAccount: GalxShardAccount = {
      ...selectedAccount,
      fencingToken,
      tokenBucket: reservedBucket,
      slidingWindowQuota: updatedSlidingWindow,
      updatedAtMs: nowMs
    };

    const lease: ShardLease = {
      leaseId,
      shardId: updatedAccount.id,
      userId: req.userId,
      jobId: req.jobId,
      fencingToken,
      acquiredAtMs: nowMs,
      expiresAtMs: nowMs + leaseTtlMs,
      estimatedTokens,
      account: updatedAccount
    };

    this.activeLeases.set(leaseId, lease);
    this.leaseTable.put(leaseId, { ...lease, id: leaseId });
    this.inFlightCounts.set(updatedAccount.id, (this.inFlightCounts.get(updatedAccount.id) || 0) + 1);
    this.substrate.updateAccount(updatedAccount);

    return { lease };
  }

  /**
   * Core Quota Cycling Dispatcher.
   */
  private selectOptimalShard(
    candidates: GalxShardAccount[],
    maxInFlightPerShard: number,
    nowMs: number,
    isPriorityUser: boolean,
    estimatedTokens = 1000,
    userId?: string
  ): GalxShardAccount {
    if (candidates.length === 1) return candidates[0];

    switch (this.strategy) {
      case 'smooth_weighted_round_robin':
        return this.selectSmoothWeightedRoundRobin(candidates, nowMs);

      case 'least_utilized':
        return this.selectLeastUtilized(candidates, isPriorityUser);

      case 'priority_failover':
        return this.selectPriorityFailover(candidates);

      case 'adaptive_headroom':
      default:
        return this.selectAdaptiveHydraulicHeadroom(
          candidates,
          maxInFlightPerShard,
          nowMs,
          isPriorityUser,
          estimatedTokens,
          userId
        );
    }
  }

  /**
   * Strategy 1: Adaptive Hydraulic Headroom Cycling (AHT) with Slow-Start Warmup and Tenant Dispersion.
   */
  private selectAdaptiveHydraulicHeadroom(
    candidates: GalxShardAccount[],
    maxInFlightPerShard: number,
    nowMs: number,
    isPriorityUser: boolean,
    estimatedTokens = 1000,
    userId?: string
  ): GalxShardAccount {
    let bestScore = -Infinity;
    let bestCandidate = candidates[0];

    for (const acc of candidates) {
      // 1. Refill bucket to current timestamp & calculate post-allocation headroom
      const refilledBucket = this.rateGovernor.refillBucket(acc.tokenBucket, nowMs);
      const availableTokens = Math.max(0, refilledBucket.remainingTokens - (refilledBucket.reservedTokens || 0));
      const postAllocationTokens = Math.max(0, availableTokens - estimatedTokens);
      const tokenHeadroomRatio = Math.max(0.01, postAllocationTokens / Math.max(1, refilledBucket.maxTokens));

      // 2. Concurrency headroom with Adaptive in-flight ceiling
      const adaptiveCeiling = this.calculateAdaptiveInFlightLimit(acc, maxInFlightPerShard);
      const inFlight = this.inFlightCounts.get(acc.id) || 0;
      const concurrencyHeadroom = Math.max(0.01, 1 - Math.pow(inFlight / adaptiveCeiling, 1.5));

      // 3. Health & Slow-Start Warmup multiplier
      const circuit = this.circuitBreaker.evaluateAccountStatus(acc, nowMs);
      const healthMultiplier = circuit.canaryMultiplier ?? 1.0;
      const failureDampening = Math.pow(0.85, acc.stats?.consecutiveFailures || 0);

      // 4. EWMA Latency Efficiency Multiplier
      const avgLatency = acc.stats?.averageLatencyMs || 600;
      const latencyMultiplier = Math.min(1.5, Math.max(0.7, Math.pow(600 / Math.max(100, avgLatency), 0.25)));

      // 5. Dynamic Reliability Weight
      const dynamicWeight = this.calculateDynamicReliabilityWeight(acc);
      const priorityBoost = isPriorityUser ? (acc.priority || 10) / 10 : 1.0;

      // 6. Sliding window penalty (if near 5/hr exhaustion)
      let slidingWindowFactor = 1.0;
      if (acc.slidingWindowQuota) {
        const windowCheck = this.rateGovernor.canConsumeSlidingWindow(acc.slidingWindowQuota, 1, nowMs);
        const maxCap = acc.slidingWindowQuota.dynamicDiscoveredCap ?? acc.slidingWindowQuota.maxRequestsPerWindow;
        slidingWindowFactor = Math.max(0.1, windowCheck.remainingRequests / Math.max(1, maxCap));
      }

      // 7. Dynamic micro-jitter
      const fleetConcurrency = this.activeLeases.size;
      const jitterMagnitude = fleetConcurrency > 10 ? 0.05 : 0.02;
      const microJitter = (Math.random() * (jitterMagnitude * 2)) - jitterMagnitude;

      // 8. Tenant-Affinity Shard Dispersion (TASD)
      let tenantLeasesOnShard = 0;
      if (userId) {
        for (const lease of this.activeLeases.values()) {
          if (lease.userId === userId && lease.shardId === acc.id) {
            tenantLeasesOnShard++;
          }
        }
      }
      const tenantDispersionFactor = Math.pow(0.88, tenantLeasesOnShard);

      const score =
        (Math.pow(tokenHeadroomRatio, 1.2) *
          concurrencyHeadroom *
          healthMultiplier *
          failureDampening *
          latencyMultiplier *
          dynamicWeight *
          priorityBoost *
          slidingWindowFactor *
          tenantDispersionFactor) +
        microJitter;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = acc;
      }
    }

    return bestCandidate;
  }

  /**
   * Strategy 2: Smooth Weighted Round-Robin (SWRR) with Slow-Start Damping.
   */
  private selectSmoothWeightedRoundRobin(candidates: GalxShardAccount[], nowMs = Date.now()): GalxShardAccount {
    let totalWeight = 0;
    let maxCurrentWeight = -Infinity;
    let selected: GalxShardAccount = candidates[0];

    for (const acc of candidates) {
      const circuit = this.circuitBreaker.evaluateAccountStatus(acc, nowMs);
      const canaryMult = circuit.canaryMultiplier ?? 1.0;
      const baseReliability = this.calculateDynamicReliabilityWeight(acc);
      const effectiveWeight = Math.max(1, Math.round(baseReliability * canaryMult));
      totalWeight += effectiveWeight;

      const currentWeight = (this.swrrCurrentWeights.get(acc.id) || 0) + effectiveWeight;
      this.swrrCurrentWeights.set(acc.id, currentWeight);

      if (currentWeight > maxCurrentWeight) {
        maxCurrentWeight = currentWeight;
        selected = acc;
      }
    }

    const finalSelectedWeight = (this.swrrCurrentWeights.get(selected.id) || 0) - totalWeight;
    this.swrrCurrentWeights.set(selected.id, finalSelectedWeight);

    return selected;
  }

  /**
   * Strategy 3: Least Utilized Strategy.
   */
  private selectLeastUtilized(candidates: GalxShardAccount[], isPriorityUser: boolean): GalxShardAccount {
    return [...candidates].sort((a, b) => {
      const inFlightDiff = (this.inFlightCounts.get(a.id) || 0) - (this.inFlightCounts.get(b.id) || 0);
      if (inFlightDiff !== 0) return inFlightDiff;

      const tokenDiff = (a.stats?.totalTokensConsumed || 0) - (b.stats?.totalTokensConsumed || 0);
      if (tokenDiff !== 0) return tokenDiff;

      if (isPriorityUser) {
        const prioDiff = (b.priority || 10) - (a.priority || 10);
        if (prioDiff !== 0) return prioDiff;
      }

      return a.id.localeCompare(b.id);
    })[0];
  }

  /**
   * Strategy 4: Priority Failover Strategy.
   */
  private selectPriorityFailover(candidates: GalxShardAccount[]): GalxShardAccount {
    return [...candidates].sort((a, b) => {
      const prioDiff = (b.priority || 10) - (a.priority || 10);
      if (prioDiff !== 0) return prioDiff;

      const inFlightDiff = (this.inFlightCounts.get(a.id) || 0) - (this.inFlightCounts.get(b.id) || 0);
      if (inFlightDiff !== 0) return inFlightDiff;

      return (a.stats?.consecutiveFailures || 0) - (b.stats?.consecutiveFailures || 0);
    })[0];
  }

  isLeaseValid(leaseId: string, nowMs = Date.now()): boolean {
    const lease = this.activeLeases.get(leaseId);
    if (!lease) return false;
    if (nowMs >= lease.expiresAtMs) return false;
    const account = this.substrate.getAccount(lease.shardId);
    return Boolean(account && !account.permissionRetracted && account.status !== 'revoked');
  }

  abortActiveLeasesForShard(shardId: string): number {
    let count = 0;
    for (const [leaseId, lease] of this.activeLeases.entries()) {
      if (lease.shardId === shardId) {
        this.activeLeases.delete(leaseId);
        this.leaseTable.delete(leaseId);
        count++;
      }
    }
    this.inFlightCounts.delete(shardId);
    this.swrrCurrentWeights.delete(shardId);
    this.circuitBreaker.releaseCanarySlot(shardId);
    return count;
  }

  extendLeaseTtl(leaseId: string, additionalMs = 60_000): boolean {
    const lease = this.activeLeases.get(leaseId);
    if (!lease) return false;
    lease.expiresAtMs += additionalMs;
    return true;
  }

  scavengeStaleLeases(nowMs = Date.now()): number {
    return this.scavengeExpiredLeases(nowMs);
  }

  /**
   * Releases an execution lease upon request completion, committing tokens, updating EWMA latency,
   * promoting canary shards to slow-start warmup, notifying circuit breaker, and enqueuing to GalxShardSyncBuffer.
   */
  releaseLease(
    leaseId: string,
    tokensUsedOrOptions: number | {
      tokensConsumed?: number;
      tokensUsed?: number;
      success?: boolean;
      upstreamHeaders?: Record<string, string | number | undefined>;
      errorReason?: string;
      nowMs?: number;
      latencyMs?: number;
      statusCode?: number;
      modelUsed?: string;
    } = 0,
    success = true,
    upstreamHeaders?: Record<string, string | number | undefined>,
    errorReason?: string,
    nowMs = Date.now(),
    latencyMs?: number
  ): boolean {
    let actualTokensUsed = 0;
    let actualSuccess = success;
    let actualHeaders = upstreamHeaders;
    let actualError = errorReason;
    let actualNowMs = nowMs;
    let actualLatency = latencyMs;
    let actualStatusCode = success ? 200 : 500;
    let actualModelUsed: string | undefined;

    if (typeof tokensUsedOrOptions === 'object' && tokensUsedOrOptions !== null) {
      actualTokensUsed = tokensUsedOrOptions.tokensConsumed ?? tokensUsedOrOptions.tokensUsed ?? 0;
      actualSuccess = tokensUsedOrOptions.success ?? true;
      actualHeaders = tokensUsedOrOptions.upstreamHeaders ?? upstreamHeaders;
      actualError = tokensUsedOrOptions.errorReason ?? errorReason;
      actualNowMs = tokensUsedOrOptions.nowMs ?? nowMs;
      actualLatency = tokensUsedOrOptions.latencyMs ?? latencyMs;
      actualStatusCode = tokensUsedOrOptions.statusCode ?? (actualSuccess ? 200 : 500);
      actualModelUsed = tokensUsedOrOptions.modelUsed;
    } else if (typeof tokensUsedOrOptions === 'number') {
      actualTokensUsed = tokensUsedOrOptions;
    }

    const lease = this.activeLeases.get(leaseId);
    if (!lease) {
      return false;
    }

    // Release active canary slot if held
    this.circuitBreaker.releaseCanarySlot(lease.shardId);

    // Release lease and in-flight counters
    this.activeLeases.delete(leaseId);
    this.leaseTable.delete(leaseId);
    const inFlight = this.inFlightCounts.get(lease.shardId) || 0;
    if (inFlight <= 1) {
      this.inFlightCounts.delete(lease.shardId);
    } else {
      this.inFlightCounts.set(lease.shardId, inFlight - 1);
    }

    const curTenantInFlight = this.tenantInFlightCounts.get(lease.userId) || 0;
    if (curTenantInFlight <= 1) {
      this.tenantInFlightCounts.delete(lease.userId);
    } else {
      this.tenantInFlightCounts.set(lease.userId, curTenantInFlight - 1);
    }

    const currentAccount = this.substrate.getAccount(lease.shardId);
    if (!currentAccount || currentAccount.permissionRetracted || currentAccount.status === 'revoked') {
      this.drainAdmissionQueue(actualNowMs);
      return true;
    }

    if (lease.fencingToken < (currentAccount.fencingToken || 0) - 100) {
      return false;
    }

    // Asynchronously log health probe to Write-Behind Buffer (Zero Database Egress Delay)
    this.syncBuffer.enqueueProbe({
      shardId: lease.shardId,
      workerId: 'gateway-node',
      latencyMs: actualLatency || 300,
      statusCode: actualStatusCode,
      isSuccess: actualSuccess,
      errorMessage: actualError,
      timestampMs: actualNowMs
    });

    if (actualSuccess) {
      let bucket = this.rateGovernor.commit(
        currentAccount.tokenBucket,
        actualTokensUsed,
        lease.estimatedTokens,
        1,
        actualNowMs
      );

      if (actualHeaders) {
        bucket = this.rateGovernor.reconcileWithUpstreamHeaders(bucket, actualHeaders, actualNowMs);
      }

      const prevLatency = currentAccount.stats?.averageLatencyMs || actualLatency || 400;
      const newAverageLatency = actualLatency ? Math.round(0.8 * prevLatency + 0.2 * actualLatency) : prevLatency;

      // If shard was in half_open or cooldown, transition to slow-start warming_up
      let newStatus = currentAccount.status;
      let warmupStartedAt = currentAccount.warmupStartedAtMs;
      if (currentAccount.status === 'half_open' || currentAccount.status === 'cooldown' || currentAccount.status === 'exhausted') {
        newStatus = 'warming_up';
        warmupStartedAt = actualNowMs;
      }

      const updated: GalxShardAccount = {
        ...currentAccount,
        status: newStatus,
        tokenBucket: bucket,
        warmupStartedAtMs: warmupStartedAt,
        stats: {
          totalRequestsServed: (currentAccount.stats?.totalRequestsServed || 0) + 1,
          totalTokensConsumed: (currentAccount.stats?.totalTokensConsumed || 0) + actualTokensUsed,
          successfulRequests: (currentAccount.stats?.successfulRequests || 0) + 1,
          failedRequests: currentAccount.stats?.failedRequests || 0,
          consecutiveFailures: 0,
          consecutiveSuccesses: (currentAccount.stats?.consecutiveSuccesses || 0) + 1,
          lastUsedTimestampMs: actualNowMs,
          averageLatencyMs: newAverageLatency,
          lastLatencyMs: actualLatency
        },
        cooldownUntilTimestampMs: undefined,
        updatedAtMs: actualNowMs
      };
      this.substrate.updateAccount(updated);

      if (newStatus !== currentAccount.status) {
        this.syncBuffer.enqueueStateTransition({
          shardId: updated.id,
          status: newStatus,
          timestampMs: actualNowMs
        });
      }
    } else {
      const recoveredBucket = this.rateGovernor.commit(
        currentAccount.tokenBucket,
        0,
        lease.estimatedTokens,
        1,
        actualNowMs
      );

      const classification = this.circuitBreaker.dissectUpstreamError(
        actualStatusCode,
        actualError || 'Unknown error',
        actualHeaders,
        actualNowMs,
        currentAccount
      );

      // Model Incompatibility: register blacklist without breaking shard for other models
      if (classification.category === 'model_incompatible' && actualModelUsed) {
        this.circuitBreaker.blacklistModelForShard(lease.shardId, actualModelUsed);
      }

      // Out-of-band sliding window sync
      let updatedSlidingWindow = currentAccount.slidingWindowQuota;
      if (classification.category === 'rolling_window_exhausted' && classification.resetAtTimestampMs && updatedSlidingWindow) {
        updatedSlidingWindow = this.rateGovernor.syncSlidingWindowFromReset(
          updatedSlidingWindow,
          classification.resetAtTimestampMs,
          undefined,
          actualNowMs
        );
      }

      const cooldownUntil = classification.cooldownMs && classification.cooldownMs < Infinity
        ? actualNowMs + classification.cooldownMs
        : undefined;

      const updated: GalxShardAccount = {
        ...currentAccount,
        status: classification.newStatus,
        tokenBucket: recoveredBucket,
        slidingWindowQuota: updatedSlidingWindow,
        outOfBandUsageDetectedAtMs: classification.category === 'rolling_window_exhausted' ? actualNowMs : currentAccount.outOfBandUsageDetectedAtMs,
        stats: {
          ...currentAccount.stats,
          totalRequestsServed: (currentAccount.stats?.totalRequestsServed || 0) + 1,
          failedRequests: (currentAccount.stats?.failedRequests || 0) + 1,
          consecutiveFailures: (currentAccount.stats?.consecutiveFailures || 0) + 1,
          consecutiveSuccesses: 0,
          lastUsedTimestampMs: actualNowMs
        },
        cooldownUntilTimestampMs: cooldownUntil,
        updatedAtMs: actualNowMs
      };
      this.substrate.updateAccount(updated);

      this.syncBuffer.enqueueStateTransition({
        shardId: updated.id,
        status: classification.newStatus,
        cooldownUntilMs: cooldownUntil,
        timestampMs: actualNowMs
      });
    }

    // Reflexively drain waiting admission queue requests
    this.drainAdmissionQueue(actualNowMs);

    return true;
  }

  getPoolStats(): PoolStats {
    const all = this.substrate.listAccounts();

    let totalTokens = 0;
    let totalRequests = 0;
    let latencySum = 0;
    let latencyCount = 0;

    for (const a of all) {
      totalTokens += a.stats?.totalTokensConsumed || 0;
      totalRequests += a.stats?.totalRequestsServed || 0;
      if (a.stats?.averageLatencyMs) {
        latencySum += a.stats.averageLatencyMs;
        latencyCount++;
      }
    }

    const openaiShards = all.filter(a => a.provider === 'openai');

    return {
      totalShards: all.length,
      totalPooledShards: all.length,
      totalPrivateShards: 0,
      healthyShards: all.filter(a => a.status === 'healthy' || a.status === 'warming_up').length,
      cooldownShards: all.filter(a => a.status === 'cooldown' || a.status === 'half_open').length,
      exhaustedShards: all.filter(a => a.status === 'exhausted' || a.status === 'soft_draining').length,
      deadShards: all.filter(a => a.status === 'dead' || a.status === 'quarantined').length,
      activeLeasesCount: this.activeLeases.size,
      activeLeases: this.activeLeases.size,
      tokensPerMinuteThroughput: all.reduce((acc, s) => acc + (s.tokenBucket.refillRatePerMinute || 0), 0),
      totalTokensServedLifetime: totalTokens,
      totalRequestsServedLifetime: totalRequests,
      averageFleetLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 420,
      providerBreakdown: {
        openai: {
          total: openaiShards.length,
          healthy: openaiShards.filter(a => a.status === 'healthy' || a.status === 'warming_up').length
        }
      },
      rotationStrategy: this.strategy
    };
  }

  public queryActiveLeasesNatural(naturalQuery: string): (ShardLease & { id: string })[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'pool_leases');
    return this.leaseTable.query(parsed.queryOptions) as (ShardLease & { id: string })[];
  }
}

