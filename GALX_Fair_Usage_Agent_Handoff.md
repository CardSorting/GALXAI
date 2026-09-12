# GALX — Fair-Usage Gate
## Implementation handoff for a coding agent · Draft v0.1

**Scope:** Message-based admission governance over shared inference capacity.
**Status:** Proposed implementation specification. No repository or upstream provider implementation has been inspected. Production limits are intentionally unset; the accompanying numeric fixture is for tests only.

> Reaching an account's message threshold triggers a pool-capacity check, not automatic termination. Admit the next message when the pool can accommodate it under the sharing policy. Otherwise defer temporarily, and reconsider when conditions change.

This is not token metering, billing, a pricing model, a product interface discovery exercise, or an inference-quality evaluator.

## 1. Assignment and fixed boundaries

Implement a small policy module in the existing request-dispatch and pool-management path. Reuse authentication, routing, shared state, scheduling, timeouts, and telemetry already present. Do not introduce a new microservice, model call, persistent request queue, or periodic reconciliation service merely for this policy.

The owner has specified that message size is irrelevant to the fair-use counter. Count messages uniformly. Do not estimate tokens, weight messages by length, inspect content for economic value, or add token-based billing. Existing provider context limits and ordinary transport/security validation remain separate and unchanged.

The threshold marks a transition from **baseline eligibility** to **capacity-aware continuation**. It is not an absolute ceiling. Continuation is not an unlimited extension: each additional message receives its own admission decision. A declined continuation becomes eligible for reconsideration without waiting for the baseline allowance window to reset.

**Important correction to the earlier framing:** Baseline eligibility is not a guarantee of unavailable physical capacity. Below-threshold traffic still obeys existing global safety controls. It simply skips the extra post-threshold fairness restriction.

## 2. Inspect before implementing

Find the existing authenticated account identifier, the upstream dispatch boundary, the real shared-quota/pool boundary, the authoritative reservation mechanism, and any usable pool-status signal. Also locate request identifiers, cancellation handling, retries, and deployment topology.

Return a short implementation map naming the files and functions to change. Explicitly distinguish what already exists from what must be added. Do not guess that BroccoliDB, a particular database, or a particular provider endpoint exposes a capability that has not been verified.

Resolve these integration facts from the code first:

| Question | Required outcome |
|---|---|
| What is a message? | Identify one logical inference invocation at the existing dispatch boundary. |
| Who shares an allowance? | Use the authenticated parent account/tenant, not a user-supplied name, session, or API key. |
| What shares provider capacity? | Identify the actual upstream quota scope. Different routing aliases must not duplicate the same allocation. |
| Who owns admission state? | Identify one authority covering every worker that dispatches against that pool. |
| What does the pool expose? | Record the signal, its units, freshness, scope, and limitations. |
| Can dispatch finish ambiguously? | Identify the existing request-status, cancellation, and recovery behavior. |

If a required fact is absent, implement the isolated policy and tests behind explicit interfaces, and report the missing integration. Do not fill the gap with invented telemetry.

## 3. Accounting contract

### Identity and windows

Key the baseline message counter by `(account_id, allowance_window_id)`. Keep it shared across API keys, sessions, workers, and pool changes. Only use pool-specific allowances if an existing, explicit policy requires them.

Reuse the existing allowance window. If none exists, propose a fixed-duration window based on shared server time, with duration `W` and threshold `N` supplied by the operator. Window boundaries reset baseline eligibility, not in-flight reservations or short-horizon flow limits.

### Counting rule

**Proposed definition:** One message is one new logical inference invocation accepted for dispatch. A request carrying twenty historical chat entries is still one invocation. Streaming chunks are not separate messages. A subsequent agent turn requiring another generation is a new invocation. Preserve the originating account through agent/tool orchestration.

Count a message once when admission is committed. Count admissions rather than only successful outputs. Denied, invalid, or unauthenticated requests do not consume the baseline allowance. Transport retries with the same logical invocation identifier do not count as new messages, but each upstream attempt still needs capacity and short-horizon admission permission.

A proven cancellation before any upstream dispatch may roll back its admission count once. A timeout, failed generation, or cancellation after dispatch does not automatically refund it. Keep this definition visible in the integration documentation; it is a usage-governance counter, not a financial charge.

Require an invocation/idempotency identifier scoped to the account. Reusing it with different request contents is a conflict. A replay of an admitted invocation must not reserve capacity or dispatch it again. A previously deferred, never-admitted invocation may be reevaluated later using the same identifier.

## 4. Pool-capacity contract: what does “ping the pool” mean?

First query the existing pool authority, not necessarily the provider over the network. A locally authoritative scheduler may already know its available execution slots. Where external metadata is required, use the documented provider/control endpoint. **Never run a test generation to discover capacity.**

Expose a timestamped snapshot containing:

```text
pool_id                   actual shared capacity/quota scope
revision                  monotonically ordered local snapshot revision
observed_at, valid_until  freshness boundary
readiness                 READY | CONSTRAINED | UNAVAILABLE | UNKNOWN
signal_basis              source and meaning of the readiness decision
local_concurrency_limit   approved total outstanding admissions for this pool
cooldown_until            optional; applies to the documented failure scope
```

The local reservation authority maintains current outstanding admissions separately. If the provider exposes an actual remaining allowance, retain its original units and documented meaning. Do not subtract message counts from a token balance or call a health response a remaining-quota measurement.

**Readiness semantics must be implemented, not merely named:**

| State | Meaning and action |
|---|---|
| `READY` | A valid, documented signal permits attempts, and local safety limits are available. Continuation may be admitted subject to the checks below. |
| `CONSTRAINED` | An explicit pressure condition calls for protecting baseline access. Admit no new continuations; baseline remains subject to ordinary capacity checks. |
| `UNAVAILABLE` | A scoped provider denial, open circuit, confirmed exhaustion, or maintenance blocks dispatch to this pool. |
| `UNKNOWN` | A required status source is absent, expired, contradictory, or unreadable. Do not treat it as spare capacity. |

Local occupancy alone may constitute a valid signal for **locally governed execution capacity**, if that is the configured pool model. Label that basis honestly. A successful response proves neither a remaining token balance nor that other consumers of the same upstream account have stopped using it.

**Limit of the policy:** Without an authoritative remaining-allocation signal, this gate can bound GALX's admitted flow and share its local capacity. It cannot guarantee preservation of an unknown upstream token/budget balance. Missing token counts do not prevent implementing the local gate; they limit the guarantees it can claim.

### Refresh behavior

Reuse a snapshot only until its configured freshness deadline. On expiry, coalesce refreshes across workers sharing the pool: at most one refresh is in progress for that scope. Give that refresh a timeout. Other requests may wait only within a bounded admission deadline or receive a temporary deferral.

Publish refreshes with revision checks so a late old response cannot overwrite newer pressure/cooldown state. Revalidate the snapshot revision and validity during final admission. No external network I/O occurs inside the atomic admission operation.

Do not poll because someone is gated when there is no demand. Reuse existing status events or refresh on demand. A request denied for an account-local cooldown should not trigger a provider probe.

## 5. Admission policy

Use two independent decisions:

1. **Allowance lane:** `BASELINE` when the account has fewer than `N` admitted messages in its window; otherwise `CONTINUATION`.
2. **Current admission permission:** Whether one more invocation can run safely and fairly now.

Define these operator-supplied controls:

```text
C  maximum outstanding admissions for the pool
R  slots protected from continuation use, with 0 <= R < C
U  maximum outstanding admissions for one account
Uc maximum concurrent continuations for one account
E  short flow-governance interval, unrelated to allowance window W
P  pool-wide maximum admission attempts in a rolling E-second interval
B  continuation-only maximum admission attempts in that interval; B <= P
A  per-account maximum admission attempts in that interval; A <= P
T  active-continuation-demand lifetime
```

These are message/attempt and execution-slot controls, not proxies for token cost. Reuse an existing limiter where possible. Its window semantics must match the declared contract; do not silently substitute a fixed-window counter for a rolling-window limit.

Every upstream attempt, including a dispatcher retry, passes the pool's `C`, account `U`, and short-horizon `P`/`A` limits. Below-threshold callers do not bypass these protections.

For a continuation, also require all of the following:

```text
snapshot is fresh and readiness == READY
no applicable cooldown is active
pool_outstanding + 1 <= C
pool_continuation_outstanding + 1 <= C - R
account_outstanding + 1 <= U
account_continuation_outstanding + 1 <= Uc
pool_attempts_in_E + 1 <= P
account_attempts_in_E + 1 <= A
pool_continuation_attempts_in_E + 1 <= B
account is within its current continuation share
```

For admission, use the lower of the configured concurrency ceiling and any valid lower ceiling from the pool authority; continuation capacity is `max(0, effective_C - R)`. An approved pool authority may lower effective ceilings as conditions change. Clamp to those ceilings immediately for new admissions; do not terminate an already-running request just because a fairness ceiling fell. Do not independently invent a latency predictor or token-burn estimator.

### Sharing and adjustment with flow

Register each authenticated continuation-seeking account once in a bounded active-demand set. Repeated requests from that account do not create additional participants. Expire inactive entries after `T` using the existing state lifecycle.

Let `K` be the number of active continuation-seeking accounts, including the current account. For the minimal implementation, its short-horizon continuation share is:

```text
share = min(A, max(1, ceil(B / max(1, K))))
```

Enforce `account_continuation_attempts_in_E + 1 <= share` in addition to the pool-wide ceiling. With one active account, it can use the available continuation budget. With competing demand, its allowance for further admissions contracts. Previously admitted work is not revoked; an account already above the new share waits for its recent admissions to age out.

This is **bounded sharing, not a proof of starvation-free scheduling**. When demand exceeds available grants, preserve an existing fair scheduler if available. Do not claim strict equal service for arbitrarily many contenders from these counters alone. If stronger fairness is required, report that as a separate requirement rather than silently building a new queue service.

The policy adjusts on admission, completion, cooldown, status refresh, and active-demand changes. It does not permanently increase `N`, award a reusable batch of future calls, or lock the user out until `W` resets. Spare physical slots may remain protected by `R` or other safety limits; “available” means available under this policy.

## 6. Decision table

| Condition | Result | Counter effect |
|---|---|---|
| Baseline, ordinary safety checks pass | Admit one invocation | Count once; reserve capacity. |
| At/above threshold, fresh ready pool, sharing checks pass | Admit one continuation | Count once; reserve capacity. |
| At/above threshold, pressure or current sharing allowance exhausted | Temporarily defer | No message increment; no dispatch. |
| Capacity recovers while account remains above threshold | Reevaluate and admit if eligible | Do not wait for the baseline reset. |
| Required pool status is unknown | Refresh once or defer continuation | No optimistic extension. |
| Whole pool is unavailable or admission state cannot be read safely | Temporarily reject dispatch | No message increment. |
| A previously admitted invocation is replayed | Return existing invocation status/result under existing API semantics | No new count or dispatch. |

For baseline traffic, an unknown external signal may retain the existing bounded fallback only when local admission state is authoritative and no known upstream prohibition applies. Document that fallback. Loss of the reservation authority itself must not create an unlimited-access fallback.

## 7. Atomic admission and lifecycle

The check, count increment, flow-budget reservation, capacity reservation, and invocation record must have one serialized admission outcome across workers. Do not implement `check_pool(); await ...; increment()` as independent optimistic steps.

Use the existing transactional store, admission-owner actor, or equivalent serialization mechanism. The serialization boundary must cover both the shared account/window state and the selected pool; independent per-pool locks are not sufficient for an account that can route across pools. If Redis is already used, its atomic scripting capability is one implementation option; it is not a requirement to add Redis. Script atomicity alone is not an upstream dispatch guarantee or a general rollback mechanism. [R2]

```text
admit(account, invocation_id, request_digest):
    authenticate and validate outside the policy's state mutation
    find any existing invocation; replay/conflict without redispatch
    determine whether a fresh pool snapshot is needed
    perform at most one bounded, coalesced refresh outside admission lock

    atomically in the pool/account admission authority:
        recheck invocation, account window, snapshot revision, and cooldown
        derive BASELINE or CONTINUATION from current message count
        apply global safety checks and, if needed, continuation checks
        if ineligible: return a temporary decision without incrementing usage
        record invocation and lane
        reserve one slot and one short-horizon attempt permission
        increment logical-message usage once
        return one dispatch grant

    dispatch only while the grant is valid
    record known dispatch/terminal events idempotently
```

Do not allocate a grant twice after a state-write timeout. Look up the invocation before retrying admission. Keep caller identity, original allowance window, policy version, pool revision, lane, grant status, and dispatch status in the admission record.

Before sending upstream, claim the dispatch grant using a compare-and-set from reserved to dispatching; only the winning claimant may send. A lost or ambiguous send is not automatically made safe by a local claim record. A short dispatch-grant expiry prevents delayed workers from launching with old permission. A **running request's reservation is different**: it remains occupied until execution is known to have ended or the existing recovery mechanism establishes a safe terminal state. A client disconnect or expired worker heartbeat is not proof that upstream inference stopped.

Late callbacks must not decrement a newer reservation or release a slot twice. Cancellation before dispatch, terminal completion, ambiguous upstream timeout, and worker crash need distinct paths. Reuse the runtime's recovery mechanism. If upstream status is unknowable, quarantine the uncertain reservation under an explicit bounded recovery policy; do not silently recycle it and claim no oversubscription.

Keep the gate free of automatic generation retries. Existing provider retries must have a bounded attempt count and deadline, preserve the logical invocation, and reacquire attempt-level permission. Do not retry ambiguous non-idempotent dispatches merely because the caller timed out. Retry loops must live in one existing layer, not multiply across the gate and provider client. [R3]

## 8. Client-facing behavior

Return a structured decision through the existing transport:

```json
{
  "decision": "defer",
  "reason": "shared_capacity_reserved",
  "access_lane": "continuation",
  "retry_after_seconds": 5,
  "message": "Your baseline allowance is used. Additional messages remain available when shared capacity permits. Try again shortly."
}
```

The delay above is illustrative, not a production value or guaranteed future reservation. Distinguish reasons such as `account_flow_limit`, `pool_flow_limit`, `shared_capacity_reserved`, `pool_state_unknown`, `upstream_cooldown`, and `admission_state_unavailable`.

For HTTP integrations, use `429` for an account-specific rate/fair-use deferral, with retry guidance. That status represents rate limiting, not permanent account rejection. [R4] Use `503` for pool-wide temporary unavailability or admission-state failure, with `Retry-After` when a meaningful delay is known. [R5]

Do not return “token quota exhausted” when no token balance was measured. Do not return “queued” or HTTP `202` unless the system actually accepted and retained a job. No queue is required by this handoff. Client retries should honor cooldowns and use bounded backoff with jitter rather than immediate loops. [R3]

## 9. Required configuration and validation

Supply `N`, `W`, `C`, `R`, `U`, `Uc`, `E`, `P`, `B`, `A`, `T`, snapshot TTL, refresh timeout, admission deadline, grant expiry, maximum provider attempt count, and request deadline through existing configuration. Reuse existing values rather than duplicate them. Do not deploy the attached test fixture as production policy.

Validate positive durations; `N >= 0`; `C >= 1`; `0 <= R < C`; `1 <= Uc <= U <= C`; `1 <= B <= P`; `1 <= A <= P`; and refresh timeout not exceeding the admission deadline. Support an explicit disabled-continuation mode separately from invalid numeric configuration.

Document provider/pool limit units, whether other consumers share the upstream account, and how status freshness is established. Keep production enforcement disabled until missing operational limits have an approved source. An operator-configured limit is acceptable; a fabricated measurement is not.

## 10. Acceptance tests

Use a fake clock, fake pool-status source, and a genuinely shared admission authority in concurrency tests. The companion JSON provides synthetic settings and named cases; it is not an implementation or a claim that tests already pass.

| ID | Scenario | Required result |
|---|---|---|
| T01 | Account has `N-1` admissions | Next valid request uses baseline; the following one needs continuation checks. |
| T02 | Account is at `N`; pool is ready and has room | Continue. No unconditional quota error. |
| T03 | Account is far above `N`; pool remains ready | Continue when flow/sharing limits allow; no hidden absolute message maximum. |
| T04 | Small versus large request, otherwise identical conditions | Same message count and policy calculation; no content/token weighting. |
| T05 | Over-threshold account is temporarily gated, then capacity recovers | Admit before the baseline allowance reset when eligible. |
| T06 | Continuation has occupied `C-R` slots | Another continuation defers; eligible baseline traffic can use protected room. |
| T07 | Below-threshold account encounters a full pool | Ordinary capacity protection still applies. |
| T08 | Two workers contend for the last eligible slot | Exactly one admission; no oversubscription or double counting. |
| T09 | Two workers contend with account count at `N-1` | Exactly one gets the last baseline admission; the other is evaluated as continuation. |
| T10 | Two concurrent copies of the same invocation | One logical admission and at most one initial dispatch grant. |
| T11 | Same account uses several API keys or routing aliases | Shared account allowance; no extra copy of upstream capacity. |
| T12 | Many over-threshold callers encounter expired metadata | One in-progress refresh per pool; bounded waiting/defer; zero test generations. |
| T13 | Refresh fails or an older response arrives late | Unknown does not become ready; newer cooldown is not overwritten. |
| T14 | One active continuation account, then a second appears | Sharing adjusts; prior work remains; further grants obey the new share and pool budget. |
| T15 | All slots repeatedly finish very quickly | Short-horizon attempt limits still prevent an unbounded admission burst. |
| T16 | Baseline window resets | Account eligibility resets, but in-flight state and rolling flow limits do not. |
| T17 | Repeated deferrals | No usage increment and no upstream dispatch; retry can later be reconsidered. |
| T18 | Confirmed cancellation before dispatch | Count and reservation roll back once; duplicate callback changes nothing. |
| T19 | Cancel/disconnect after dispatch or ambiguous timeout | Do not refund blindly or recycle an uncertain running slot. |
| T20 | Worker dies after admission or state-write outcome is unclear | Recover using invocation state; never blindly admit/dispatch again. |
| T21 | Provider retry or new agent generation | Retry needs attempt permission without a second logical count; new generation is a new message. |
| T22 | Shared admission store fails | No per-worker unlimited fallback. |
| T23 | Local capacity is known but upstream remaining allocation is not | Local governance works; no claim of exact remaining token/budget protection. |
| T24 | Effective pool limit falls below current occupancy | Admit no violating new work; do not revoke healthy running work solely for fairness. |
| T25 | Cooldown is active and many clients retry | No repeated pool probe or internal regeneration loop. |
| T26 | Sustained overload across many accounts | Total admissions stay bounded; report measured sharing and any starvation limitation honestly. |

## 11. Observability, rollout, and definition of done

Emit compact decision events: account identifier under existing privacy policy, pool, invocation, lane, reason, policy version, snapshot age/basis, gate duration, current outstanding counts, and whether a refresh occurred. Record actual admissions, deferrals, upstream attempts, completion outcomes, unknown-state events, and ambiguous reservations. Do not log prompt or response contents for this policy.

Measure p50/p95/p99 gate overhead, refresh frequency, requests above threshold successfully continued, throttling reasons, attempts per invocation, and distribution of continuation admissions among active accounts. Set an explicit acceptable overhead target from the deployment's needs rather than inventing one here.

Roll out behind a feature flag. First evaluate in shadow mode using isolated shadow accounting; shadow decisions must not reserve live capacity or consume live allowances. Then enable a small controlled cohort and compare gate overhead, provider rejection rate, fairness, and useful admitted flow. Preserve existing global protections on rollback. Serving admissible work while shedding excess load is the operational objective, not maximizing rejections. [R1]

The agent must return the patch, integration map, tests and actual results, configuration documentation, limitations, and rollback instructions. Completion requires the threshold to function as a checkpoint, atomic shared admission, bounded refresh/retry behavior, and demonstrated recovery without waiting for the allowance reset.

**Do not reopen product positioning, runtime commercialization, token billing, semantic classification, or explainability. The deliverable is the fair-usage gate.**

## Engineering references

These sources support the narrow implementation practices noted above. They do not validate GALX's current architecture or supply production limit values. Accessed 11 September 2026.

- **[R1] Google, Site Reliability Engineering — Handling Overload.** Bounded admission and graceful rejection of excess work. `https://sre.google/sre-book/handling-overload/`
- **[R2] Redis documentation — Scripting with Lua.** Atomic server-side script execution as one possible implementation technique when Redis is already present. `https://redis.io/docs/latest/develop/programmability/eval-intro/`
- **[R3] AWS Well-Architected — REL05-BP03, Control and limit retry calls.** Bounded retries, retry amplification, backoff, and idempotency considerations. `https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_limit_retries.html`
- **[R4] IETF RFC 6585, section 4.** HTTP 429 and optional retry guidance. `https://www.rfc-editor.org/rfc/rfc6585.html#section-4`
- **[R5] IETF RFC 9110, sections 10.2.3 and 15.6.4.** Retry-After and HTTP 503. `https://www.rfc-editor.org/rfc/rfc9110.html`
