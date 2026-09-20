# Relay admission lifecycle

<!-- docs-scope: current-guide -->

Private maintainer reference for the process-local generation admission path. This is an implementation guide, not public product documentation; do not expose its routing, capacity or diagnostic terminology through customer responses.

## Purpose and trigger

Use this runbook when a generation request appears stuck, duplicated, incorrectly re-admitted, or leaves a worker/shard busy after completion. The intended contract is one request, one admission lifecycle, one owner, one dispatch, one terminal outcome and one cleanup. It applies to new generation mutations after request identity and idempotency validation; read-only job status, receipt and stream requests do not acquire generation capacity.

## Authority and prerequisites

`AdmissionLifecycle` in `src/relay/admission-lifecycle.ts` is the request-side authority. `StandardPoolScheduler` owns only bounded queue accounting and synchronous reservations. The selected worker owns provider execution after dispatch. A central execution grant remains the authorization/settlement authority; it is not a second local dispatch queue.

The lifecycle is:

```text
RECEIVED → QUEUED → ADMITTED → DISPATCHED → COMPLETED
                     │             │
                     └─────────────┴→ CANCELLED | TIMED_OUT | REJECTED | FAILED
```

`DISPATCHED` means the worker `POST` may have started. A worker response resolves the dispatch outcome before the lifecycle becomes `COMPLETED` or `FAILED`. The tenant hash passed to the scheduler is a fairness/accounting key, not an ownership grant.

## Procedure

1. Create one `AdmissionLifecycle` after workload and idempotency checks. Set the image deadline once; never reset it on a wake or revalidation.
2. In one synchronous JavaScript turn, recheck liveness, deadline, owner/global allowance, readiness, capability, quarantine/cooldown and workload capacity; call `reserve()` and immediately `admit()` without an `await` between validation and ownership.
3. If no image slot is available, wait through the bounded scheduler only while a known image-capable worker is capacity-blocked. The queue remains 32 pending globally and 8 pending per owner, with a 120-second absolute deadline. Round-robin owner order and FIFO within an owner prevent monopolization.
4. On every wake, re-run all dispatch-boundary checks. A stale candidate returns to the bounded queue with the original deadline; lost capability, cancellation, expiry, owner capacity or readiness terminates the request explicitly. No wake can reset the clock or replay the generation.
5. Call `beginDispatch()` immediately before the worker `POST`. It changes the private outcome to `ambiguous` and holds the reservation until the complete worker response body is consumed. A received response changes the outcome to `resolved`.
6. On normal completion, failure, cancellation, timeout, disconnect or exception, call the matching terminal transition. `cleanup()` is idempotent and releases the reservation once. Scheduler reservations and cancellation/timeout resources are also idempotent.
7. Handoff is serialized: terminal lifecycle → reservation release → wake one waiter → revalidate → admit one successor. A completion never gives multiple waiters independent authority to claim the same slot.

Image and text capacity remain separate at the scheduler boundary. Image dispatch is single-flight per worker/shard; text and Sites retain their own reported capacity. Shared total shard capacity is consumed only where the relay explicitly models that constrained resource.

## Private pre-dispatch evidence

`PoolRuntime` emits bounded, structured `relay_admission` events to the
administrator-owned runtime log. These events observe the existing
`AdmissionLifecycle`; they do not authorize, queue, retry or terminate work.
Each record contains only an opaque request hash, workload, lifecycle state,
event name, bounded queue-pass count, optional internal target ID and a fixed
private reason. The event names cover `received`, candidate evaluation and
rejection, reselection, reservation attempt/acquisition/rejection,
worker-pregrant start/rejection, dispatch start and terminal state.

Use host/runtime administrator log access to correlate one request across its
events. Do not expose these records through inference responses, receipts,
browser assets or public telemetry. Prompts, request bodies, credentials,
provider messages, tokens and arbitrary exception text are never event fields.
The ring buffer is capped and a diagnostic sink failure cannot change request
behavior. A newly observed request that reaches a terminal state without the
expected candidate/reservation/dispatch evidence is an observability failure;
preserve the logs and stop the qualification rather than retrying the request.

## Image target-local failover

Image failover is an internal target transition inside the same admitted request. It is not a second receipt, a client-visible retry or a generic replay:

```text
ADMITTED → image attempt A
          ├─ confirmed pre-generation target rejection
          │  → release A → exclude A for this request → image attempt B
          └─ ambiguous or post-generation outcome
             → terminal failure; do not attempt B
```

The image controller and its owning `PoolRuntime` keep a request-local set of attempted shard/worker IDs. A target can be selected at most once for that request, so the number of execution attempts is bounded by the number of distinct compatible targets. The worker emits the fixed private `pre_generation_rejected` class only for authoritative image quota/capacity rejection; the pool records target-scoped cooldown/eligibility, calls `handoffAfterTargetRejection()`, releases A's reservation exactly once, preserves the deadline, and re-runs normal capability selection. This state does not disable the target's independent text capacity. If no compatible target remains, the existing generic unavailable response is terminal.

The safe boundary is authoritative evidence that generation was not accepted by the selected target. A timeout, connection loss after dispatch, malformed or unknown response, post-generation persistence failure, or any other ambiguous outcome remains terminal under the no-POST-replay contract. Registry refresh may update discovered worker knowledge but cannot erase live ownership or image-scoped cooldown state.

Failure-state scope follows the narrowest evidence available. A classified
worker/capability failure may open only that worker's workload-specific
cooldown; it must not mutate a sibling worker or the parent pool. An
`unknown`/ambiguous outcome is request-scoped: it terminates that mutation and
must never be replayed, but it does not prove that the worker lacks capacity
for a later, distinct request. The worker circuit is therefore not a second
quarantine authority. Its recovery is bounded by the recorded retry deadline
and, when the circuit expires, a successful probe clears the worker-local
failure streak. A request- or fleet-scoped failure does not open a worker
circuit.

The previous admission tests did not catch this defect because they exercised routing against already-known scheduler state. The production defect appeared after dispatch, when a target reported its own quota exhaustion and the execution layer incorrectly terminated the whole request instead of returning control to routing. The focused regressions live in `scripts/test-relay-adaptive-quota.ts`, `scripts/test-relay-admission-lifecycle.ts` and `scripts/test-relay-services.ts`; they cover direct single-shard failover, parent-pool handoff, all-target exhaustion, ambiguous first dispatch, workload-specific image cooldown, one receipt, one reservation at a time and no cycle.

## Bounded production qualification

The normal population runner also has an explicit `--qualification` mode for a
small, separately recorded production check. It reuses four existing Star
identities (`veyrasol`, `morrowkest`, `soravale` and `ilyx`), creates no
accounts or avatars, allows two content opportunities per Star, caps the run at
eight real generations with concurrency two, creates no schedules and disables
the qualification membership after the run. Inspect the original batch first
with `npm run stars:qualification:plan`; a separately authorized
requalification must use the fresh immutable versioned selector
`npm run stars:qualification:v2:plan` and `npm run stars:qualification:v2`.
Execute either only after the deployment, health, empty-shard failover and
endpoint-discovery gates have passed. A closed qualification cohort cannot be
reopened or expanded by the runner; each new qualification requires a new
versioned cohort/run key.

## Stop conditions

Stop the affected admission path if any request reaches two terminal states, is dispatched twice, releases occupancy twice, loses its queue/owner accounting, resets its deadline, or exposes provider/worker/shard/quarantine/capacity details publicly. Stop when a registry refresh makes an occupied shard appear free, when quarantine clears an active request's ownership, or when an ambiguous `POST` is about to be replayed.

Do not add a durable queue, distributed lock, second scheduler, broader load test, larger limit or live generation to diagnose this contract. Ordinary worker failures are attempt failures; only an explicitly classified fleet/control-plane failure may stop a bounded population.

## Recovery and rollback

Registry refresh may update discovered/configuration state but cannot erase `runtimeShardOwnership`. That ephemeral ownership survives refresh and is not restored from a checkpoint after restart. A restart therefore drops only unforwarded process-local waiters; it does not claim an old shard slot is still active, and an ambiguous mutation must be checked rather than replayed.

Worker quarantine changes future eligibility only. A request already in `DISPATCHED` keeps its existing outcome semantics and reservation until its own terminal response. A newer quarantine cannot be cleared by an older in-flight success. Image-specific quota/capacity state follows the same rule without globally disabling text eligibility.

Before `beginDispatch()`, the request is known not dispatched and a caller may safely retry a `not_accepted` result. After that boundary, a network error is `unknown`; admission recovery must never send the same mutation to another worker. Public errors remain generic and allowlisted.

## Verification and evidence

Run the focused deterministic suite:

```sh
node --import tsx --test scripts/test-relay-admission-lifecycle.ts
node --import tsx --test scripts/test-relay-adaptive-quota.ts
node --import tsx --test --test-concurrency=1 scripts/test-standard-pool.ts
node --import tsx --test --test-concurrency=1 scripts/test-relay-services.ts
```

The lifecycle regressions cover competing handoff, cancellation before/after admission, wakeup deadline expiry, registry refresh during occupancy, quarantine during occupancy, capacity loss at dispatch, queued/dispatched disconnect, idempotent cleanup, ambiguous `POST`, capacity-domain separation, exact 8/32 bounds and one-successor handoff. The service suite additionally proves public failure redaction, active-request quarantine and no duplicate dispatch. Record the test revision and any production observation in the private incident journal; do not refresh unrelated documentation review fingerprints.

For a maintainer, the complete answer is: a request is received by the pool, queued only in the bounded scheduler, admitted by the lifecycle holding one reservation, dispatched once by the selected worker, and completed or terminated by that same lifecycle. Capacity is released by idempotent lifecycle cleanup; cancellation before dispatch terminates it, cancellation after dispatch preserves ambiguity; restart does not reconstruct ownership or replay an uncertain mutation.
