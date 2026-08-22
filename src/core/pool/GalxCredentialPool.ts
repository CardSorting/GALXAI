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

/**
 * Enterprise Adaptive Quota Cycling & Shard Governor for GALXAI.
 *
 * Implements:
 * 1. Predictive Hydraulic Headroom Cycling (P-AHT): Continuous token headroom calculus,
 *    EWMA latency efficiency weighting, concurrency saturation ratio, and canary warmup damping.
 * 2. 2-Phase Atomic Token Reservation: Locks estimated tokens during in-flight processing to prevent
 *    concurrent over-commitment across parallel worker threads.
 * 3. Dynamic Reliability Weight Auto-Tuning: Laplace-smoothed success ratio and latency damping.
 * 4. Smooth Weighted Round-Robin (SWRR): Envoy/Nginx-grade interleaved smooth distribution.
 * 5. Anti-Starvation Fair-Share concurrency ceilings.
 * 6. Microsecond monotonic fencing tokens for race-condition prevention.
 * 7. Latency EWMA telemetry for predictive route optimization.
 */
export class GalxCredentialPool {
  private readonly substrate: GalxCredentialSubstrate;
  private readonly rateGovernor: ContinuousTokenBucketRateGovernor;
  private readonly circuitBreaker: GalxCircuitBreaker;
  private strategy: GalxRotationStrategy;
  private readonly activeLeases = new Map<string, ShardLease>();
  private readonly inFlightCounts = new Map<string, number>();
  private readonly tenantInFlightCounts = new Map<string, number>();

  // Smooth Weighted Round-Robin internal state
  private readonly swrrCurrentWeights = new Map<string, number>();

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
    // Laplace-smoothed success ratio (with prior 10 successes / 10 total)
    const successRatio = (successes + 10) / (total + 10);

    // Latency dampening (favors shards faster than 600ms, gently penalizes slower than 1200ms)
    const avgLatency = stats.averageLatencyMs || 600;
    const latencyFactor = Math.min(1.4, Math.max(0.6, Math.pow(600 / Math.max(100, avgLatency), 0.2)));

    return Math.max(0.5, baseWeight * successRatio * latencyFactor);
  }

  /**
   * Scavenges and reclaims any expired execution leases left behind by timed-out workers,
   * restoring reserved token capacity to the substrate.
   */
  scavengeExpiredLeases(nowMs = Date.now()): number {
    let reclaimed = 0;
    for (const [leaseId, lease] of this.activeLeases.entries()) {
      if (nowMs >= lease.expiresAtMs) {
        this.activeLeases.delete(leaseId);
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
    return reclaimed;
  }

  /**
   * Atomically acquires an exclusive execution lease on the optimal shard account
   * using adaptive hydraulic headroom cycling with 2-Phase Token Reservation.
   */
  acquireLease(req: ShardAcquisitionRequest, nowMs = Date.now()): ShardAcquisitionResult {
    // 1. Scavenge expired leases
    this.scavengeExpiredLeases(nowMs);

    const leaseTtlMs = req.leaseTtlMs || 60_000;
    const maxInFlightPerShard = req.maxInFlightPerShard || 10;
    const estimatedTokens = req.estimatedTokens || 1000;
    const isPriorityUser = !!req.isPriorityUser;

    // 2. Fetch all active accounts for the target provider
    const availableAccounts = this.substrate.listAccounts(undefined, req.provider);
    if (availableAccounts.length === 0) {
      return {
        reason: `No active credential shards available for provider '${req.provider}'`,
        status: 'pool_exhausted'
      };
    }

    // 3. Filter accounts through 4-State Circuit Breaker & Concurrency Saturation
    const candidateAccounts = availableAccounts.filter((acc) => {
      const circuitEval = this.circuitBreaker.evaluateAccountStatus(acc, nowMs);
      const inFlight = this.inFlightCounts.get(acc.id) || 0;
      return circuitEval.canAttempt && inFlight < maxInFlightPerShard;
    });

    if (candidateAccounts.length === 0) {
      return {
        reason: `All active shards for provider '${req.provider}' are in cooldown or saturated at maximum capacity (${maxInFlightPerShard} concurrent)`,
        status: 'all_shards_cooldown'
      };
    }

    // 4. Rate-Governor Capacity Check (Unreserved fractional token availability)
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

    // 6. Select the optimal candidate using the chosen quota cycling strategy with post-allocation headroom
    const selectedAccount = this.selectOptimalShard(
      finalCandidates,
      maxInFlightPerShard,
      nowMs,
      isPriorityUser,
      estimatedTokens
    );

    this.tenantInFlightCounts.set(req.userId, currentTenantInFlight + 1);

    // 7. Phase 1: Soft Token Reservation
    const { bucket: reservedBucket } = this.rateGovernor.reserve(selectedAccount.tokenBucket, estimatedTokens, nowMs);

    // 8. Generate Monotonic Fenced Lease & Increment In-Flight Telemetry
    const fencingToken = (selectedAccount.fencingToken || 0) + 1;
    const leaseId = `lease_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const updatedAccount: GalxShardAccount = {
      ...selectedAccount,
      fencingToken,
      tokenBucket: reservedBucket,
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
    estimatedTokens = 1000
  ): GalxShardAccount {
    if (candidates.length === 1) return candidates[0];

    switch (this.strategy) {
      case 'smooth_weighted_round_robin':
        return this.selectSmoothWeightedRoundRobin(candidates);

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
          estimatedTokens
        );
    }
  }

  /**
   * Strategy 1: Adaptive Hydraulic Headroom Cycling (AHT) with Post-Allocation Leveling.
   * Calculates continuous token bucket post-allocation headroom, EWMA latency score, dynamic reliability weight, and canary multipliers.
   */
  private selectAdaptiveHydraulicHeadroom(
    candidates: GalxShardAccount[],
    maxInFlightPerShard: number,
    nowMs: number,
    isPriorityUser: boolean,
    estimatedTokens = 1000
  ): GalxShardAccount {
    let bestScore = -Infinity;
    let bestCandidate = candidates[0];

    for (const acc of candidates) {
      // 1. Refill bucket to current timestamp & calculate post-allocation headroom
      const refilledBucket = this.rateGovernor.refillBucket(acc.tokenBucket, nowMs);
      const availableTokens = Math.max(0, refilledBucket.remainingTokens - (refilledBucket.reservedTokens || 0));
      const postAllocationTokens = Math.max(0, availableTokens - estimatedTokens);
      const tokenHeadroomRatio = Math.max(0.01, postAllocationTokens / Math.max(1, refilledBucket.maxTokens));

      // 2. Concurrency headroom with Power-Law saturation curve
      const inFlight = this.inFlightCounts.get(acc.id) || 0;
      const concurrencyHeadroom = Math.max(0.01, 1 - Math.pow(inFlight / maxInFlightPerShard, 1.5));

      // 3. Health & Canary multiplier
      const circuit = this.circuitBreaker.evaluateAccountStatus(acc, nowMs);
      const healthMultiplier = circuit.canaryMultiplier ?? (circuit.status === 'cooldown' ? 0.35 : 1.0);
      const failureDampening = Math.pow(0.85, acc.stats?.consecutiveFailures || 0);

      // 4. EWMA Latency Efficiency Multiplier
      const avgLatency = acc.stats?.averageLatencyMs || 600;
      const latencyMultiplier = Math.min(1.5, Math.max(0.7, Math.pow(600 / Math.max(100, avgLatency), 0.25)));

      // 5. Dynamic Reliability Weight
      const dynamicWeight = this.calculateDynamicReliabilityWeight(acc);
      const priorityBoost = isPriorityUser ? (acc.priority || 10) / 10 : 1.0;

      // 6. Dynamic micro-jitter scaling with active fleet concurrency
      const fleetConcurrency = this.activeLeases.size;
      const jitterMagnitude = fleetConcurrency > 10 ? 0.05 : 0.02;
      const microJitter = (Math.random() * (jitterMagnitude * 2)) - jitterMagnitude;

      // 7. Predictive Drain Avoidance & Floor Reserve Penalty (MDA-Floor)
      const drainRatio = postAllocationTokens / Math.max(1, refilledBucket.maxTokens);
      const drainPenalty = drainRatio < 0.10 ? 0.35 : drainRatio < 0.20 ? 0.75 : 1.0;

      // Hydraulic score: higher unreserved headroom + lower in-flight + faster latency + higher reliability = higher score
      const score =
        (Math.pow(tokenHeadroomRatio, 1.2) *
          concurrencyHeadroom *
          healthMultiplier *
          failureDampening *
          latencyMultiplier *
          dynamicWeight *
          priorityBoost *
          drainPenalty) +
        microJitter;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = acc;
      }
    }

    return bestCandidate;
  }

  /**
   * Strategy 2: Smooth Weighted Round-Robin (SWRR).
   * Envoy/Nginx-grade interleaving algorithm to guarantee zero burst clumping with dynamic weights.
   */
  private selectSmoothWeightedRoundRobin(candidates: GalxShardAccount[]): GalxShardAccount {
    let totalWeight = 0;
    let maxCurrentWeight = -Infinity;
    let selected: GalxShardAccount = candidates[0];

    for (const acc of candidates) {
      const effectiveWeight = Math.max(1, Math.round(this.calculateDynamicReliabilityWeight(acc)));
      totalWeight += effectiveWeight;

      const currentWeight = (this.swrrCurrentWeights.get(acc.id) || 0) + effectiveWeight;
      this.swrrCurrentWeights.set(acc.id, currentWeight);

      if (currentWeight > maxCurrentWeight) {
        maxCurrentWeight = currentWeight;
        selected = acc;
      }
    }

    // Deduct total weight from selected candidate
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

  /**
   * Checks if a lease is still active and valid.
   */
  isLeaseValid(leaseId: string, nowMs = Date.now()): boolean {
    const lease = this.activeLeases.get(leaseId);
    if (!lease) return false;
    if (nowMs >= lease.expiresAtMs) return false;
    const account = this.substrate.getAccount(lease.shardId);
    return Boolean(account && !account.permissionRetracted && account.status !== 'revoked');
  }

  /**
   * Instantly invalidates and purges all active leases for a retracted or revoked shard.
   */
  abortActiveLeasesForShard(shardId: string): number {
    let count = 0;
    for (const [leaseId, lease] of this.activeLeases.entries()) {
      if (lease.shardId === shardId) {
        this.activeLeases.delete(leaseId);
        count++;
      }
    }
    this.inFlightCounts.delete(shardId);
    this.swrrCurrentWeights.delete(shardId);
    return count;
  }

  /**
   * Extends the TTL of an active execution lease during long-running streaming completions.
   */
  extendLeaseTtl(leaseId: string, additionalMs = 60_000): boolean {
    const lease = this.activeLeases.get(leaseId);
    if (!lease) return false;
    lease.expiresAtMs += additionalMs;
    return true;
  }

  /**
   * Scavenges and garbage collects expired stale leases, automatically releasing orphaned soft reservations.
   */
  scavengeStaleLeases(nowMs = Date.now()): number {
    let scavenged = 0;
    for (const [leaseId, lease] of this.activeLeases.entries()) {
      if (nowMs >= lease.expiresAtMs) {
        this.activeLeases.delete(leaseId);
        scavenged++;

        // Decrement in-flight counters
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

        // Reclaim orphaned soft token reservation
        if (lease.estimatedTokens > 0) {
          const account = this.substrate.getAccount(lease.shardId);
          if (account && account.tokenBucket.reservedTokens) {
            const remainingReserved = Math.max(0, account.tokenBucket.reservedTokens - lease.estimatedTokens);
            this.substrate.updateAccount({
              ...account,
              tokenBucket: {
                ...account.tokenBucket,
                reservedTokens: remainingReserved
              }
            });
          }
        }
      }
    }
    return scavenged;
  }

  /**
   * Releases an execution lease upon request completion, committing actual tokens,
   * releasing soft reservations, reconciling upstream headers, updating EWMA latency, and notifying circuit breaker.
   */
  releaseLease(
    leaseId: string,
    tokensUsed = 0,
    success = true,
    upstreamHeaders?: Record<string, string | number | undefined>,
    errorReason?: string,
    nowMs = Date.now(),
    latencyMs?: number
  ): boolean {
    const lease = this.activeLeases.get(leaseId);
    if (!lease) {
      return false;
    }

    // Always release active lease and in-flight counters
    this.activeLeases.delete(leaseId);
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
      return true;
    }

    // Validate monotonic fencing token
    if (lease.fencingToken < (currentAccount.fencingToken || 0) - 100) {
      return false;
    }

    if (success) {
      // Phase 2: Commit actual tokens consumed and release the held reservation
      let bucket = this.rateGovernor.commit(
        currentAccount.tokenBucket,
        tokensUsed,
        lease.estimatedTokens,
        1,
        nowMs
      );

      // Reconcile with authoritative upstream headers if provided
      if (upstreamHeaders) {
        bucket = this.rateGovernor.reconcileWithUpstreamHeaders(bucket, upstreamHeaders, nowMs);
      }

      // Calculate Exponentially Weighted Moving Average (EWMA) Latency: 80% history + 20% current
      const prevLatency = currentAccount.stats?.averageLatencyMs || latencyMs || 400;
      const newAverageLatency = latencyMs ? Math.round(0.8 * prevLatency + 0.2 * latencyMs) : prevLatency;

      const updated: GalxShardAccount = {
        ...currentAccount,
        status: 'healthy',
        tokenBucket: bucket,
        stats: {
          totalRequestsServed: (currentAccount.stats?.totalRequestsServed || 0) + 1,
          totalTokensConsumed: (currentAccount.stats?.totalTokensConsumed || 0) + tokensUsed,
          successfulRequests: (currentAccount.stats?.successfulRequests || 0) + 1,
          failedRequests: currentAccount.stats?.failedRequests || 0,
          consecutiveFailures: 0,
          consecutiveSuccesses: (currentAccount.stats?.consecutiveSuccesses || 0) + 1,
          lastUsedTimestampMs: nowMs,
          averageLatencyMs: newAverageLatency,
          lastLatencyMs: latencyMs
        },
        cooldownUntilTimestampMs: undefined,
        updatedAtMs: nowMs
      };
      this.substrate.updateAccount(updated);
    } else {
      // Release reservation on failure
      const recoveredBucket = this.rateGovernor.commit(
        currentAccount.tokenBucket,
        0,
        lease.estimatedTokens,
        1,
        nowMs
      );

      const retryAfter = upstreamHeaders?.['retry-after'];
      const classification = this.circuitBreaker.classifyFailure(
        currentAccount,
        errorReason || 'Unknown error',
        nowMs,
        retryAfter
      );
      const updated: GalxShardAccount = {
        ...currentAccount,
        status: classification.newStatus,
        tokenBucket: recoveredBucket,
        stats: {
          ...currentAccount.stats,
          totalRequestsServed: (currentAccount.stats?.totalRequestsServed || 0) + 1,
          failedRequests: (currentAccount.stats?.failedRequests || 0) + 1,
          consecutiveFailures: (currentAccount.stats?.consecutiveFailures || 0) + 1,
          consecutiveSuccesses: 0,
          lastUsedTimestampMs: nowMs
        },
        cooldownUntilTimestampMs:
          classification.cooldownMs && classification.cooldownMs < Infinity
            ? nowMs + classification.cooldownMs
            : undefined,
        updatedAtMs: nowMs
      };
      this.substrate.updateAccount(updated);
    }

    return true;
  }

  /**
   * Generates comprehensive real-time pool telemetry and statistics.
   */
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
    const grokShards = all.filter(a => a.provider === 'xai-grok');

    return {
      totalShards: all.length,
      totalPooledShards: all.length,
      totalPrivateShards: 0,
      healthyShards: all.filter(a => a.status === 'healthy').length,
      cooldownShards: all.filter(a => a.status === 'cooldown').length,
      exhaustedShards: all.filter(a => a.status === 'exhausted').length,
      deadShards: all.filter(a => a.status === 'dead').length,
      activeLeasesCount: this.activeLeases.size,
      activeLeases: this.activeLeases.size,
      tokensPerMinuteThroughput: all.reduce((acc, s) => acc + (s.tokenBucket.refillRatePerMinute || 0), 0),
      totalTokensServedLifetime: totalTokens,
      totalRequestsServedLifetime: totalRequests,
      averageFleetLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 420,
      providerBreakdown: {
        openai: {
          total: openaiShards.length,
          healthy: openaiShards.filter(a => a.status === 'healthy').length
        },
        'xai-grok': {
          total: grokShards.length,
          healthy: grokShards.filter(a => a.status === 'healthy').length
        }
      },
      rotationStrategy: this.strategy
    };
  }
}
