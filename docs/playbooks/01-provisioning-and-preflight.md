# Provisioning and preflight

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Identify the target component and existing authorized scope. Verify the repository runtime requirements, secret injection, registry readability, intended worker image, Docker availability, and loopback ingress design. Do not print credentials.

Use the isolated synthetic Docker canary for a new lifecycle build. It does not read production shards. A controller started with the real registry does: do not run it alongside another topology using those credentials.

Plan one active container per shard, independent capability discovery, persistent signing state, and an exclusive controller lock. Multi-host ownership requires a distributed lease before deployment. Do not provision unrelated infrastructure as a relay prerequisite.

Use the [current contract](../FEDERATION_STRATEGY.md), [operator runbook](../RELAY_VNEXT_RUNBOOK.md), [request recovery table](../RELAY_API_REFERENCE.md#request-recovery), and [maintainer execution guide](../maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md).
