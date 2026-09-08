# GALX documentation

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Start with the [federation contract](FEDERATION_STRATEGY.md): one active shard owns one relay container, and fresh model capability precedes load selection. The documented Codex image-tool route is an explicit verified compatibility alias with provider-managed image selection.

Internal maintainer navigation: public-facing guidance follows [ADR 0129](adr/0129-public-image-artifacts-and-verified-identity.md) and the [image boundary guide](maintainers/image-public-boundary.md). Repository operational records must not be copied into site content. The September 8 changes are locally verified; deployment and origin remediation require separate evidence.

## Find the next action

| Task | Guide |
| --- | --- |
| Integrate an application | [Quickstart](QUICKSTART.md), [API boundaries](API_BASE_URL.md), [model availability](MODEL_CATALOG.md) |
| Understand ownership and routing | [Architecture](ARCHITECTURE.md), [routing](ROUTING_ALGORITHMS.md) |
| Recover an accepted or uncertain request | [Relay API](RELAY_API_REFERENCE.md#request-recovery), [troubleshooting](TROUBLESHOOTING.md) |
| Deploy or roll back | [vNext runbook](RELAY_VNEXT_RUNBOOK.md), [deployment boundaries](DEPLOYMENT.md) |
| Inspect model pools | [Observability](TELEMETRY_AND_OBSERVABILITY.md), [fleet operations](maintainers/RELAY_QUOTA_AND_FLEET.md) |
| Organize parent/subagent work | [Maintainer execution guide](maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md) |
| Verify behavior | [Inference verification](INFERENCE_PIPELINE_VERIFICATION.md), [hardening](maintainers/RELAY_HARDENING.md) |
| Review authority and custody | [Security](SECURITY.md), [ADR catalog](adr/README.md) |

## Reading scope

The [complete catalog](CATALOG.md) indexes every Markdown document, including subsystem references, historical decisions, research, commercial drafts, and operational evidence. Current guides define the active relay contract. Domain specifications do not transfer their guarantees to other components. Research and commercial targets are not runtime guarantees or SLAs.

ADRs preserve dated decisions and verification. ADR 0127 records the successful September 7 production cutover and DreamBees actual-client image verification; paid Hive remained disabled. Use live authenticated capability evidence for current availability.

Documentation changes must update scope and navigation and pass `python3 scripts/verify-docs.py`. Shared defaults belong in the runbook/source, not duplicated across dozens of guides.
