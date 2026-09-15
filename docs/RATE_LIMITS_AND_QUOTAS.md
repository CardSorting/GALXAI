# Rate limits, concurrency and quota

<!-- docs-scope: current-guide -->

Private reference. [Account management](reference/relay-account-management.md) owns central admission; [routing](ROUTING_ALGORITHMS.md) owns fixed-pool selection.

| Signal | Authority and meaning |
| --- | --- |
| Pool assignment | Exclusive central assignment; paid provider accounts in Premium, free provider accounts in Standard |
| Account eligibility | Enabled state, current credentials and access, matching runtime ownership/revision |
| Account quota/concurrency | Existing central account lease/budget ledger; no duplicate ledger in execution projects |
| Execution reservation | Own-pool durable identity before provider I/O; not a second account budget |
| Provider cooldown | Attributable upstream/account evidence; empty local slots cannot clear it |
| Product entitlement/fair usage | GALX customer policy, independent of provider account class |
| Health display | Observation with freshness and reason; not permission or throughput certification |

Standard adds [one ongoing job per eligible account and fair rotation across models](reference/standard-relay-scheduling.md). It skips projected and live engine cooldowns, checkpoints provider quota exclusions immediately, and permits one recovery job per account after its deadline, subject to the pool's recovery interval. Explicit central admission denials back off locally for 60 seconds, doubling to 30 minutes; this process-local delay never overrides the central budget. No eligible account returns `503 service_busy` and a five-second polling hint, not a claimed reset time. Premium retains its existing concurrency/selection policy. The monitor's central health snapshot does not expose these local busy slots or denial timers.

Standard also spaces new recovery selections at least five seconds apart across the pool, using a monotonic clock. Healthy traffic can continue during that wait. The same job's repeated quota notices do not multiply backoff, while fresh observations may extend its deadline. An elapsed reset-less zero observation permits one authorized probe; new exhaustion evidence still excludes the account. Confirmed recovery is retained in the engine checkpoint. The rate of recovery starts is a local admission bound, not a provider quota or an automatic retry schedule.

Text uses the configured pool, with no peer fallback. Sites/images always select Premium. Standard's rejection is a capability boundary, not temporary saturation. Premium image capability requires explicitly requested observation; the isolated runtime does not run background paid image probes.

Central grants are short-lived and must renew; failed renewal stops upstream work. Central outage denies new grants and renewal. An unconfirmed terminal write blocks new local admission while original settlement retries. Do not reset counters, clear authoritative cooldowns or change operation IDs to bypass admission. Generic timeouts/403s do not establish permanent account failure, and uncertain work is never automatically repeated.

The retained federation's model-pool capacity errors, image probe cadence, control buckets and signed job limits remain documented in [legacy operations](maintainers/legacy-federation-operations.md). Those numeric bounds and maintenance semantics do not define the new pool runtime. Product response headers are allowlisted; internal retry diagnostics are not forwarded wholesale.

## Sites fair usage

[ADR 0140](adr/0140-paid-sites-and-shared-fair-usage.md) replaces new Sites wallet pricing and the daily cutoff with paid-plan inclusion and shared admission. Each accepted logical Sites update counts once. Below-threshold traffic remains subject to physical and flow safety; above-threshold traffic can continue when shared capacity and fair-use checks permit. Deferral does not impose a lockout until reset. Account/window counters and outstanding work are shared across workers; completed work still counts toward rolling attempt limits.

Production values remain unset until deliberately configured. The supplied fixture is synthetic. See [the private configuration contract](maintainers/SITES_FAIR_USAGE.md#paid-plans-and-production-configuration). Existing general inference limits retain their own contracts.
