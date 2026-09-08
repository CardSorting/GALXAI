# ADR 0080: Zero-Roundtrip Preflight and Vectorized Batch Sync Engine

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted (Supabase Migration 60, Applied & Cemented)

## Context
Standard API gateway request lifecycles required 4–6 serial database network roundtrips: (1) authenticate token, (2) verify wallet balance, (3) reserve QoS lease, (4) evaluate rate limit, (5) resolve shard routing, and (6) log access telemetry. This added 60ms–150ms of Time-To-First-Token (TTFT) latency before sending the first prompt token to the model.

## Decision
1. **Single-Hop Universal Gateway Preflight Procedure (`fn_gateway_preflight_qos_universal_v3`)**:
   - Executes auth verification, balance reservation, tier classification, shard selection, and IETF header generation in exactly **1 single atomic database hop** (< 5 ms).
2. **Vectorized Array Unnest Batch Settlement (`fn_vectorized_batch_settle_stream_leases_v3`)**:
   - Replaces per-chunk/per-stream database updates with asynchronous vectorized C-array unnest batches (`UNNEST($1, $2, $3)`), draining 100+ stream settlements in a single transaction.

## Consequences
- Cuts TTFT gateway overhead from >100ms down to <5ms.
- Decreases database write transaction load by 98%.
