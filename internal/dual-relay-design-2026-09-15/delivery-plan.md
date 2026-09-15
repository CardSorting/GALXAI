# Delivery status: central accounts and isolated execution

<!-- docs-scope: research-reference -->

Private implementation index, reconciled September 15, 2026. [Current state](../../post-mortem/CURRENT_STATE.md) owns operational status; [service installation](../../docs/runbooks/relay-pool-services.md) owns all installation/gate procedures. Decision status in [ADR 0153](../../docs/adr/0153-central-account-authority-isolated-relays.md) is independent of delivery.

## Implemented and installed

| Boundary | Delivered behavior |
| --- | --- |
| Account authority | Main project only, encrypted accounts, exclusive assignments, registration, revisions, immutable operations and existing account lease/budget authority |
| Central protocol | Distinct scoped registrar, operator/viewer and runtime principals; current epoch/revision grants |
| Execution projects | Premium/Standard identity and execution reservations/outcomes only, with restricted separate logins |
| Runtime | In-process own-account engines inside each runtime container, renewable grants, durable operation identity and retained unknown outcomes |
| Local isolation | Docker Desktop central HTTPS; separate Colima kernels/daemons/disks for pools, no Mac mounts, persistent direct/forwarded peer denial |
| Monitor access | Fixed native menu/apps and scoped one-use tickets; separate sessions, no long-lived browser keys |
| Account management | Accounts/Registration/Activity, search/status/health filters, issues first, rename, remove, unfinished restore, explicit renewal, conflict and failed-stop recovery |
| Application source | Opt-in isolated transport, selected text pool, Premium Sites/images, no peer/legacy dispatch fallback or duplicate account lease |

The image manifest and latest [management release](../../post-mortem/releases/2026-09-15-relay-account-management.json) own exact installed pins and verification. Runtimes host in-process engines; the legacy per-account worker-container lifecycle is not used here. The shared physical Mac/admin remains trusted.

## Remaining activation

1. Complete manual paid/free sign-ins and reviewed registration in each fixed monitor. Latest acceptance has zero registered accounts and execution closed; registration is open.
2. Rerun actual local acceptance through the service runbook's `serve-local` gate, enable intended accounts and wait for fresh matching applied revisions/epochs.
3. Qualify Standard text and Premium text/Sites/images separately. Premium image trials are explicit; no automatic consuming probes or peer fallback.
4. Deliberately configure/deploy the application when its private origins are reachable. Verify actual customer authorization, response/artifact boundaries, quota/billing and original-operation recovery. Local installation alone is not public cutover.

No external SSH targets are needed for this chosen local deployment. External hosting remains a separate optional procedure with its own host/origin acceptance. Earlier closed-gate/no-stack observations remain dated in the [pre-installation record](production-audit-2026-09-15.md).

## Recovery

Central outage denies new grants and renewal. Pause/revoke/remove changes central revision and stops owning engines/renewal; a saved command is not proof of upstream logout. Removal retains identities, assignments, ciphertext, leases and history. Unfinished registrations may be restored with new review; registered accounts cannot.

Retain original execution identity and settlement. Restarted incomplete work becomes unknown and cannot redispatch; old artifacts may be unavailable after engine/epoch loss. Rollback closes gates without restoring revoked accounts or merging pools. See [the complete account contract](../../docs/reference/relay-account-management.md).
