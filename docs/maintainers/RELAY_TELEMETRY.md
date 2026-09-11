# Federation request telemetry

<!-- docs-scope: current-guide -->
> Private request investigation. [Telemetry overview](../TELEMETRY_AND_OBSERVABILITY.md) defines access and retention.

Start with the affected operation's opaque request ID and safe activity code. Correlate task, shard, worker generation, admission, execution and recovery phases. Do not infer completion from acceptance, an open socket or nonzero chunks.

The controller exposes aggregated `/api/telemetry` to server-side admins and `/api/monitor/state` to delegated read-only monitor sessions. Worker traces remain bounded and private. Inspect freshness and missing workers before interpreting counts.

Separate unknown admission, accepted job transport failure, expired generation and completed result not retained. Follow [request recovery](../RELAY_API_REFERENCE.md#request-recovery); changing a key to bypass a receipt can duplicate work.

Allowlist event fields. Exclude tokens, authorization, prompts, responses, raw provider errors, login files and guest output. Keep execution identifiers in private records. Telemetry never changes registry health or authorizes retry. See [source](../../src/relay/federation-telemetry.ts) and [hardening checks](RELAY_HARDENING.md).

For fixed-price Sites, distinguish execution completion, token-usage availability and wallet settlement. A matching completed durable receipt can settle with null token usage; `pending` or `unknown` completion retains the hold. The private `fixed_completion` basis identifies a flat charge, not a supplier-cost measurement. Correlate the account operation, saved receipt reference and wallet transaction under authorized server access. Monitor unresolved age and receipt-store capacity using retained operational records; this change does not add a background reconciler or promise an automatic dashboard for those measures. See [Sites operations](SITES_OPERATIONS.md).
