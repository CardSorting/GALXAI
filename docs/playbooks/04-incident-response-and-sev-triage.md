# Incident response

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Assess user impact by affected model and operation, tenant scope, and execution state. Assign an incident owner and a measured update cadence appropriate to the impact; this guide does not establish contractual response SLAs.

Inspect controller reachability, authenticated capability state, worker generation, request/receipt scope, and upstream classification. Distinguish capability denial, saturation, cooldown, transport failure, and entitlement rejection.

Open the host-launched monitor and linked desktop for structured activity and repair. Use an explicit hold to preserve inspection context; it blocks new work/replacements but cannot override revoked, expired or rotated authority. Review sign-in, registry sync and worker readiness independently.

Keep unaffected pools serving. Reconcile accepted or uncertain work before retry. Never force healthy state from stale telemetry or increase retries to hide an unknown outcome. Record sanitized evidence, mitigation, and actual-client verification.

Use the [current contract](../FEDERATION_STRATEGY.md), [operator runbook](../RELAY_VNEXT_RUNBOOK.md), [request recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [maintainer execution guide](../maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md).
