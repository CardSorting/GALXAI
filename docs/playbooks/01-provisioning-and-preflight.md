# Provisioning and preflight

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Identify the target component and existing authorized scope. Verify the repository runtime requirements, secret injection, registry readability, intended worker image, Docker availability, and loopback ingress design. Do not print credentials.

Use the isolated synthetic Docker canary for a new lifecycle build. It does not read production shards. A controller started with the real registry does: do not run it alongside another topology using those credentials.

Plan at most one active managed worker per eligible shard, pre-allocation inventory validation, independent capability evidence, private signing/journal state and the external guardian's kernel-held local guard. Enroll accounts explicitly; host-cache import is retired. Repair desktops are separate workspaces, not additional fleet capacity. Multi-host ownership requires a distributed lease and fencing before deployment. Do not provision unrelated infrastructure as a relay prerequisite.

Use the [current contract](../FEDERATION_STRATEGY.md), [operator runbook](../RELAY_VNEXT_RUNBOOK.md), [request recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [maintainer execution guide](../maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md).
