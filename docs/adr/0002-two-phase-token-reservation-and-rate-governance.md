# ADR 0002: 2-Phase Token Reservation & Continuous Calculus Rate Governance

## Status
**Accepted** (Implemented and Verified)

## Context
Under high concurrent loads, naive token bucket rate governors suffer from **quota over-allocation races**:
- If 20 parallel workers evaluate a bucket with 100,000 available tokens, all 20 workers may decide they have sufficient capacity to launch a 50,000-token completion simultaneously (totaling 1,000,000 tokens), causing 19 upstream HTTP 429 failures.
- Fixed-window replenishment causes burst clumping at the start of each minute interval.
- Upstream rate limit headers return complex duration expressions (`"6m0s"`, `"1.25s"`, `"150ms"`) and dynamic limit resets that require continuous calibration.

## Decision
We designed and implemented the **Continuous Mathematical Token-Bucket Rate Governor** with **2-Phase Token Reservation**:

### 1. Continuous Fractional Replenishment Calculus
Instead of discrete timer ticks, tokens replenish continuously as a linear function of elapsed microsecond time:
$$\text{Tokens}_{\text{new}} = \min\left(\text{maxTokens}, \text{remainingTokens} + \Delta t_{\text{minutes}} \times \text{refillRatePerMinute}\right)$$
- Preserves sub-millisecond fractional remainders to eliminate quantization drift under rapid burst queries.
- Clock-skew immune against backward NTP time synchronization adjustments.

### 2. 2-Phase Atomic Token Reservation Protocol
- **Phase 1 (`reserve`)**: When an execution lease is acquired by a gateway worker, the governor locks the estimated tokens (`reservedTokens`) in the account's bucket.
  $$\text{AvailableUnreserved} = \max(0, \text{remainingTokens} - \text{reservedTokens})$$
- **Phase 2 (`commit`)**: When the upstream response completes (or stream closes), the actual tokens consumed are deducted, and the soft reservation is released.
- **Scavenger Auto-Recovery**: If a worker crashes or encounters an unhandled timeout, the background lease scavenger automatically releases the soft reservation.

### 3. Bidirectional Upstream Header Ingestion
- Autoritatively reconciles bucket state with upstream response headers (`x-ratelimit-remaining-tokens`, `x-ratelimit-remaining-requests`, `x-ratelimit-limit-tokens`).
- Parses upstream reset durations (`x-ratelimit-reset-tokens`) to dynamically re-tune replenishment velocity:
  $$\text{refillRatePerMinute} = \frac{\text{maxTokens} - \text{remainingTokens}}{\Delta t_{\text{resetMinutes}}}$$

## Consequences
- **Positive**: Complete immunity against parallel concurrency stampedes and over-allocation races.
- **Positive**: Continuous smooth replenishment eliminates periodic burst spikes.
- **Positive**: Synchronized with live upstream provider rate limits.
