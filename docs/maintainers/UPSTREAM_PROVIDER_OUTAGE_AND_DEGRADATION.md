# Upstream outage and credential recovery

Identify the runtime first: the standalone relay and platform router have different state and recovery contracts. Use [routing](../ROUTING_ALGORITHMS.md) and [troubleshooting](../TROUBLESHOOTING.md) to locate the failing path.

## Standalone relay

1. Open administrator-authorized fleet and request telemetry. Correlate the trace/job ID and distinguish HTTP acceptance from final outcome.
2. Separate expired/inactive registry credentials, observed upstream authentication rejection, provider quota cooldown, local slot saturation, registry unavailability, and uncertain transport failure.
3. Rotate a rejected credential through the authoritative registry. The relay does not refresh provider credentials automatically. Its observed rejection is local and does not automatically revoke a row or notify another replica.
4. Honor provider cooldown and the single recovery probe. Do not repeatedly restart or resubmit requests to bypass cooldown, retry credits, or the request deadline.
5. Confirm recovery with a short authorized inference, not just health/readiness. Record the observation date and routed shard without exposing tokens or prompts.

Retries and failover are finite. Cancellation and job status remain available during registry failure. Restarted unfinished jobs fail explicitly; they are not automatically rerun, and cancellation does not create a refund transaction. A failed output stream may include partial output and must not be presented as an exactly-once completion.

## Platform and client boundaries

The database-backed platform pool has its own lease and governor policy. Inspect that path's logs and lease state rather than applying the relay's local scheduler assumptions. Cross-model/provider fallback must be explicitly supported by the selected adapter and product contract; never silently promise an equivalent result.

Bound SDK/client retries as well as server retries. Compaction is not a guaranteed outage workaround or fixed multiplier of provider capacity. External agent tool actions remain the responsibility of their execution runtime.

Use the [fleet runbook](RELAY_QUOTA_AND_FLEET.md), [regression checks](RELAY_HARDENING.md), and [deployment runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md).
