/**
 * Continuous token-bucket rate governor.
 *
 * - Uses a monotonic nanosecond clock when available (Node.js hrtime.bigint()).
 * - Refills continuously; it does not use intervals, timers, or polling.
 * - `tryAcquire()` is synchronous and O(1).
 * - Suitable for one JavaScript isolate/event loop. It is not shared across
 *   processes or Worker threads without an external shared coordinator.
 *
 * Compile target: ES2020 or newer (BigInt support required).
 */

export interface MonotonicClock {
  /** Returns monotonically increasing time in nanoseconds. */
  nowNs(): bigint;
}

export interface TokenBucketOptions {
  /**
   * Maximum number of tokens the bucket can hold.
   * Must be finite and > 0.
   */
  capacity: number;

  /**
   * Continuous refill rate in tokens per second.
   * Must be finite and > 0.
   */
  refillRatePerSecond: number;

  /**
   * Initial token count. Defaults to `capacity`.
   * Must be finite and within [0, capacity].
   */
  initialTokens?: number;

  /**
   * Optional monotonic clock. Defaults to Node's process.hrtime.bigint()
   * when available, otherwise performance.now().
   */
  clock?: MonotonicClock;
}

const NS_PER_SECOND = 1_000_000_000n;

/**
 * Returns the best monotonic clock available in the current runtime.
 *
 * Node.js: process.hrtime.bigint() -- nanosecond resolution.
 * Browser: performance.now()       -- usually microsecond/sub-millisecond resolution.
 */
export function defaultMonotonicClock(): MonotonicClock {
  const runtime = globalThis as typeof globalThis & {
    process?: {
      hrtime?: {
        bigint?: () => bigint;
      };
    };
    performance?: {
      now: () => number;
    };
  };

  const hrtimeBigint = runtime.process?.hrtime?.bigint;
  if (typeof hrtimeBigint === "function") {
    return {
      nowNs: () => hrtimeBigint(),
    };
  }

  const performanceNow = runtime.performance?.now;
  if (typeof performanceNow === "function") {
    return {
      // performance.now() is in milliseconds. Convert to nanoseconds.
      // Actual resolution remains browser/runtime dependent.
      nowNs: () => BigInt(Math.floor(performanceNow() * 1_000_000)),
    };
  }

  throw new Error(
    "No monotonic clock is available. Supply TokenBucketOptions.clock explicitly.",
  );
}

/**
 * A continuous token-bucket rate governor.
 *
 * Example:
 *
 * ```ts
 * const governor = new ContinuousTokenBucket({
 *   capacity: 100,
 *   refillRatePerSecond: 25,
 * });
 *
 * if (governor.tryAcquire(1)) {
 *   // Allowed.
 * } else {
 *   // Rate limited.
 * }
 * ```
 */
export class ContinuousTokenBucket {
  readonly capacity: number;
  readonly refillRatePerSecond: number;

  private readonly clock: MonotonicClock;

  /**
   * Floating-point tokens are intentional: continuous refill permits
   * fractional tokens.
   */
  private tokens: number;

  /**
   * Kahan compensation preserves very small refill increments that would
   * otherwise be repeatedly lost when the bucket contains large values.
   */
  private refillCompensation = 0;

  private lastRefillNs: bigint;

  constructor(options: TokenBucketOptions) {
    validatePositiveFinite("capacity", options.capacity);
    validatePositiveFinite("refillRatePerSecond", options.refillRatePerSecond);

    const initialTokens = options.initialTokens ?? options.capacity;
    if (!Number.isFinite(initialTokens) || initialTokens < 0) {
      throw new RangeError(
        `initialTokens must be finite and >= 0; received ${initialTokens}`,
      );
    }

    if (initialTokens > options.capacity) {
      throw new RangeError(
        `initialTokens (${initialTokens}) cannot exceed capacity (${options.capacity})`,
      );
    }

    this.capacity = options.capacity;
    this.refillRatePerSecond = options.refillRatePerSecond;
    this.clock = options.clock ?? defaultMonotonicClock();
    this.tokens = initialTokens;
    this.lastRefillNs = this.clock.nowNs();
  }

  /**
   * Attempts to consume `tokens`.
   *
   * Returns true and debits the bucket if sufficient tokens are available.
   * Returns false without debiting otherwise.
   *
   * `tokens === 0` is valid and always succeeds.
   *
   * @throws RangeError for negative, NaN, or infinite token requests.
   */
  tryAcquire(tokens: number): boolean {
    validateNonNegativeFinite("tokens", tokens);

    this.refill();

    if (tokens > this.tokens) {
      return false;
    }

    this.addTokens(-tokens);
    return true;
  }

  /**
   * Returns the currently available token count after applying elapsed refill.
   *
   * This method mutates only internal time/accounting state; it does not
   * consume tokens.
   */
  availableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Returns the estimated time until `tokens` can be acquired.
   *
   * Returns:
   * - 0 when the request could succeed now.
   * - Infinity when the requested amount exceeds bucket capacity and can
   *   therefore never be acquired in one request.
   */
  retryAfterMs(tokens: number): number {
    validateNonNegativeFinite("tokens", tokens);

    this.refill();

    if (tokens <= this.tokens) {
      return 0;
    }

    if (tokens > this.capacity) {
      return Infinity;
    }

    return ((tokens - this.tokens) / this.refillRatePerSecond) * 1_000;
  }

  /**
   * Refills based on elapsed monotonic time.
   *
   * No background timer is necessary: refill is calculated precisely when the
   * governor is queried.
   */
  private refill(): void {
    const nowNs = this.clock.nowNs();

    // A monotonic clock should not move backwards, but clamping makes the
    // governor safe against a faulty/injected clock.
    if (nowNs <= this.lastRefillNs) {
      return;
    }

    const elapsedNs = nowNs - this.lastRefillNs;
    this.lastRefillNs = nowNs;

    if (this.tokens >= this.capacity) {
      this.tokens = this.capacity;
      this.refillCompensation = 0;
      return;
    }

    const elapsedSeconds = nanosecondsToSeconds(elapsedNs);
    const replenished = elapsedSeconds * this.refillRatePerSecond;

    if (replenished <= 0) {
      return;
    }

    const missing = this.capacity - this.tokens;

    // Avoid unnecessary floating-point accumulation when this elapsed period
    // definitely fills the bucket.
    if (replenished >= missing || !Number.isFinite(replenished)) {
      this.tokens = this.capacity;
      this.refillCompensation = 0;
      return;
    }

    this.addTokens(replenished);

    if (this.tokens >= this.capacity) {
      this.tokens = this.capacity;
      this.refillCompensation = 0;
    }
  }

  /**
   * Kahan compensated summation for tiny continuous refill increments.
   */
  private addTokens(delta: number): void {
    const adjusted = delta - this.refillCompensation;
    const next = this.tokens + adjusted;
    this.refillCompensation = (next - this.tokens) - adjusted;
    this.tokens = next;
  }
}

function validatePositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and > 0; received ${value}`);
  }
}

function validateNonNegativeFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and >= 0; received ${value}`);
  }
}

/**
 * Converts bigint nanoseconds to seconds without first converting the entire
 * nanosecond value to Number, preserving useful precision for long uptimes.
 */
function nanosecondsToSeconds(nanoseconds: bigint): number {
  const wholeSeconds = nanoseconds / NS_PER_SECOND;
  const remainderNs = nanoseconds % NS_PER_SECOND;

  return Number(wholeSeconds) + Number(remainderNs) / 1_000_000_000;
}
```

Example with a deterministic test clock:

```ts
let now = 0n;

const bucket = new ContinuousTokenBucket({
  capacity: 10,
  refillRatePerSecond: 2,
  initialTokens: 0,
  clock: { nowNs: () => now },
});

console.log(bucket.tryAcquire(1)); // false

now += 500_000_000n; // 0.5 seconds => 1 token at 2 tokens/sec
console.log(bucket.tryAcquire(1)); // true

console.log(bucket.availableTokens()); // 0

export { ContinuousTokenBucket as ContinuousRateGovernor };
