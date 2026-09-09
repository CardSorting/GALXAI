# ADR 0126: Capability-aware 1:1 shard relay federation

<!-- docs-scope: decision-record -->

Date: 2026-09-07; reconciled 2026-09-09. Status: implemented; production cutover recorded in [ADR 0127](0127-codex-image-tool-alias-production-cutover.md).
Audience: private maintainers. [ADR 0131](0131-private-operator-desktops-and-maintenance.md) extends maintenance/access; [ADR 0133](0133-explicit-validated-enrollment-and-test-isolation.md) adds validated enrollment and pre-allocation checks.

## Problem

The former shared relay selected spare capacity before proving requested-model access. Heterogeneous account capabilities need explicit ownership and model-specific admission. Implicit model aliases and repeated starts of invalid credentials obscure useful capacity.

## Decision

Separate host-owned reconciliation, capability indexing and inference admission. Each managed worker receives one immutable assigned credential, internal inference/admin keys and a checkpoint volume. Workers receive no database/vault authority, source checkout, host home or Docker socket.

An eligible shard owns at most one active managed worker on a Docker host. Deterministic shard names, Docker uniqueness, ownership labels, generation checks and an exclusive controller lock enforce local ownership. This is not distributed consensus; multiple hosts need a shared lease.

Authenticated fresh model evidence precedes health/load selection. Unknown or expired evidence cannot admit requests. The reverse index limits selection to the requested capability. No eligible pool yields `model_temporarily_unavailable`; exhausted eligible capacity yields `model_capacity_exhausted`, both 503. The sole explicit OAuth image compatibility extension is defined by ADR 0127; no implicit fallback follows a failure.

There is no global waiting queue. Model-scoped reservations bridge acknowledgement/sample lag. Lost acknowledgements retain bounded conservative reservations and are not blindly replayed. Images dispatch once. Signed jobs bind tenant, original worker generation, job and expiry; accepted work stays attached to its original generation despite later capability loss. Restart detection uses process start evidence, not only container identity.

Empty inventories remain available for rediscovery and never cause deletion by themselves. Removed, revoked, expired or changed authority retires old workers. Credential rejection normally retires/suppresses that revision, except an existing worker under an explicit maintenance hold is preserved for repair. Holds block admissions and replacement starts without overriding registry authority.

Cold candidates now pass inventory authentication before allocation. A 401 persists rejection by revision; transient failures back off. Inventory success does not prove an inference handshake. Explicit enrollment replaces ambient population.

## Evidence and fencing

Inventory, health and request observations carry revision/generation fences. Old successes and equal-revision health replay cannot clear newer failures. Explicit model-denied evidence withdraws only the affected pair; generic 403/404, route errors, rate limits and timeouts do not establish model permission loss. Registry cooldowns continue to gate admission.

Refresh merges unaffected model evidence rather than allowing busy models to starve inventory. Defaults and deadlines are centralized in [the runbook](../RELAY_VNEXT_RUNBOOK.md#configuration-and-bounds).

Image operations have independent evidence. Chat inventory alone never advertises image synthesis. Explicit probes must return valid output before publication. The original September 7 foundation did not schedule paid probes; ADR 0127 subsequently enabled a bounded paid cadence for its opt-in compatibility route.

## Operational view

Admin snapshots expose model eligibility, freshness, ownership, streams and capacity privately. Redundancy labels are not latency or throughput guarantees. The monitor and linked desktop have distinct sessions and state under ADR 0131. Host launchers delegate sessions; the prior browser-key pattern is retired for federation monitoring.

## Original verification — September 7

The foundation run passed 55 capability/relay tests and 19 cooldown tests. TypeScript passed; lint had no errors and six existing warnings. Synthetic Docker canary `test-mtru9zo7` exercised three heterogeneous workers, capability loss/recovery without restart and stale health across process restart. Containers were removed; that canary's dedicated checkpoint volumes were retained.

Browser checks at 1440px and 390px covered the interface then implemented. The design detector used degraded regex mode and did not establish computed contrast compliance. Those observations do not certify later desktop or physical-device behavior.

## Subsequent rollout and limits

ADR 0127 records the September 7 production cutover, replacing the original pending-cutover status. [The September 9 record](../maintainers/RELAY_SESSION_VERIFICATION_20260909.md) records later cleanup, desktop work and retained worker identity. Use [current operations](../RELAY_VNEXT_RUNBOOK.md) instead of treating the original shared deployment as a rollback default.

Single-host ownership, process-local receipts, provider-specific inventory stability and physical-device/guest accessibility remain bounded as documented. A valid image does not verify a complete paid application transaction.

## Pattern references

Readiness versus existing-work serving resembles [Kubernetes endpoint conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/); bounded periodic I/O follows [timeouts and jitter guidance](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/). These references explain rationale, not a claim to those systems' scale guarantees.
