# GALX maintainer guide

Private operational navigation. Start with [current state](post-mortem/CURRENT_STATE.md), [incident operations](post-mortem/README.md) and [product scope](PRODUCT.md). Public information follows [AGENTS.md](AGENTS.md).

## Operations

The application, gateway, controller, worker, storage and database have separate deployment and authorization boundaries. Use the [federation contract](docs/FEDERATION_STRATEGY.md), [controller runbook](docs/RELAY_VNEXT_RUNBOOK.md), [Sites operations](docs/maintainers/SITES_OPERATIONS.md) and [preview administration](docs/operations/preview-admin.md) for their domains.

For incidents use [triage](post-mortem/runbooks/triage.md), [image recovery](post-mortem/runbooks/image-generation.md), [controller ownership](post-mortem/runbooks/controller-lock.md) and [storage containment](post-mortem/runbooks/deployment-storage.md). Keep accepted work, tenant ownership, signing state and rollback evidence intact. Never use stale telemetry, cached approval or a missing acknowledgement to authorize a new side effect.

For shard onboarding and renewal, use [manual desktop enrollment](docs/maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) and [desktop operations](docs/maintainers/RELAY_DESKTOPS.md). The desktop shortcut is the operator entry point. External ingestion is closed; provider expiry requires manual sign-in in the owning desktop. Refer to current state for activation and remaining acceptance rather than maintaining another deployment summary here.

## Verification and release

Use declared runtime requirements and inspect project scripts before executing them. Database integration uses disposable fixtures; production credentials must fail the test guard. [Database operations](docs/maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) separates inventory, test, migration and rollback actions.

Run the relevant hardening/security tests and production build, then qualify the affected deployed customer path. A built worker image is not a running replacement; a Ready application is not a verified generation. [Release guidance](docs/maintainers/RELEASE_ENGINEERING_AND_VERSIONING.md) preserves those distinctions.

## Documentation ownership

Use [documentation policy](docs/DOCUMENTATION_POLICY.md). Reconcile complete current guide bodies when decisions change. Dated incident evidence belongs in `post-mortem`; raw captures remain local and excluded from deployment. Keep action ownership, review dates, closure criteria and evidence current. Run `npm run docs:check` before review/release.

The [complete catalog](docs/CATALOG.md) classifies the full documentation corpus. Historical benchmarks, commercial drafts and research are not runtime guarantees. The [open-item board](post-mortem/OPEN_ITEMS.md) preserves unfinished prevention work after service recovery.
