# Application queues and relay jobs

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

The federation has no global waiting queue that lends unrelated model capacity. Admission is specific to the requested capability pool. See the [routing contract](FEDERATION_STRATEGY.md#eligibility-before-load).

## Accepted relay work

A chat `202` returns signed job identity, status, and stream URLs. Keep those URLs and attach to the original worker generation. Existing worker jobs retain model identity. Capability removal prevents new work but does not cancel accepted jobs.

Parent agents assign one key per logical operation and preserve the same payload when recovering acknowledgement. Children have independent operation keys and bounded concurrency; task IDs are correlation only. An unknown acknowledgement must not become another queued synthesis attempt.

Admission receipts provide bounded process-local acknowledgement recovery. A controller restart or expired admission receipt can remove deduplication evidence. Separately, opted-in Sites text jobs persist completion receipts on the original worker volume. Their signed receipt references can reach a replacement worker on that retained volume, while stream/status/cancel URLs retain generation binding. This does not create a distributed queue or permit another execution after uncertainty. See [ADR 0135](adr/0135-durable-sites-receipts-and-local-admission.md) and the [recovery table](RELAY_API_REFERENCE.md#request-recovery).

Fixed-price Sites admission also requires fresh local-profile readiness and an account wallet reservation. Its rolling account allowance is serialized in PostgreSQL; it is independent of federation capacity reservations. Queue time is included in the worker's local wall-time bound. See [Sites operations](maintainers/SITES_OPERATIONS.md).

## Throughput isolation

Status polling has per-worker limits, a bounded concurrent batch, fair rotation, and per-job backoff. Worker control/status requests use a separate rate bucket from inference admission. Reservations are generation-scoped, so stale jobs do not consume replacement-worker capacity.

Application task tables, SDK queues, edge coordinators, and billing leases are separate systems. Their scheduling, persistence, retries, cancellation, and settlement guarantees do not transfer to relay jobs. Any future federation queue must retain model tags, tenant identity, deadline, bounded storage, and original execution authority; it must not silently substitute models.
