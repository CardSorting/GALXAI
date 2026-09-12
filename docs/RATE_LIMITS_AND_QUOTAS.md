# Rate limits, concurrency, and quota

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Capacity belongs to an eligible model pool. A fleet can have idle relays while a scarce model is saturated. See [routing](ROUTING_ALGORITHMS.md) and the [runbook configuration table](RELAY_VNEXT_RUNBOOK.md#configuration-and-bounds).

| Signal | Meaning |
| --- | --- |
| Model eligibility | Fresh evidence that the shard can serve this operation |
| Local concurrency | Worker execution slots, including admission reservations |
| Provider quota/backoff | Upstream-reported restrictions and deadlines |
| Credential cooldown | Attributable health decision under the owning authority |
| Application entitlement | Product key, tier, and billing authorization |
| Model redundancy | Number of healthy eligible shards; one is fragile |

Do not infer provider allowance from a local usage window. Do not clear cooldowns because local slots are empty. A generic 429 or timeout does not prove missing model permission. An expired explicit database cooldown allows a serialized recovery probe, not unlimited admissions.

The controller rejects unavailable/saturated pools explicitly. Callers honor execution state, `Retry-After`, and `X-Should-Retry`; they do not automatically replay ambiguous failures. Live receipt capacity is bounded and rejects new keyed work rather than evicting active deduplication evidence.

Image-alias probes consume quota and spare capacity. Successful image evidence has a bounded lifetime; failure backoff prevents probe storms. Disabling the alias requires configuration rollout, not a manual capability assertion.

Worker status/control traffic has a separate tenant bucket from inference. Bounded polling, Docker inspection, reconciliation, and shutdown prevent one slow shard from becoming a fleet-wide blocker. Current numeric limits live in the runbook and source; synthetic concurrency checks are not production throughput guarantees.

## Sites fair usage

[ADR 0140](adr/0140-paid-sites-and-shared-fair-usage.md) replaces new Sites wallet pricing and the daily cutoff with paid-plan inclusion and shared admission. Each accepted logical Sites update counts once. Below-threshold traffic remains subject to physical and flow safety; above-threshold traffic can continue when shared capacity and fair-use checks permit. Deferral does not impose a lockout until reset. Account/window counters and outstanding work are shared across workers; completed work still counts toward rolling attempt limits.

Production values remain unset until deliberately configured. The supplied fixture is synthetic. See [the private configuration contract](maintainers/SITES_FAIR_USAGE.md#paid-plans-and-production-configuration). Existing general inference limits retain their own contracts.
