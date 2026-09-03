export interface TokenBucketConfig {
  capacity: number;
  refillRatePerSec: number;
}

export class ContinuousRateGovernor {
  private tokens: number;
  private lastRefillMs: number;

  constructor(private readonly config: TokenBucketConfig) {
    this.tokens = config.capacity;
    this.lastRefillMs = Date.now();
  }

  public tryAcquire(requestedTokens = 1): { allowed: boolean; remaining: number } {
    this.refill();
    if (this.tokens >= requestedTokens) {
      this.tokens -= requestedTokens;
      return { allowed: true, remaining: this.tokens };
    }
    return { allowed: false, remaining: this.tokens };
  }

  private refill(): void {
    const now = Date.now();
    const deltaSec = (now - this.lastRefillMs) / 1000;
    this.tokens = Math.min(
      this.config.capacity,
      this.tokens + deltaSec * this.config.refillRatePerSec
    );
    this.lastRefillMs = now;
  }
}