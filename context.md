# Current implementation context

September 8 workspace update: [ADR 0129](docs/adr/0129-public-image-artifacts-and-verified-identity.md) governs public image artifacts, verified identity, and private operational evidence. The local build, 19 security checks, compiled HTTP verification, and 362-asset scan passed. These changes have not been deployed or verified against production in this session. Earlier execution-metadata disclosure is historical and must not be restored.


Orientation updated September 7, 2026. The [federation contract](docs/FEDERATION_STRATEGY.md) governs current relay behavior; the [documentation catalog](docs/CATALOG.md) distinguishes current guides from historical/domain material.

- One active shard owns one isolated relay container; a supervised host controller manages ownership and capability-aware admission.
- Model/operation eligibility and freshness precede health/load selection. Capability loss removes new eligibility without destroying otherwise useful workers.
- The explicit OAuth `gpt-image-2` compatibility alias uses `gpt-5.6-terra` plus `image_generation`, requires verification, and discloses provider-managed image selection. Native API-key execution remains exact.
- Stale generation, inventory, health, and lease observations cannot clear newer failures. Database telemetry is observation-only.
- Receipts are bounded and process-local. Signed job URLs remain tenant/generation-bound; uncertain execution is reconciled before replay.
- Parent/child task IDs are correlation, not execution authority. Inference output does not authorize tools.
- ADR 0127 records production cutover and successful actual-client DreamBees image verification on September 7. Every observed pool had one eligible shard; paid Hive remained disabled.

Use the [vNext runbook](docs/RELAY_VNEXT_RUNBOOK.md) for deployment. Recheck live state before making a new operational claim; source on disk and historical verification do not prove the current deployed revision.
