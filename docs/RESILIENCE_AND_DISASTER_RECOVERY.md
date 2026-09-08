# Resilience and recovery

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Recovery follows the authority that owns the failed operation. The [federation contract](FEDERATION_STRATEGY.md) separates capability, shard lifecycle, admission, and database health.

| Failure | Effect | Recovery |
| --- | --- | --- |
| Explicit model denial | Remove only that shard/model from new routing | Fresh authoritative rediscovery after stabilization |
| Empty capability inventory | Keep worker in `CAPABILITY_EMPTY` | Continue bounded discovery; no automatic restart |
| Generic route error, timeout, or throttling | Does not prove model permission loss | Classify attributable failure and preserve backoff |
| Invalid/deleted/expired credential | Remove mappings, drain/retire worker | Valid credential revision and normal reconciliation |
| Stale health or discovery result | Cannot overwrite newer authority | Discard stale observation; await fresh evidence |
| Lost admission acknowledgement | Execution uncertain | Reconcile receipt/job/trace; no blind replay |
| Existing job transport failure | Accepted work remains authoritative | Retry original signed URL |
| Worker replacement | Old job generation unavailable | Report explicit loss; never attach to new worker |
| Controller restart | Process-local receipts lost | Use scope precondition and external operation tracking |
| Model pool saturation | Only that capability lacks capacity | Honor retry guidance; do not borrow unrelated shards |

Accepted streams survive capability removal unless their actual execution fails. SSE replay and checkpoints are bounded; they are not durable execution logs. A partial stream, disconnected socket, or cancellation does not prove completed work or refund eligibility.

Database cooldown recovery uses current lease authority and a serialized probe after an explicit deadline. Observation-only telemetry cannot clear cooldowns. Local connection pressure does not justify declaring the whole database unavailable or replaying ambiguous SQL.

## Incident flow

Identify component, requested capability, request/task ID, execution state, worker generation, and evidence timestamps. Inspect model-specific eligibility before changing capacity. Keep healthy pools serving while invalid workers drain. Record sanitized facts and uncertainty; do not reset health to make a dashboard green.

Use [deployment rollback](RELAY_VNEXT_RUNBOOK.md) only after stopping admissions and draining the active topology. Preserve signed-job state and checkpoint volumes. Never operate legacy and vNext workers against the same shard simultaneously. Multi-host failover is not implemented by the single-host controller lock.

Synthetic tests establish failure isolation under fixtures. Dated production evidence belongs in an ADR; it is not a throughput SLA. Application assets, financial settlement, and external agent tools each require their own recovery procedure.
