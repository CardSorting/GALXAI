# ADR 0068: Dual Rolling Window Seat Quotas and Distributed Request Leases

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

**Status:** Accepted & Implemented  
**Date:** 2026-08-29  
**Deciders:** Principal Architecture & Sovereign Infrastructure Team  
**Consulted:** Core Backend, Database Engineering, Product Governance  
**Informed:** Developer Experience, Security & Billing  

---

## 1. Context and Problem Statement

Enterprise AI platform utilization differs fundamentally between raw API compute consumption (measured in dollar-denominated token credit balances) and organizational seat entitlements (allocated to human developers, analysts, and automated worker instances). 

Previously, seat limits suffered from two primary architectural flaws:
1. **Monolithic Static Quotas**: Fixed daily or monthly limits created artificial "end-of-cycle cliffs" where users were suddenly throttled without granular recovery, or underutilized during low-traffic periods.
2. **Race Conditions in Stream Concurrency**: When multiple streaming sessions or agents operated concurrently under a single seat, static database counters experienced lock contention or over-allocation without automatic lease expiration.

We required a high-velocity, human-centric seat governance engine that:
- Reflects realistic enterprise developer workflows via **Dual Rolling Windows** (a fast-recovery 5-Hour burst window and a durable 7-Day weekly window).
- Computes natural language reset countdowns (e.g., `"55% Weekly remaining • resets in 3 days"`, `"90% 5-Hour remaining • resets in 4 hours, 17 minutes"`).
- Employs **Expiring Idempotent Seat Leases** to prevent runaway concurrent streams across distributed worker nodes.

---

## 2. Decision Drivers

- **Zero-Contention Concurrency**: Ensure concurrent streaming sessions do not cause row-level locks or database thrashing.
- **Idempotency & Lease Safety**: Ensure network drops or worker crashes automatically release reserved concurrency slots via TTL expiration without manual intervention.
- **Single-Hop Gate Evaluation**: Combine tier verification, monthly spend caps, 5-hour burst limits, weekly quotas, and concurrency leases into a single database roundtrip.
- **Human-Centric Ergonomics**: Present clear percentage gauges and exact time-to-full-refresh strings.

---

## 3. Considered Options

1. **Option A: Redis / In-Memory Token Bucket with Periodic Database Sync**
   - *Pros*: Very fast write throughput.
   - *Cons*: Introduces another stateful operational dependency; split-brain risk on network partitions; lack of transactional ACID guarantees with billing ledgers.
2. **Option B: Pure Database Event Sourcing with Unindexed Sliding Scans**
   - *Pros*: Fully transactional.
   - *Cons*: Heavy aggregate queries (`SUM(units) OVER (...)`) on every inbound request without state caching or index acceleration.
3. **Option C (Selected): Hybrid PostgreSQL Composite Stored Procedures with Expiring Leases (`galx_seat_request_leases`) & Dual Rolling Indices**
   - *Pros*: Executes in $<1.5\text{ms}$ in PostgreSQL using btree indices on `(user_id, created_at DESC)` and `(expires_at)`; single-hop execution via `fn_evaluate_and_acquire_seat_gate_v2` and `fn_settle_seat_stream_completion_composite_v2`; 100% ACID compliance and zero external dependencies.

---

## 4. Decision Outcome

We selected **Option C** and implemented **PostgreSQL Migrations V44, V45, and V53**:

### 4.1. Core Schema Additions
- **`galx_seat_rolling_usage_events`**: High-velocity immutable event log capturing units, tokens, USD cost, and timestamps for sliding window aggregation.
- **`galx_seat_rolling_windows_state`**: Materialized rolling window states and concurrency limits.
- **`galx_seat_request_leases`**: Distributed request leases tracking in-flight reservations with automatic TTL expiration (`expires_at`), terminal state checks (`settled_at`, `released_at`), and user isolation.

### 4.2. Atomic 1-Hop Stored Procedures
- **`fn_evaluate_and_acquire_seat_gate_v2`**: Atomically validates seat status, monthly spend cap, 5-hour capacity, weekly capacity, and concurrency headroom; creates an expiring lease in 1 single transaction.
- **`fn_settle_seat_stream_completion_composite_v2`**: Atomically records actual token/unit usage, updates aggregate state, logs telemetry, and marks the request lease as settled.
- **`fn_release_seat_request_lease`**: Idempotently releases unfulfilled or cancelled request leases.
- **`fn_format_rolling_duration`**: Pure immutable duration formatter outputting human strings (e.g. `"4 hours, 17 minutes"` or `"3 days"`).

---

## 5. Consequences

### Positive
- **Instant Burst Headroom**: Users recover 5-hour quota continuously throughout the working day.
- **Leak-Proof Concurrency**: Dropped client streams automatically expire after their TTL (`180s`), preventing orphaned concurrency slots.
- **Sub-Millisecond Preflight**: Single-hop composite CTEs execute pre-inference validation in $<1.5\text{ms}$.

### Negative / Trade-offs
- Requires periodic vacuuming of `galx_seat_rolling_usage_events` and `galx_seat_request_leases` (mitigated by partial and composite btree indices).
