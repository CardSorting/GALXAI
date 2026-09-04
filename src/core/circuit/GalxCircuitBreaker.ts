import type {
  GalxShardAccount,
  CredentialStatus,
  CircuitEvaluationResult,
  CircuitFailureClassification,
  FailureClassificationCategory
} from '../contracts/GalxContracts';
import { ContinuousTokenBucketRateGovernor } from '../governor/ContinuousTokenBucketRateGovernor';

const TERMINAL_AUTH_ERRORS: readonly string[] = [
  'token_invalidated',
  'token_revoked',
  'invalid_token',
  'invalid_grant',
  'unauthorized_client',
  'account_deactivated',
  'insufficient_quota_permanent',
  'invalid_api_key',
  'incorrect api key',
  'invalid api key',
  'billing_not_active',
  'quota_exceeded_permanent',
  'permission_revoked',
  '401 unauthorized',
  '401',
  '403 forbidden',
  '403'
];

const MODEL_INCOMPATIBLE_ERRORS: readonly string[] = [
  'model_not_found',
  'unsupported_model',
  'does not exist or you do not have access',
  'the model does not support',
  'unsupported parameter for model',
  'model_permission_denied',
  'invalid_model_for_tier',
  'model not available'
];

const BILLING_EXHAUSTION_ERRORS: readonly string[] = [
  'insufficient_quota',
  'check your plan and billing details',
  'billing_hard_limit_reached',
  'account_payment_past_due',
  'unpaid_invoice',
  'payment_required',
  '402'
];

/**
 * Enterprise 6-State Resilient Circuit Breaker with Deep Error Dissection,
 * Strict Single-Canary Slotting, and Slow-Start Quadratic Warmup.
 *
 * States:
 * - `healthy`: Normal execution capacity (100% throughput).
 * - `warming_up`: Slow-Start warmup curve $(t/T)^2$ preventing post-cooldown thundering herd.
 * - `half_open`: Strict single-canary probe slot.
 * - `cooldown`: Temporary exponential backoff with full decorrelated jitter on 429/503.
 * - `exhausted`: Extended backoff on dense failures (>5) or rolling window exhaustion (5/hr).
 * - `soft_draining`: Preemptively drops priority when remaining quota < 5%.
 * - `dead`: Permanently invalidated authorization keys (401/403/revocation).
 * - `quarantined`: Billing exhaustion / past-due accounts.
 * - `paused` / `revoked`: Administratively deactivated.
 */
export class GalxCircuitBreaker {
  private readonly activeCanarySlots = new Set<string>();
  private readonly shardModelBlacklist = new Map<string, Set<string>>();
  private readonly WARMUP_DURATION_MS = 30_000; // 30 seconds slow-start warmup

  /**
   * Checks if an error is a permanent terminal auth error requiring immediate shard eviction.
   */
  isTerminalAuthError(errorReason: string): boolean {
    if (!errorReason) return false;
    const lower = errorReason.toLowerCase();
    for (const term of TERMINAL_AUTH_ERRORS) {
      if (lower.includes(term)) {
        return true;
      }
    }
    return false;
  }

  isPermanentFailure(errorReason: string): boolean {
    return this.isTerminalAuthError(errorReason);
  }

  /**
   * Registers a model as unsupported by a specific shard to prevent future incompatible routes.
   */
  public blacklistModelForShard(shardId: string, modelId: string): void {
    if (!this.shardModelBlacklist.has(shardId)) {
      this.shardModelBlacklist.set(shardId, new Set<string>());
    }
    this.shardModelBlacklist.get(shardId)!.add(modelId.toLowerCase());
  }

  /**
   * Checks if a shard supports a specific model.
   */
  public isModelSupportedByShard(shardId: string, modelId?: string, account?: GalxShardAccount): boolean {
    if (!modelId) return true;
    const lowerModel = modelId.toLowerCase();

    // Check in-memory blacklist
    if (this.shardModelBlacklist.get(shardId)?.has(lowerModel)) {
      return false;
    }

    // Check account-level explicit unsupported list
    if (account?.unsupportedModels?.some(m => m.toLowerCase() === lowerModel)) {
      return false;
    }

    // Check account-level explicit supported list
    if (account?.supportedModels && account.supportedModels.length > 0) {
      return account.supportedModels.some(m => m.toLowerCase() === lowerModel);
    }

    return true;
  }

  /**
   * Evaluates shard health against current timestamp, handling half-open canary probes and slow-start warmup.
   */
  evaluateAccountStatus(
    account: GalxShardAccount,
    nowMs = Date.now(),
    targetModel?: string
  ): CircuitEvaluationResult {
    if (account.permissionRetracted || account.status === 'revoked') {
      return { status: 'revoked', canAttempt: false, canaryMultiplier: 0 };
    }

    if (account.status === 'dead') {
      return { status: 'dead', canAttempt: false, canaryMultiplier: 0 };
    }

    if (account.status === 'paused') {
      return { status: 'paused', canAttempt: false, canaryMultiplier: 0 };
    }

    if (account.status === 'quarantined') {
      return { status: 'quarantined', canAttempt: false, canaryMultiplier: 0 };
    }

    // Check model capability blacklist
    if (targetModel && !this.isModelSupportedByShard(account.id, targetModel, account)) {
      return { status: 'quarantined', canAttempt: false, canaryMultiplier: 0 };
    }

    const cooldownUntil = account.cooldownUntilTimestampMs || account.cooldownUntilMs || 0;

    // Handle Sliding Window Quota (e.g. 5 requests / 5 hours)
    if (account.slidingWindowQuota) {
      const windowDuration = account.slidingWindowQuota.windowDurationMs || 5 * 3600 * 1000;
      const cutoff = nowMs - windowDuration;
      const history = (account.slidingWindowQuota.requestHistoryTimestampsMs || []).filter(ts => ts > cutoff);
      const maxRequests = account.slidingWindowQuota.dynamicDiscoveredCap ?? account.slidingWindowQuota.maxRequestsPerWindow;
      const remainingRequests = Math.max(0, maxRequests - history.length);

      let windowResetMs = 0;
      if (history.length > 0 && remainingRequests <= 0) {
        windowResetMs = Math.max(0, (history[0] + windowDuration) - nowMs);
        return {
          status: 'exhausted',
          canAttempt: false,
          cooldownMs: windowResetMs,
          canaryMultiplier: 0,
          remainingWindowRequests: 0,
          windowResetMs
        };
      }
    }

    if (account.status === 'exhausted') {
      if (cooldownUntil > 0 && nowMs >= cooldownUntil) {
        // Transition to Half-Open single canary probe
        const hasActiveCanary = this.activeCanarySlots.has(account.id);
        if (!hasActiveCanary) {
          return {
            status: 'half_open',
            canAttempt: true,
            canaryMultiplier: 0.25,
            isCanaryCandidate: true
          };
        }
        return {
          status: 'half_open',
          canAttempt: false,
          cooldownMs: 500,
          canaryMultiplier: 0
        };
      }
      return {
        status: 'exhausted',
        canAttempt: false,
        cooldownMs: Math.max(0, cooldownUntil - nowMs),
        canaryMultiplier: 0
      };
    }

    if (account.status === 'cooldown') {
      if (cooldownUntil > 0 && nowMs >= cooldownUntil) {
        // Transition to Half-Open
        const hasActiveCanary = this.activeCanarySlots.has(account.id);
        if (!hasActiveCanary) {
          return {
            status: 'half_open',
            canAttempt: true,
            canaryMultiplier: 0.5,
            isCanaryCandidate: true
          };
        }
        return {
          status: 'half_open',
          canAttempt: false,
          cooldownMs: 500,
          canaryMultiplier: 0
        };
      }
      return {
        status: 'cooldown',
        canAttempt: false,
        cooldownMs: Math.max(0, cooldownUntil - nowMs),
        canaryMultiplier: 0
      };
    }

    if (account.status === 'half_open') {
      const hasActiveCanary = this.activeCanarySlots.has(account.id);
      if (!hasActiveCanary) {
        return {
          status: 'half_open',
          canAttempt: true,
          canaryMultiplier: 0.5,
          isCanaryCandidate: true
        };
      }
      return {
        status: 'half_open',
        canAttempt: false,
        cooldownMs: 500,
        canaryMultiplier: 0
      };
    }

    if (account.status === 'warming_up') {
      const warmupStart = account.warmupStartedAtMs || nowMs - 5000;
      const elapsed = nowMs - warmupStart;
      if (elapsed >= this.WARMUP_DURATION_MS) {
        return { status: 'healthy', canAttempt: true, canaryMultiplier: 1.0 };
      }
      // Quadratic slow-start ramp: (t / T)^2
      const rampFactor = Math.min(1.0, Math.max(0.1, Math.pow(elapsed / this.WARMUP_DURATION_MS, 2)));
      return {
        status: 'warming_up',
        canAttempt: true,
        canaryMultiplier: rampFactor
      };
    }

    if (account.status === 'soft_draining') {
      return { status: 'soft_draining', canAttempt: true, canaryMultiplier: 0.15 };
    }

    return { status: 'healthy', canAttempt: true, canaryMultiplier: 1.0 };
  }

  /**
   * Reserves a single canary slot for half-open verification.
   */
  public acquireCanarySlot(shardId: string): boolean {
    if (this.activeCanarySlots.has(shardId)) return false;
    this.activeCanarySlots.add(shardId);
    return true;
  }

  /**
   * Releases a canary slot upon completion.
   */
  public releaseCanarySlot(shardId: string): void {
    this.activeCanarySlots.delete(shardId);
  }

  /**
   * Deep NLP & regex dissector for upstream errors across OpenAI, Anthropic, xAI, Cloudflare, and reverse proxies.
   */
  public dissectUpstreamError(
    statusCode: number,
    errorBody: string,
    headers?: Record<string, string | number | undefined>,
    nowMs = Date.now(),
    account?: GalxShardAccount
  ): CircuitFailureClassification {
    const rawError = (errorBody || '').toLowerCase();
    const retryAfterHeader = headers?.['retry-after'] ?? headers?.['x-ratelimit-reset-requests'] ?? headers?.['x-ratelimit-reset-tokens'];

    // 1. Permanent Auth Termination (401 / 403 Invalid API Key / Revocation)
    if (statusCode === 401 || this.isTerminalAuthError(rawError)) {
      return {
        newStatus: 'dead',
        isPermanent: true,
        category: 'auth_terminal',
        reason: `Permanent authentication failure detected: ${errorBody.slice(0, 120)}`
      };
    }

    // 2. Model Incompatibility (404 / 400 Unsupported Model)
    for (const phrase of MODEL_INCOMPATIBLE_ERRORS) {
      if (rawError.includes(phrase)) {
        return {
          newStatus: account?.status || 'healthy', // Do not break the shard for other models!
          isPermanent: false,
          category: 'model_incompatible',
          reason: `Model not supported on shard: ${errorBody.slice(0, 120)}`
        };
      }
    }

    // 3. Billing Depletion (402 Payment Required / Insufficient Quota Hard Stop)
    for (const phrase of BILLING_EXHAUSTION_ERRORS) {
      if (statusCode === 402 || rawError.includes(phrase)) {
        return {
          newStatus: 'quarantined',
          isPermanent: false,
          category: 'billing_depleted',
          cooldownMs: 86_400_000, // 24 hours quarantine until top-up
          reason: `Account billing limit exhausted: ${errorBody.slice(0, 120)}`
        };
      }
    }

    // 4. Extract explicit natural duration from message body or headers (e.g. "resets in 4 hours 12 minutes", "resets at 3:45 PM")
    const parsedBodyDuration = ContinuousTokenBucketRateGovernor.parseDurationToMs(errorBody, nowMs);
    const parsedHeaderDuration = ContinuousTokenBucketRateGovernor.parseDurationToMs(retryAfterHeader, nowMs);
    const authoritativeCooldownMs = parsedBodyDuration ?? parsedHeaderDuration;

    // 5. Rolling Window Exhaustion (5/hr or 40/3hr limit reached)
    if (
      rawError.includes('usage limit') ||
      rawError.includes('hit your usage limit') ||
      rawError.includes('usage limit reached') ||
      rawError.includes('try again in') ||
      rawError.includes('resets in') ||
      rawError.includes('limit reached')
    ) {
      const cooldownMs = authoritativeCooldownMs ? Math.max(15_000, authoritativeCooldownMs) : 180_000;
      return {
        newStatus: 'exhausted',
        cooldownMs,
        isPermanent: false,
        category: 'rolling_window_exhausted',
        resetAtTimestampMs: nowMs + cooldownMs,
        reason: `Sliding window quota exhausted: backing off for ${Math.round(cooldownMs / 1000)}s`
      };
    }

    // 6. Dense Failures (>5 consecutive non-terminal errors)
    const consecutive = (account?.stats?.consecutiveFailures || 0) + 1;
    if (consecutive >= 5) {
      const cooldownMs = 300_000; // 5 minutes
      return {
        newStatus: 'exhausted',
        cooldownMs,
        isPermanent: false,
        category: 'transient_5xx',
        reason: `High error density (${consecutive} consecutive failures): freezing shard for 5m`
      };
    }

    // 7. Standard 429 Rate Limit (TPM / RPM)
    if (statusCode === 429 || rawError.includes('rate limit')) {
      const baseMs = authoritativeCooldownMs ? Math.max(5000, authoritativeCooldownMs) : 30_000;
      // Never retry before an authoritative Retry-After/reset duration. Apply
      // only positive jitter in that case; locally inferred cooldowns can use
      // symmetric jitter to disperse an otherwise synchronized fleet.
      const jitter = authoritativeCooldownMs
        ? Math.floor(Math.random() * (baseMs * 0.05))
        : Math.floor(Math.random() * (baseMs * 0.4)) - (baseMs * 0.2);
      const cooldownMs = Math.max(10_000, Math.round(baseMs + jitter));

      return {
        newStatus: 'cooldown',
        cooldownMs,
        isPermanent: false,
        category: 'tpm_rpm_rate_limited',
        resetAtTimestampMs: nowMs + cooldownMs,
        reason: `Rate limit (HTTP 429): backing off for ${Math.round(cooldownMs / 1000)}s`
      };
    }

    // 8. Origin Overload (503 / 502 / 504 / Overloaded)
    if (statusCode >= 500 || rawError.includes('overloaded') || rawError.includes('bad gateway')) {
      const baseMs = authoritativeCooldownMs ? Math.max(3000, authoritativeCooldownMs) : 15_000;
      const jitter = Math.floor(Math.random() * 4000) - 2000;
      const cooldownMs = Math.max(5000, baseMs + jitter);

      return {
        newStatus: 'cooldown',
        cooldownMs,
        isPermanent: false,
        category: 'origin_overloaded',
        reason: `Compute origin temporary overload (HTTP ${statusCode}): backing off for ${Math.round(cooldownMs / 1000)}s`
      };
    }

    // Fallback classification
    return {
      newStatus: 'cooldown',
      cooldownMs: 15_000,
      isPermanent: false,
      category: 'unknown',
      reason: `Gateway request failed (${statusCode}): ${errorBody.slice(0, 100)}`
    };
  }

  /**
   * Compatibility wrapper for classifyFailure.
   */
  classifyFailure(
    account: GalxShardAccount,
    errorReason: string,
    nowMs = Date.now(),
    retryAfterHeader?: string | number
  ): CircuitFailureClassification {
    const headers = retryAfterHeader !== undefined ? { 'retry-after': retryAfterHeader } : undefined;
    const statusCode = errorReason.includes('429') ? 429 : errorReason.includes('401') ? 401 : errorReason.includes('403') ? 403 : errorReason.includes('503') ? 503 : 500;
    return this.dissectUpstreamError(statusCode, errorReason, headers, nowMs, account);
  }
}
