# Provisioning and preflight

<!-- docs-scope: current-guide -->

Private procedure under [the federation contract](../FEDERATION_STRATEGY.md), [ADR 0152](../adr/0152-manual-desktop-only-shard-authority.md) and [current state](../../post-mortem/CURRENT_STATE.md).

1. Identify the authorized target/component and existing controller owner. Inspect runtime requirements, private configuration presence, Docker, images, loopback access and persistent journals without printing secrets.
2. Verify the manual-enrollment schema and compatible controller/application. Registry readability alone is insufficient: service-role ingestion must remain denied and only confirmed desktop bindings may enter admission.
3. Use isolated synthetic lifecycle and database fixtures before a release. A canary name does not make a controller with real configuration disposable. Do not start a second owner or add multi-host controllers without distributed fencing.
4. Open Relay Desktops through the host shortcut. Reuse the account's owning desktop or manually create one for a new account, finish provider sign-in there and explicitly **Enroll shard**. Existing eligible records require the same confirmation; labels, local links and valid tokens are not automatic enrollment evidence.
5. Check committed authority, worker application and the requested capability before traffic. Worker lifecycle is automatic; provider session renewal remains a manual operation in the owning desktop.
6. Preserve the desktop home, signing state, holds and uncertain receipts. Application/controller reloads do not upgrade guest or worker images. Record actual deployment and acceptance separately.

API/CLI/token-file enrollment and host-cache discovery are closed. Repair a failed preflight at its authority boundary rather than restoring ingestion or copying credentials. Use [enrollment/recovery](../maintainers/RELAY_CREDENTIAL_ENROLLMENT.md), [the operator runbook](../RELAY_VNEXT_RUNBOOK.md) and [request recovery](../RELAY_API_REFERENCE.md#request-recovery).
