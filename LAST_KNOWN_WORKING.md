# Last known working snapshot

Snapshot created: **2026-09-08 00:07:49 UTC** (2026-09-07 18:07:49 America/Denver).

Branch: `snapshots/last-known-working-20260908T000749Z`

Baseline commit: `ef3b953794c56067733cdd0a65853dc92351e051` — `docs: align corpus and ADRs with capability-aware federation`.

This branch preserves the last known working baseline and adds this record only. **`main` remains the primary development branch.** The baseline matched `origin/main` and the working tree was clean when the snapshot was created. Creating this snapshot does not deploy code or establish a new live availability observation.

## Preserved strategy

- One active shard owns one isolated relay container; a host controller reconciles lifecycle and ownership.
- Fresh model and operation capability precede health and load selection. Shards may expose different models.
- Capability loss removes new-request eligibility without destroying useful workers or terminating accepted streams. Empty capabilities remain recoverable.
- Generation, inventory, model-evidence, health-revision, and lease fences reject stale updates. Database telemetry is observation-only.
- The explicitly enabled OAuth image compatibility alias maps public `openai-gpt-image-2` / relay `gpt-image-2` to `gpt-5.6-terra` with `image_generation`. Image selection is provider-managed and disclosed; exact model and output dimensions are not guaranteed. Native API-key execution remains exact.
- Parent/subagent operations use bounded concurrency, distinct operation identity, and signed job affinity. Process-local receipts support bounded recovery; uncertain execution is reconciled before replay.

The [federation contract](docs/FEDERATION_STRATEGY.md), [runbook](docs/RELAY_VNEXT_RUNBOOK.md), and [documentation catalog](docs/CATALOG.md) describe the preserved implementation and its limits.

## Verification provenance

At the baseline commit, documentation validation passed for 267 documents and 128 ADRs, staged whitespace checks passed, and the pre-commit TypeScript check passed. The commit was pushed to `origin/main`.

[ADR 0127](docs/adr/0127-codex-image-tool-alias-production-cutover.md) records the earlier September 7 production cutover and actual DreamBees client image verification for release `102357770192c4cfdb565007ce786e139c409cf7`: HTTP 200, decoded and visually inspected PNG, with compatibility execution metadata. It also records the runtime tests and deployed image identity. This snapshot does not claim that all of the baseline's later documentation changes were independently verified in production.

At that recorded production observation, every model pool had one eligible shard and was fragile. Paid Hive remained disabled. The controller is single-host, receipts are process-local, and billing, assets, and external tools retain separate authority.

## Using the snapshot

Use this branch to inspect or compare the preserved baseline. Keep ongoing development on `main`; do not merge this snapshot marker merely to establish a checkpoint. A production rollback requires the runbook's drain, ownership, image, ingress, and verification steps; checking out this branch alone does not roll back a deployment.
