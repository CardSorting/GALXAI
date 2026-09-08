# ADR 0019: Autonomous Shard Health Probes & Multi-Tenant Budget Governance

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted & Implemented**

## Context
Operating multi-tenant developer platforms requires continuous visibility into provider shard health, automatic isolation of degraded shards, and automated budget threshold alerting (50%, 80%, 100%) to prevent unexpected customer overages.

## Decision
1. **Continuous Shard Health Probes (`galx_shard_health_probes`)**:
   - Edge workers record latency and HTTP status telemetry for every invocation.
   - `fn_report_shard_health_cf`: Stored procedure that calculates rolling failure rates over the last 10 probes and automatically transitions shard states:
     - 2 consecutive failures $\to$ `degraded`
     - 5 consecutive failures $\to$ `draining` (pulled from routing pool)
     - 0 consecutive failures $\to$ `healthy` (restored to active rotation)
2. **Multi-Tenant Budget Governance (`galx_budget_alerts`)**:
   - Workspaces configure budget threshold alert policies.
   - `fn_check_budget_thresholds`: Stored procedure calculating current spend percentage and triggering webhook alerts at 50%, 80%, and 100% capacity.
3. **Edge Webhook Dispatcher (`GalxEdgeWebhookDispatcher`)**:
   - Outbound webhook delivery executed on Cloudflare Workers with HMAC-SHA256 signing and exponential backoff retry schedules.

## Consequences
### Positive
- **Self-Healing Infrastructure**: Degraded shards are quarantined automatically without operator intervention.
- **Proactive Budget Protection**: Customers receive instant webhook alerts before hitting hard spend caps.
- **Auditable Delivery**: All webhook dispatches are logged in `galx_webhook_deliveries`.
