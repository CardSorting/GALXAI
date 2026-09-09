# Federation request telemetry

<!-- docs-scope: current-guide -->
> Private request investigation. [Telemetry overview](../TELEMETRY_AND_OBSERVABILITY.md) defines access and retention.

Start with the affected operation's opaque request ID and safe activity code. Correlate task, shard, worker generation, admission, execution and recovery phases. Do not infer completion from acceptance, an open socket or nonzero chunks.

The controller exposes aggregated `/api/telemetry` to server-side admins and `/api/monitor/state` to delegated read-only monitor sessions. Worker traces remain bounded and private. Inspect freshness and missing workers before interpreting counts.

Separate unknown admission, accepted job transport failure, expired generation and completed result not retained. Follow [request recovery](../RELAY_API_REFERENCE.md#request-recovery); changing a key to bypass a receipt can duplicate work.

Allowlist event fields. Exclude tokens, authorization, prompts, responses, raw provider errors, login files and guest output. Keep execution identifiers in private records. Telemetry never changes registry health or authorizes retry. See [source](../../src/relay/federation-telemetry.ts) and [hardening checks](RELAY_HARDENING.md).
