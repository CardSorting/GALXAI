# ADR 0113: Long-running inference experiments and relay recovery scope

- Status: Simulation design; deployed relay behavior superseded by ADR 0122
- Original decision date: 2026-09-04
- Reconciled with implementation: 2026-09-07
- Experimental sources: `simulations/high-concurrency-10k-fairness/`

## Context

Long-running inference motivated experiments with priority classes, inter-token watchdogs, standby handover, disconnect leases, and replay. Those experiments must not be presented as the deployed standalone relay's scheduler, performance, or billing behavior.

## Decision retained for experiments

Simulation modules may evaluate class-based scheduling, shadow capacity, and synthetic workloads. Their outcomes are evidence only for the harness and inputs tested. They do not establish production throughput, failover latency, service-level guarantees, or real provider capacity.

## Deployed transport decision

The Node relay uses per-process shard concurrency, bounded admission and output buffering, per-attempt watchdogs, an absolute job deadline, bounded retry credits, and a downstream reconnect grace period. Selection uses local in-flight load and rotating tie-breaking. It does not implement the experimental class reservation scheduler or a prewarmed shadow shard pool.

SSE replay is available only while output remains in process memory. Checkpoints do not persist live sockets or replay buffers; unfinished jobs recover as failures after restart. Cancellation closes transport and releases local capacity, but does not perform a wallet refund or prove that remote computation stopped instantly.

No experiment should be wired into production without a new decision, real failure-mode tests, and validation against registry and job ownership boundaries.

[ADR 0122](0122-isolated-authenticated-relay-and-bounded-recovery.md) · [Recovery runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) · [Relay API](../RELAY_API_REFERENCE.md)
