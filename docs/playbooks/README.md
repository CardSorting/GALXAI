# Operational playbooks

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

These playbooks follow the [current federation contract](../FEDERATION_STRATEGY.md). Use the [vNext runbook](../RELAY_VNEXT_RUNBOOK.md) for commands and defaults. Training procedures are a separate domain; they do not establish relay behavior.

Select the affected lifecycle stage and identify model, tenant, generation, and execution state. Preserve current authority during recovery. No response-time or resolution SLA is established by this index.

Start incidents in [post-mortem](../../post-mortem/README.md). Use its [current state](../../post-mortem/CURRENT_STATE.md), [rolling log](../../post-mortem/ROLLING_LOG.md) and [known failure modes](../../post-mortem/failure-modes/README.md). Historical component verification remains dated evidence.

## Guide catalog

- [Provisioning and preflight](01-provisioning-and-preflight.md)
- [Deployment and release](02-deployment-and-release.md)
- [Traffic and model-specific scaling](03-live-traffic-and-fleet-scaling.md)
- [Incident response](04-incident-response-and-sev-triage.md)
- [Security and key rotation](05-security-key-rotation-and-compliance.md)
- [Recovery and postmortems](06-disaster-recovery-and-postmortems.md)
- [Developer ergonomics and execution authority](07-zero-hesitation-developer-ergonomics-and-api-governance.md)
- [Developer observation protocol](08-unframed-developer-observation-protocol.md)
- [🛠️ Playbook 09: Continuous Learning & Model Post-Training Runbook](09-continuous-learning-and-training-runbook.md)
