# Relay request and account telemetry

<!-- docs-scope: current-guide -->

Private investigation guide. [Telemetry overview](../TELEMETRY_AND_OBSERVABILITY.md) defines access and interpretation; [account management](../reference/relay-account-management.md) defines health and lifecycle authority.

## Isolated pools

Start from the fixed owning monitor and an opaque operation/account reference. Correlate central saved revision, runtime applied revision/epoch, execution reservation, central lease and terminal outcome. Monitor **Activity** reports saved management outcomes; it does not certify application by the runtime. Health filters distinguish sign-in expiry, unavailable access, cooldown, repeated failures and unconfirmed changes. Lost monitor/runtime contact is unknown health, not automatic account failure.

Use only scoped monitor status and authorized central/execution records. The execution projects hold own-pool identity/reservations/outcomes, not copied accounts or global metrics. Never query the peer to explain or supplement capacity. Runtime readiness, a running sign-in desktop, account enablement and completed provider execution are separate observations.

A failed terminal write blocks new local admission while original settlement retries. Restarted incomplete work becomes unknown; retained records cannot authorize redispatch or guarantee artifact retrieval after engine/epoch loss. Follow [request recovery](../RELAY_API_REFERENCE.md#request-recovery).

## Retained federation

For operations accepted by the existing single controller, correlate task, account, worker generation, admission, execution and signed recovery references. Its `/api/telemetry` and `/api/monitor/state` expose separate administrator/read-only projections; worker traces remain bounded and private. Its generation-bound URLs and retained-volume text receipt exception are documented in [legacy API recovery](../reference/legacy-federation-api.md#request-recovery), not inherited by the new runtimes.

## Evidence and product settlement

Allowlist safe event fields. Exclude credentials, prompts, generated output, raw provider errors and guest files. Telemetry does not change account health, issue grants or authorize retry. Check freshness and missing observations before interpreting totals. Use [hardening checks](RELAY_HARDENING.md) for source changes.

For historical fixed-price Sites operations only, distinguish execution completion, token-usage availability and wallet settlement. A matching completed durable receipt can settle with null token usage; `pending` or `unknown` completion retains the hold. The private `fixed_completion` basis identifies a flat charge, not a supplier-cost measurement. Correlate the account operation, saved receipt reference and wallet transaction under authorized server access. Monitor unresolved age and receipt-store capacity using retained operational records; this change does not add a background reconciler or promise an automatic dashboard for those measures. See [Sites operations](SITES_OPERATIONS.md).

New Sites work uses included generation and shared fair usage. Correlate admission, original durable outcome and publication separately; no new wallet settlement is implied. See [current Sites policy](SITES_FAIR_USAGE.md).
