# Security and key rotation

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Identify the authority being rotated: product credential, controller inference/admin key, worker internal key, upstream shard credential, or registry encryption key. Their scopes and rotation procedures differ.

Follow the registry rotation runbook for encrypted credential changes. A new credential revision drives worker lifecycle and fresh discovery; a task ID or local cache cannot authorize it. Preserve accepted-job ownership and document any access loss caused by principal changes.

Verify worker isolation and controller secret custody. Do not print environments or place keys in browser bundles. Security controls and signed evidence are not compliance certification; any compliance claim needs its own reviewed evidence.

Use the [current contract](../FEDERATION_STRATEGY.md), [operator runbook](../RELAY_VNEXT_RUNBOOK.md), [request recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [maintainer execution guide](../maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md).
