# Shared quota resilience — second audit

<!-- docs-scope: operational-record -->

September 16, 2026. This pass scrutinizes the [first implementation](2026-09-16-shared-quota.md), extending containment to work performed while recovering. It uses deterministic fault injection, local HTTP/WebSocket fixtures and installed-service checks. It does not establish production capacity, provider balance or zero-interruption behavior.

| Priority | Gap found | Implemented correction |
| --- | --- | --- |
| P1 | Simultaneous completions could launch overlapping terminal writes and settlement sweeps | Serialize durable writes; coalesce remote settlement into one bounded pass, with backoff and positive jitter |
| P1 | Slow settlement kept completed local execution slots occupied | Successful terminal persistence frees local capacity before remote settlement; a failed write still blocks admission |
| P1 | Failure between central acquisition and local binding could lose the in-memory retry for that lease | Retain the exact lease, block new admission and settle through the same bounded path; crash safety remains central lease/original reservation authority |
| P1 | One owner could fill request bookkeeping and create a lookup backlog | Bound requests before body parsing/lookup, with per-owner limits and distinct submission, observation and stream allowances |
| P1 | An old sibling success after cooldown expiry could reopen full concurrency without a probe | Require successful post-cooldown probe evidence; retain transient-failure cooldowns across engine restart |
| P2 | Immediate Continue clicks spent attempts during a known capacity wait | Persist Retry-After-aware deadlines and consecutive backoff; return explicit wait state without another request, write or reservation |
| P2 | A returned tool batch could start 32 callbacks immediately | Default to four in flight, stop queued starts after a failed save/cancellation and retain already-started results |

The [canonical contract](../../reference/shared-quota-recovery.md) owns numeric limits, API examples and recovery behavior. The error and presentation APIs agree on **Waiting for capacity**; the deadline enables a local countdown, and expiry enables explicit Continue without promising actual capacity. Budget exhaustion takes precedence over a wait/compaction suggestion. No timer restarts work and no uncertainty becomes permission to create another model attempt.

The choices adapt [Google SRE's per-customer and client-side overload controls](https://sre.google/sre-book/handling-overload/), its [cascading-failure analysis](https://sre.google/sre-book/addressing-cascading-failures/), and [GitHub's Retry-After guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api). They complement the first pass's partial-rerun and checkpoint patterns. These are design precedents, not claims of equivalent infrastructure or production reliability.

## Verification and delivery

The [second verification record](../../../post-mortem/incidents/2026/2026-09-16-shared-quota/second-pass-verification.json) retains exact scope, image pins and checks. The suite exercises 100 competing settlement calls sharing one stalled sweep, failure stopping further remote attempts, eight-receipt drain batches, 100 early Continue calls spending no extra attempt, bounded tool starts and retained results, and a stalled-owner request burst with separate owner/recovery admission. Initial integration fixtures correctly failed because they resumed immediately; they now assert the wait and advance only the synthetic clock before continuing over JSON and SSE.

Both local runtimes use `quota-20260916-r2`. Central/monitor pins, desktops, volumes and account state are retained. Registration remains open and execution closed. No real generation or new database migration occurred. The compatible SDK and public application remain unpublished. ADR 0155 remains proposed and ACT-025 remains open for real provider and caller acceptance.

## Practical limits

These are process-local concurrency and retry bounds, not a distributed tenant queue, requests-per-second limiter or equal token allocation. Separate request allowances still share the existing database pool. A total dependency outage can deny all callers; recovery does not fabricate availability. SDK callback bounds apply to one batch, while applications must bound aggregate agent/downstream work and implement callback/storage deadlines. Already-started external side effects cannot be forcibly made exactly once.

Durable continuation requires authenticated owner-scoped storage and atomic revision checks. Unknown writes and external outcomes require reconciliation. A delivered completed stream is not proof that the asynchronous terminal write or lease settlement committed. Existing model/HTTP/database deadlines remain in force; no new arbitrary callback kill mechanism is introduced. Selected-marker scans cover the local production build, not the live public site. No new graphical chat screen, visual score, browser UX acceptance or measured performance benefit is claimed.
