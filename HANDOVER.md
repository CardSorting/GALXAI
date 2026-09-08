# Federation handover

September 8 workspace update: [ADR 0129](docs/adr/0129-public-image-artifacts-and-verified-identity.md) governs public image artifacts, verified identity, and private operational evidence. The local build, 19 security checks, compiled HTTP verification, and 362-asset scan passed. These changes have not been deployed or verified against production in this session. Earlier execution-metadata disclosure is historical and must not be restored.


Current authority: [federation contract](docs/FEDERATION_STRATEGY.md), [vNext runbook](docs/RELAY_VNEXT_RUNBOOK.md), and [ADR catalog](docs/adr/README.md). Use the [complete documentation catalog](docs/CATALOG.md) to distinguish active guides from scoped references and historical evidence.

## Dated deployed state

[ADR 0127](docs/adr/0127-codex-image-tool-alias-production-cutover.md) records the September 7, 2026 production cutover: a supervised host controller on loopback port 3001, one active worker for the usable shard, and the existing relay tunnel targeting the host controller. The legacy shared container was stopped and retained for rollback.

The actual DreamBees image client returned a valid, decoded and visually inspected PNG through the promoted public gateway. Execution metadata disclosed the enabled Codex image-tool compatibility alias. Exact image-model selection and dimensions were not guaranteed. Every observed pool had one eligible shard and was fragile. Paid Hive remained disabled; no billing or entitlement was changed.

These are dated observations. Check current revision, image, ingress, ownership, capability freshness, and actual client output before claiming present health.

## Invariants to preserve

- One active shard owns one isolated worker; workers receive no database/vault keys or host/source/Docker socket mounts.
- Model and operation eligibility precede health/load selection. Capability loss removes new eligibility without destroying useful workers or terminating accepted streams.
- Stale generation, inventory, health, and lease observations cannot overwrite current authority. Telemetry is observation-only.
- The explicit OAuth image alias requires verified image evidence and a fresh execution-model capability. Native API-key requests remain exact.
- Receipts are bounded and process-local. Signed jobs retain tenant/generation affinity. Reconcile uncertain execution before replay.
- Parent/subagent correlation does not grant execution permission. Tools remain in the consuming runtime.

## Operations

Use the runbook for supervised installation, isolated canary checks, image verification, and rollback. Do not launch the legacy shared Compose layout with new workers or run both topologies against the same credentials. Preserve signing secrets and checkpoint volumes without treating them as durable exactly-once execution.

Remaining architectural limits include single-host controller ownership, process-local receipts, bounded event replay, and separately governed application billing/storage/tool execution. More hosts require a shared ownership lease first. Do not infer throughput, uptime, or compliance guarantees from fixture tests.

For documentation changes, run `python3 scripts/verify-docs.py` and `git diff --check`; runtime changes require the relevant tests described in the verification guide.
