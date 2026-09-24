# Traffic and pool-specific capacity

<!-- docs-scope: current-guide -->

Private maintainer procedure.

Inspect the fixed Premium monitor: connection freshness, execution gate, account state, health reason, applied revision and epoch. Registration count, stopped/running desktops and catalog entries are not serving capacity; access is observed per account.

Add capacity only through **Register account → manual sign-in → Review access → register** in Premium. Premium uses verified paid accounts and permits text/Sites/images. Assignments are exclusive and immutable. Accounts, credentials and the existing lease/budget ledger remain central; the execution project contains no second capacity ledger.

The runtime selects among its own eligible in-process engines. No peer discovery, account borrowing, model substitution or dispatch failover is allowed. Central grants and account limits remain authoritative; do not reset counters or replay unknown operations to measure throughput.

Renew sessions explicitly in the owning desktop and save the new sign-in. Pause/removal stops that engine and renewal; historical records remain. Use [account management](../reference/relay-account-management.md) for health and cleanup and [routing](../ROUTING_ALGORITHMS.md) for exact selection/recovery.

The retained controller's weighted model routing, maintenance holds and container lifecycle are [legacy operations](../maintainers/legacy-federation-operations.md). Do not generalize them to the new runtime. Measured completed-result latency and workload-specific throughput are evidence; synthetic scheduling is not a capacity guarantee.
