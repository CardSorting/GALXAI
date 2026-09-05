// token-bucket-rate-governor.ts
//
// Requires TypeScript target ES2020 or newer because it uses bigint.
//
// This is an in-process token bucket. Calls to tryAcquire are atomic within one
// JavaScript event loop because the method contains no await/yield points.

export interface MonotonicClock {
  /** Monotonic time in nanoseconds. */
  nowNs(): bigint;
}

export interface TokenBucketOptions {
  /**
   * Maximum number of tokens that may be retained.
   * Must be finite and > 0.
   */
  capacity: number;

  /**
   * Continuous refill rate in tokens per second.
   * Must be finite and >= 0.
   */
  refillRatePerSecond: number;

  /**
   * Tokens initially present in the bucket.
   * Defaults to capacity.
   */
  initialTokens?: number;

  /**
   * Injectable for deterministic tests or platform-specific clocks.
   * Defaults to process.hrtime.bigint() in Node.js and performance.now() in
   * browsers/workers.
   */
  clock?: MonotonicClock;
}

const NS_PER_SECOND = 1_000_000_000n;
const NS_PER_SECOND_NUMBER = 1_000_000_000;

/**
 * Creates the highest-resolution monotonic clock available on the runtime.
 *
 * Node.js: process.hrtime.bigint() -- nanosecond-resolution monotonic source.
 * Browser: performance.now() -- monotonic, usually microsecond or better,
 * although browser privacy settings may intentionally reduce its resolution.
 */
export function createDefaultMonotonicClock(): MonotonicClock {
  const nodeProcess = (
    globalThis as unknown as {
      process?: {
        hrtime?: {
          bigint?: () => bigint;
        };
      };
    }
  ).process;

  const hrtime = nodeProcess?.hrtime;
  if (typeof hrtime?.bigint === "function") {
    return {
      nowNs: () => hrtime.bigint!(),
    };
  }

  const browserPerformance = (
    globalThis as unknown as {
      performance?: {
        now?: () => number;
      };
    }
  ).performance;

  if (typeof browserPerformance?.now === "function") {
    return {
      nowNs: () => {
        const milliseconds = browserPerformance.now!();

        if (!Number.isFinite(milliseconds)) {
          throw new Error("performance.now() returned a non-finite value");
        }

        // Convert milliseconds to nanoseconds. This preserves sub-millisecond
        // precision when the underlying browser clock provides it.
        return BigInt(Math.round(milliseconds * 1_000_000));
      },
    };
  }

  throw new Error(
    "No monotonic high-resolution clock is available. Supply TokenBucketOptions.clock.",
  );
}

/**
 * A lazily-refilled, continuous token-bucket rate governor.
 *
 * Refill is computed from monotonic elapsed time on every operation; no timer,
 * interval, background task, or event-loop scheduling is involved.
 */
export class ContinuousTokenBucketRateGovernor {
  public readonly capacity: number;
  public readonly refillRatePerSecond: number;

  private readonly clock: MonotonicClock;
  private _availableTokens: number;
  private lastRefillNs: bigint;

  public constructor(options: TokenBucketOptions) {
    assertFinitePositive("capacity", options.capacity);
    assertFiniteNonNegative(
      "refillRatePerSecond",
      options.refillRatePerSecond,
    );

    const initialTokens = options.initialTokens ?? options.capacity;
    assertFiniteNonNegative("initialTokens", initialTokens);

    if (initialTokens > options.capacity) {
      throw new RangeError(
        `initialTokens (${initialTokens}) must not exceed capacity (${options.capacity})`,
      );
    }

    this.capacity = options.capacity;
    this.refillRatePerSecond = options.refillRatePerSecond;
    this.clock = options.clock ?? createDefaultMonotonicClock();
    this._availableTokens = initialTokens;
    this.lastRefillNs = this.readClock();
  }

  /**
   * Attempts to consume `tokens` immediately.
   *
   * Returns true and deducts tokens when enough capacity is available.
   * Returns false without deducting anything otherwise.
   *
   * A request for zero tokens succeeds. Negative, NaN, and infinite requests
   * throw RangeError.
   *
   * Requests larger than capacity can never succeed.
   */
  public tryAcquire(tokens: number): boolean {
    assertFiniteNonNegative("tokens", tokens);

    this.refill(this.readClock());

    if (tokens === 0) {
      return true;
    }

    if (tokens > this.capacity || tokens > this._availableTokens) {
      return false;
    }

    this._availableTokens -= tokens;

    // Avoid exposing -0 due to unusual floating-point inputs/operations.
    if (this._availableTokens <= 0) {
      this._availableTokens = 0;
    }

    return true;
  }

  /**
   * Returns currently available tokens after applying elapsed continuous refill.
   *
   * Reading this property updates internal refill state, just as tryAcquire does.
   */
  public get availableTokens(): number {
    this.refill(this.readClock());
    return this._availableTokens;
  }

  /**
   * Returns the number of milliseconds until `tokens` could be acquired,
   * assuming no other caller consumes tokens first.
   *
   * Returns:
   * - 0 if enough tokens are currently available
   * - Infinity if the request exceeds capacity or refill rate is zero
   */
  public retryAfterMs(tokens: number): number {
    assertFiniteNonNegative("tokens", tokens);

    this.refill(this.readClock());

    if (tokens <= this._availableTokens) {
      return 0;
    }

    if (tokens > this.capacity || this.refillRatePerSecond === 0) {
      return Infinity;
    }

    return (
      ((tokens - this._availableTokens) / this.refillRatePerSecond) * 1_000
    );
  }

  private refill(nowNs: bigint): void {
    // A true monotonic clock should never move backwards. Clamp backward clock
    // movement defensively: it must never mint tokens.
    if (nowNs <= this.lastRefillNs) {
      return;
    }

    const elapsedNs = nowNs - this.lastRefillNs;
    this.lastRefillNs = nowNs;

    if (
      this._availableTokens >= this.capacity ||
      this.refillRatePerSecond === 0
    ) {
      return;
    }

    /*
     * Split bigint nanoseconds into whole seconds + residual nanoseconds.
     * This avoids converting an absolute nanosecond timestamp to number, which
     * would lose precision after sufficiently long process uptime.
     */
    const wholeSeconds = elapsedNs / NS_PER_SECOND;
    const residualNs = elapsedNs % NS_PER_SECOND;

    const elapsedSeconds =
      Number(wholeSeconds) + Number(residualNs) / NS_PER_SECOND_NUMBER;

    const addedTokens = this.refillRatePerSecond * elapsedSeconds;

    // Infinity can occur only for extraordinarily large elapsed intervals.
    // Saturating to capacity is correct for a bounded bucket.
    if (
      !Number.isFinite(addedTokens) ||
      addedTokens >= this.capacity - this._availableTokens
    ) {
      this._availableTokens = this.capacity;
      return;
    }

    this._availableTokens += addedTokens;

    // Guard against floating-point roundoff.
    if (this._availableTokens > this.capacity) {
      this._availableTokens = this.capacity;
    }
  }

  private readClock(): bigint {
    const now = this.clock.nowNs();

    if (typeof now !== "bigint") {
      throw new TypeError("MonotonicClock.nowNs() must return a bigint");
    }

    return now;
  }
}

function assertFinitePositive(name: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than zero`);
  }
}

function assertFiniteNonNegative(name: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${name} must be a finite number greater than or equal to zero`,
    );
  }
}
```

Example:

```ts
const governor = new ContinuousTokenBucketRateGovernor({
  capacity: 100,
  refillRatePerSecond: 25,
});

// true, bucket now has 90 tokens
console.log(governor.tryAcquire(10));

// true/false depending on elapsed monotonic time and other acquisitions
console.log(governor.tryAcquire(95));

console.log(governor.availableTokens);
console.log(governor.retryAfterMs(50));
```

For deterministic tests:

```ts
let now = 0n;

const governor = new ContinuousTokenBucketRateGovernor({
  capacity: 10,
  refillRatePerSecond: 2,
  clock: { nowNs: () => now },
});

console.log(governor.tryAcquire(10)); // true
console.log(governor.tryAcquire(1));  // false

now += 500_000_000n; // 0.5 seconds => 1 token
console.log(governor.tryAcquire(1));  // true
```

This governor is process-local. It does not provide a globally shared distributed limit across Node processes, containers, browser tabs, or machines. A distributed rate limit requires an atomic shared-state operation, such as a Redis Lua script, a strongly consistent datastore transaction, or a dedicated rate-limiting service.

export { ContinuousTokenBucket as ContinuousRateGovernor };
