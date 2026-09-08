# Telemetry and observability

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Inspect model availability separately from relay health and execution state. The [federation contract](FEDERATION_STRATEGY.md) defines these dimensions.

## Controller view

`/federation` is a public shell with administrator-authenticated data from `/api/capabilities`. It exposes model eligible counts, redundancy, shard/relay ownership, evidence states and freshness, streams, and capacity. Zero eligible shards is unavailable, one is fragile, and two or more is healthy redundancy. None of these labels is a latency SLA.

`/health` reports process liveness. Administrator `/health/ready` reports some routable capacity, not availability of every model. `/v1/models` lists eligible chat IDs; inspect image operation evidence separately.

## Worker view

Private worker telemetry, dashboards, and `/metrics` remain separate routes. The controller does not forward every worker endpoint. Authenticate against the specific component; do not publish administrator keys or operational snapshots to application users.

Trace request ID, task ID, requested model, execution model/routing mode, admission outcome, worker generation, and phase timings. A 202 is not completion. Output chunk counts are not tokenizer token counts. Relay first-output timing is not the user's display latency, and overlapping subagent durations cannot be summed into wall time.

## Staleness and retention

Label retained snapshots stale after failed refresh and clear privileged data on disconnect. Keep administrator keys in page memory. Show the affected model and next safe action; do not imply that a green process fixes unavailable capability.

Telemetry is observation-only and must not mutate authoritative account health. Sanitized trace storage excludes authorization and prompt/response content; job/checkpoint storage is a separate retention surface. Do not infer system-wide zero retention from sanitized telemetry.

Record live verification with environment, revision, date, and request ID. Historical samples and synthetic tests do not prove current availability or capacity. See [verification](INFERENCE_PIPELINE_VERIFICATION.md) and [troubleshooting](TROUBLESHOOTING.md).
