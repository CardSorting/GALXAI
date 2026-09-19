# Runbook catalog

<!-- docs-scope: current-guide -->

Pick the symptom or operation. Each entry leads to the canonical procedure; incident procedures remain in `post-mortem/` so recovery instructions have one owner.

| Trigger or outcome | Canonical procedure | Responsible role |
| --- | --- | --- |
| Production failure, unclear blast radius | [Incident triage](../../post-mortem/runbooks/triage.md) | Incident lead |
| Images, history or Favorites fail | [Image generation recovery](../../post-mortem/runbooks/image-generation.md) | Product/API maintainer |
| Local Premium/Standard setup, access or activation | [Isolated service installation](relay-pool-services.md) | Relay operator |
| Account health, rename, removal or registration repair | [Account management](../reference/relay-account-management.md), [manual registration](../maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) | Own-pool operator |
| Retained controller stopped or lock remains | [Controller lock recovery](../../post-mortem/runbooks/controller-lock.md) | Relay operator |
| Deployment/function storage limit | [Deployment storage](../../post-mortem/runbooks/deployment-storage.md) | Release operator |
| Conflicting or stale documentation | [Knowledge maintenance](knowledge-maintenance.md), [incident documentation containment](../../post-mortem/runbooks/documentation.md) | Documentation maintainer |
| Weekly audit missing or failed | [Weekly knowledge audit](weekly-knowledge-audit.md) | Release operator and documentation maintainer |
| Prepare and verify a release | [Release readiness](release-readiness.md), [component deployment](../DEPLOYMENT.md) | Release operator |
| Private developer access or staff permission issue | [Private access administration](../operations/preview-admin.md), [activation record](../operations/preview-activation.md) | Authorized access administrator |
| Sites deferrals or unresolved operations | [Fair usage](../maintainers/SITES_FAIR_USAGE.md), [workspace](../maintainers/SITES_WORKSPACE.md) | Sites maintainer |
| Published site or address mismatch | [Domain operations](../maintainers/SITES_DOMAINS.md) | Sites maintainer |
| Database migration or authorization issue | [Database runbook](../maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) | Database operator |
| Relay capacity, runtime or account state | [Relay operations](../RELAY_VNEXT_RUNBOOK.md); [legacy controller](../maintainers/legacy-federation-operations.md) only for the retained deployment | Relay operator |

For a new procedure, copy the [runbook template](../knowledge/templates/runbook.md), fill every section, and register its path in `registry.json` under `runbooks`. The contract check applies to registered standardized runbooks. Existing component runbooks retain their structure until reviewed and migrated; catalog inclusion alone is not such a review.
