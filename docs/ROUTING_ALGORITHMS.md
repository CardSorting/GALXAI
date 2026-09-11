# Capability-first routing

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

The [federation contract](FEDERATION_STRATEGY.md) is authoritative. Model eligibility precedes load selection; shards are heterogeneous.

## Selection

1. Require an explicit model and distinguish chat from image operations.
2. Read that capability's reverse index; do not scan or borrow unrelated pools.
3. Require fresh available evidence, valid ownership, eligible credential state, and healthy non-draining relay state.
4. Apply dependencies, including fresh execution-model access for the verified Codex image alias.
5. Compare recent upstream errors, active streams, latency, queue depth, and remaining capacity among eligible candidates.
6. Reserve the selected worker's capacity while admission is acknowledged and until fresh health accounts for the job.

An empty eligible pool produces `model_temporarily_unavailable`; a full eligible pool produces `model_capacity_exhausted`. Both use HTTP 503. There is no silent model substitution, federation-wide overflow queue, or machine-learning scheduler.

## Changes during traffic

Authenticated inventory refreshes and authoritative provider observations update the index. A denied model disappears from new routing without destroying the worker. Empty inventory remains alive for rediscovery. Active streams and generation-bound job URLs retain their existing lifecycle.

Generic route errors, throttling, and transport failures do not prove absent model permission. A restoration hold limits flapping; newer inventory and per-model observation versions fence stale successes and failures. Worker process restarts invalidate old health even when Docker container identity stays the same.

## Capacity and fairness

Reservations are generation-scoped. An unknown acknowledgement retains a conservative bounded reservation instead of replaying synthesis. Completed admission-receipt retrieval precedes eligibility checks. Durable Sites completion reads use their saved original-shard identity and retained receipt store; they do not select a new execution worker by model eligibility. Bounded per-worker job polling and independent control traffic protect unrelated pools from a busy shard.

For fixed-price Sites, the federation checks the local receipt profile on all eligible workers during administrator readiness and on the selected worker after reserving capacity, before dispatch. A selected-worker failure releases that pre-dispatch reservation. The local profile permits one provider attempt and no automatic retry; general SDK retry policies cannot widen that contract. See [ADR 0135](adr/0135-durable-sites-receipts-and-local-admission.md).

Application SDK `fallbackCascade` and `race` are explicit multi-model policies with separate execution/cost implications. They do not change this federation contract or make ambiguous retries safe.

See [rate limits](RATE_LIMITS_AND_QUOTAS.md), [queues](QUEUE_SPECIFICATION.md), and the [runbook](RELAY_VNEXT_RUNBOOK.md) for effective bounds.
