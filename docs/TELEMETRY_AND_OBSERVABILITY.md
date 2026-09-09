# Telemetry and observability

<!-- docs-scope: current-guide -->
> Private operations. See [the contract](FEDERATION_STRATEGY.md) and [activity UX](maintainers/RELAY_TELEMETRY_UX.md).

## Controller view

Open `npm run relay:open` on the host. A delegated read-only session loads the private interface without a browser admin key. The session reads `/api/monitor/state`; server-side administrators can read aggregated `/api/telemetry` or `/api/capabilities`. Anonymous pages contain generic connection guidance only.

Read the requested model's eligible count, evidence freshness, capacity and traffic state before overall process health. Zero eligible workers means unavailable, one means fragile redundancy, and two or more means redundant eligibility. None is a throughput or latency SLA.

`/health` is liveness; admin `/health/ready` means some capacity is routable, not that every model works. Chat inventory and image evidence are separate.

## Worker view

Controller telemetry aggregates bounded worker observations with explicit freshness/partial state. It does not proxy every worker route. Worker metrics, detailed traces and real image probes remain private administrator surfaces.

Trace safe event code, timestamp, request/task ID, shard/worker generation, operation phase, outcome and retry state as available. A 202 is acceptance, not completion. Chunk counts are not tokenizer tokens; first-output timing is not client display latency. Overlapping durations cannot be summed into wall time.

## Activity and quick views

Activity provides structured reasons and safe next actions. Filter and correlate a request or workspace without exposing prompts, output, tokens, provider payloads or guest terminal contents. Desktop connection, shard capability, traffic hold, saved login and synchronized authority have distinct states. Quick views preserve this separation.

## Staleness and retention

Label retained snapshots stale after refresh failure and clear privileged state on disconnect. Stop authorization retries until the operator reconnects. Missing/partial data must not become zero activity or healthy capacity.

Telemetry is observation-only; it cannot mutate authoritative account health. Sanitized traces are separate from job checkpoints, guest homes and receipts, which can contain sensitive content. Record environment, revision, date and request ID for live verification. Historical samples do not prove current capacity.
