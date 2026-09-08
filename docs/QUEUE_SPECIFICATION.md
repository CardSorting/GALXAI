# Application queues and relay jobs

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

The federation has no global waiting queue that lends unrelated model capacity. Admission is specific to the requested capability pool. See the [routing contract](FEDERATION_STRATEGY.md#eligibility-before-load).

## Accepted relay work

A chat `202` returns signed job identity, status, and stream URLs. Keep those URLs and attach to the original worker generation. Existing worker jobs retain model identity. Capability removal prevents new work but does not cancel accepted jobs.

Parent agents assign one key per logical operation and preserve the same payload when recovering acknowledgement. Children have independent operation keys and bounded concurrency; task IDs are correlation only. An unknown acknowledgement must not become another queued synthesis attempt.

Receipts are bounded process-local acknowledgement recovery, not a durable distributed queue. A controller restart or expired receipt can remove deduplication evidence. See the [recovery table](RELAY_API_REFERENCE.md#request-recovery) for scope preconditions and accepted/unknown outcomes.

## Throughput isolation

Status polling has per-worker limits, a bounded concurrent batch, fair rotation, and per-job backoff. Worker control/status requests use a separate rate bucket from inference admission. Reservations are generation-scoped, so stale jobs do not consume replacement-worker capacity.

Application task tables, SDK queues, edge coordinators, and billing leases are separate systems. Their scheduling, persistence, retries, cancellation, and settlement guarantees do not transfer to relay jobs. Any future federation queue must retain model tags, tenant identity, deadline, bounded storage, and original execution authority; it must not silently substitute models.
