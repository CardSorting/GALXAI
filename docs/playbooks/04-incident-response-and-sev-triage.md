# Incident response

<!-- docs-scope: current-guide -->

The canonical process is [post-mortem triage](../../post-mortem/runbooks/triage.md). It defines severity, incident states, evidence, containment and actual-client acceptance. Use [known failure modes](../../post-mortem/failure-modes/README.md) to select the affected component's runbook.

Create a dated incident and append observations/actions to the [rolling log](../../post-mortem/ROLLING_LOG.md). Preserve tenant authority, accepted work, signing/storage state and uncertain operation identity. Keep unaffected products serving. Do not infer access, quota or permission to retry from a stale dashboard.

Use [current state](../../post-mortem/CURRENT_STATE.md) for the latest recorded release evidence. Recovery and prevention have separate completion criteria; [open items](../../post-mortem/OPEN_ITEMS.md) remain visible after the service works again. Public updates describe user impact and recovery without internal diagnostics.
