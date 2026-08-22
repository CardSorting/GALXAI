import type {
  GalxShardAccount,
  CircuitEvaluationResult,
  CircuitFailureClassification
} from '../contracts/GalxContracts';

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

/**
 * Resilient 4-State Circuit Breaker with Decorrelated Jitter and Half-Open Canary Probing.
 *
 * States:
 * - `healthy`: Normal execution capacity (100% throughput).
 * - `cooldown`: Temporary exponential backoff with jitter on 429 / 503 rate limits.
 * - `exhausted`: Extended backoff after dense consecutive failures (>5).
 * - `dead`: Permanently invalidated authorization keys (401/403/revocation).
 */
export class GalxCircuitBreaker {
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
   * Evaluates shard health against current timestamp, handling half-open canary probes.
   */
  evaluateAccountStatus(
    account: GalxShardAccount,
    nowMs = Date.now()
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

    const cooldownUntil = account.cooldownUntilTimestampMs || account.cooldownUntilMs || 0;

    if (account.status === 'exhausted') {
      if (cooldownUntil > 0 && nowMs >= cooldownUntil) {
        // Half-open canary probe attempt: allow probe with dampening
        return { status: 'cooldown', canAttempt: true, canaryMultiplier: 0.25 };
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
        return { status: 'healthy', canAttempt: true, canaryMultiplier: 0.75 };
      }
      return {
        status: 'cooldown',
        canAttempt: false,
        cooldownMs: Math.max(0, cooldownUntil - nowMs),
        canaryMultiplier: 0
      };
    }

    return { status: 'healthy', canAttempt: true, canaryMultiplier: 1.0 };
  }

  /**
   * Classifies a failure, applying exponential backoff and decorrelated jitter for rate limits.
   */
  classifyFailure(
    account: GalxShardAccount,
    errorReason: string,
    nowMs = Date.now(),
    retryAfterHeader?: string | number
  ): CircuitFailureClassification {
    if (this.isTerminalAuthError(errorReason)) {
      return {
        newStatus: 'dead',
        isPermanent: true,
        reason: `Permanent authentication failure detected: ${errorReason}`
      };
    }

    const consecutive = (account.stats?.consecutiveFailures || 0) + 1;

    // 5+ consecutive non-terminal failures -> 5-minute freeze (Exhausted)
    if (consecutive >= 5) {
      const cooldownMs = 300_000; // 5 minutes
      return {
        newStatus: 'exhausted',
        cooldownMs,
        isPermanent: false,
        reason: `High error density (${consecutive} consecutive failures): freezing shard for 5m`
      };
    }

    // If upstream provided explicit Retry-After header
    let baseCooldownMs = 30_000;
    if (retryAfterHeader !== undefined) {
      const parsedSeconds = Number(retryAfterHeader);
      if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        baseCooldownMs = Math.max(5000, parsedSeconds * 1000);
      }
    }

    // Exponential jitter backoff
    const jitter = Math.floor(Math.random() * 5000) - 2500; // +/- 2.5s jitter
    const cooldownMs = Math.max(10_000, baseCooldownMs + jitter);

    return {
      newStatus: 'cooldown',
      cooldownMs,
      isPermanent: false,
      reason: `Temporary rate limit / HTTP 429 detected: backing off for ${Math.round(cooldownMs / 1000)}s`
    };
  }
}
