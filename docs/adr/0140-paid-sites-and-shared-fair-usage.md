# ADR 0140: Paid Sites and shared fair usage

<!-- docs-scope: decision-record -->

Date: 2026-09-12. Status: accepted. Audience: private maintainers.
Supersedes new Sites pricing/admission in [ADR 0134](0134-fixed-price-sites-generation-with-opaque-provider-quotas.md) and the price-acceptance flow in [ADR 0139](0139-browser-sites-workspace-and-managed-publishing.md). Retains their historical receipts and publication boundaries.

## Decision

Include Sites creation, updates and managed publication in eligible active paid subscriptions. Remove the per-generation quote and wallet charge from new workspace and content requests. Use the supplied private [fair-use handoff](../../GALX_Fair_Usage_Agent_Handoff.md) and [synthetic fixture](../../GALX_Fair_Usage_Test_Fixture.json) as the policy specification and acceptance inputs. Neither file is a production configuration or public document.

One admitted logical generation counts as one message, independent of prompt size, history, output tokens or streaming chunks. The baseline threshold changes the request's lane; it does not prohibit subsequent updates until reset. A continuation can be admitted when shared local capacity, protected baseline room, account concurrency, rolling attempt budgets and active-demand sharing permit. Deferrals create no invocation charge. A new agent generation is a new invocation. The existing Sites transport allows one provider attempt; automatic generation retries remain prohibited.

## Identity and eligibility

Use the verified account subject from existing Sites authentication as the parent account. All its Sites, sessions and invocation identities share account counters even if the configured pool changes. Caller-supplied tier, owner, API-key metadata, wallet credit and editable organization records are not paid entitlement evidence.

Read the existing Stripe customer mapping and current active subscriptions. An operator allowlists eligible recurring prices; require a paid invoice line covering the current item and period, with matching customer identity. Trials, zero-paid coverage, paused collection, past-due subscriptions and incomplete evidence do not grant access. Bound the provider read, disable SDK retries for this check, and never perform it inside the admission transaction. This read-based approach immediately recognizes existing subscriptions without adding another webhook event pipeline; it adds a billing-provider read to each protected action. Enterprise/off-platform entitlement provisioning is not inferred from an organization label.

## Shared authority

Use private PostgreSQL policy, pool, invocation, demand and account-cooldown tables. Force RLS and revoke all Data API roles. Account advisory locks plus pool row locks serialize counters, capacity and flow across application workers. Configuration is a single versioned authority, with no numeric production defaults. Pool identity is operator-owned and represents the common delivery scope; routing aliases and worker IDs must not create additional capacity pools.

The snapshot honestly reports shared local admission capacity and a verified read-only delivery readiness contract. It does not report remaining supplier tokens or a guaranteed upstream quota. Existing federation and worker capacity/safety checks still apply at dispatch, including to non-Sites traffic. This feature's message accounting covers Sites, not general inference endpoints; it does not rewrite their billing or count their requests as Sites messages.

Refresh only on demand, coalesce refresh ownership across workers, bound refresh/admission time and reject stale revisions. UNKNOWN and expired evidence cannot authorize spare capacity. Every admission rechecks policy, paid proof freshness, account/window counters, pool snapshot and cooldowns atomically. Rolling attempt history survives fast completion and allowance reset. The bounded demand set adjusts continuation shares without revoking earlier work. Arrival order can still cause starvation; this is an admission policy, not a fair queue scheduler.

## Recovery and public boundary

Commit an invocation and expiring reserved grant before dispatch. Only the shared reserved-to-dispatching transition winner may submit it. Stable identities reject digest conflicts and prevent duplicate dispatch. Expired never-started reservations can be canceled exactly once; dispatching and unknown work keep their occupancy until an authoritative completed or not-started receipt. An absent acceptance reference remains quarantined unless an authenticated allowlisted pre-dispatch response explicitly confirms non-acceptance; keep that evidence private. Other missing references need operator investigation. Do not recycle it because a request timed out or a worker disappeared.

Persist workspace `operation_mode` so pre-cutover requests keep their original wallet reader and accepted tariff. The legacy content adapter is reachable only for historical GET recovery. Never restore its charged POST during rollback. New included requests never access wallet holds, debits or settlements. Retain only the latest eighty conversation entries while keeping invocation history durable, so conversation retention cannot become a lifetime generation limit.

Public setup exposes only access, publishing availability and chosen username. New content responses expose operation identity, pending/completed status and validated content. No price, pool, lane, supplier balance, internal reason or upstream header is forwarded. Return a simple paid-plan denial, rate limit or temporary unavailability, with bounded retry guidance when meaningful. Published snapshots, downloads and original-operation recovery remain accessible after plan expiry.

## Rollout and consequences

Migration `20260912030611_sites_paid_fair_usage.sql` seeds disabled admission without prices or numeric limits. Its rollback disables admission while retaining state. The synthetic fixture and source handoff are excluded from deployment. Operators must approve actual limits, eligible price IDs and a common pool identity before activation; an old content feature flag alone cannot enable the replacement strategy.

The disposable database harness provides isolated policy/shadow qualification and true cross-process contention tests. Runtime `shadow` is fail-closed, not permission to send ungoverned production requests. No online shadow dispatch or production cohort is enabled by this change. Qualify production latency and useful flow before cohort activation; synthetic timings do not establish production capacity. See [the complete runbook](../maintainers/SITES_FAIR_USAGE.md) for configuration, verification, unresolved-state handling and rollback.
