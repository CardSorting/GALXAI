# ADR 0114: Uncertain Execution Authority Kernel and Transactional Journal

## Metadata

* **Status**: Accepted
* **Date**: 2026-09-04
* **Authors**: @galxai-architects
* **Subsystem**: `src/core/execution/`, queue projectors, WebSocket/SSE projections
* **Impact**: Agent authority, leases, budgets, terminality, auditability, crash recovery
* **Invariant Tests**: `simulations/high-concurrency-10k-fairness/index.test.ts`, Invariants 19–20

---

## 1. Context

An agent execution is not a deterministic background function. Its runtime, plan, provider, token use, tool calls, child work, success criteria, and next action can change after it begins. Scheduling it as if it were a predeclared task gives the queue accidental authority over a computation whose future shape does not yet exist.

The runtime cannot make the computation deterministic. It must make that nondeterminism operable by preserving a small deterministic set of invariants:

- execution identity and authoritative revision;
- current mutation authority and fencing token;
- allowed actions and delegation policy;
- authorization-bound reservations and consumed budget;
- durable evidence and causality;
- cancellation intent and the conditions that permit terminality.

The queue, socket, and agent are all fallible participants. None is the source of execution truth.

## 2. Decision

GALXAI adopts four explicit planes:

```text
Agent / worker proposes or reports
              │
              ▼
      ExecutionSupervisor
   transition invariants only
              │ accepted/deferred/rejected
              ▼
   Authoritative aggregate record
        state + journal facts
              │
         BroccoliDB WAL
              │
       ┌──────┴────────┐
       ▼               ▼
Queue projector   Event projector
authorized work   WS/SSE/metrics/UI
```

The doctrine is:

> **WebSocket projects execution. Queues deliver authorized intents. The event journal records observations. The control plane governs authoritative state.**

The runtime is a system for uncertain work with deterministic accountability.

### 2.1 Authority kernel

`ExecutionSupervisor` is deliberately narrow. It does not interpret plans or decide whether an agent's reasoning is good. It evaluates:

```text
(current state, proposed transition, evidence, policy, lease/fence)
                              │
                              ▼
           accept | reject | defer | require_verification
```

It checks revision freshness, actor permission, lease-holder identity, fencing, attempt-identity uniqueness, budget, delegation limits, outstanding work, verification, cancellation, and terminality. Transports and projectors cannot bypass this kernel. An unauthenticated proposal cannot advance an attempt's monotonic sequence and thereby poison the legitimate holder's future messages.

### 2.2 Epistemic state is explicit

The following states are intentionally not aliases:

```text
agent.completion_claimed
        ≠ completion_pending_verification
        ≠ execution.completed

execution.cancellation_requested
        ≠ attempt_interrupted
        ≠ execution.cancelled
```

An agent completion claim creates evidence and a bounded verification intent. Only a verifier or control actor can accept terminal completion. A cancellation request creates an interruption/finalization intent; it does not claim the attempt has stopped.

Completion is deferred while token reservations or child executions remain active. Verified completion retires the active attempt and emits a durable release intent. Terminal failure revokes every outstanding lease, action/child reservation, and child slot while atomically recording interruption and child-cancellation work.

### 2.3 Ordering domains remain separate

| Field | Meaning | Not equivalent to |
| :--- | :--- | :--- |
| `executionRevision` | Version of accepted authoritative state | Event count or attempt order |
| `attemptSequence` | Locally monotonic order inside one attempt, enforced per attempt ID | Global total order |
| `journalOffset` | Replay order inside one execution ledger | State revision |
| `causationId` | Immediate fact or proposal that caused this entry | Broad request grouping |
| `correlationId` | Wider interaction or incident grouping | Causal parent |

The architecture does not impose a global total order across an agent tree.

### 2.4 Atomic state and journal invariant

BroccoliDB currently guarantees atomic mutation at a record boundary. Therefore `ExecutionLedgerRecord` stores authoritative state, proposal decisions, and journal consequences in one aggregate. A CAS write commits all of them together.

> **There must not be a committed authoritative transition without a recoverable corresponding journal fact.**

Every proposal, including a rejection or deferral, receives a durable decision fact. Accepted transitions add their observation and work-intent facts in the same aggregate mutation. Duplicate `proposalId` values return the original decision without another commit.

`DurableExecutionAuthority` is the server-only durability boundary. It mounts the ledger and projector cursor tables in `BroccoliDatabaseKernel` and does not resolve `createExecution()` or `propose()` until the WAL has flushed. The plain `ExecutionSupervisor` remains available with injectable in-memory tables for deterministic tests.

Raw hot-table CDC is not the publication trigger in the durable host because CDC can precede WAL fsync. Durable projectors run in manual mode behind a per-execution high-water mark. The host advances that watermark and notifies projectors only after a successful flush; a WAL error poisons the host against further authoritative mutation.

The durable host also stamps proposals with trusted ingress time before lease-expiry evaluation and journaling. Actor-supplied clocks cannot extend mutation authority. Direct use of the synchronous kernel may inject synthetic timestamps only in deterministic tests or another trusted ingress adapter.

### 2.5 Queue and event projections

`ExecutionQueueProjector` consumes only `work_intent` journal entries and converts them to `AuthorizedExecutionIntent` envelopes. The delivery key is stable and must be used as the downstream queue idempotency key. Enqueueing work never changes authoritative execution state.

`ExecutionEventProjector` consumes decision and observation entries for WebSocket, SSE, metrics, audit, and UI views. These consumers may lag, retry, disconnect, or rebuild without changing execution truth.

Both projectors are at-least-once:

1. wait for the post-fsync durable high-water mark;
2. read after the durable cursor;
3. deliver using the stable `deliveryKey`;
4. advance the cursor only after delivery succeeds;
5. replay after a crash or explicit retry.

A crash after the external side effect but before cursor persistence can redeliver. Consumers must therefore deduplicate by `deliveryKey`; exactly-once delivery is not claimed.

## 3. Accepted transition rules

| Proposal | Principal rules | Authoritative consequence |
| :--- | :--- | :--- |
| `grant_lease` | Control/system actor; positive duration; never-reused attempt and lease IDs | New holder-bound lease and monotonically increasing fence |
| `authorize_action` | Current revision and lease; action allowed; budget available | Reserve budget and append bounded work intent |
| `record_action_result` | Current lease; exact action authorization and reservation | Release only that reservation, account consumption, preserve pending cancellation/verification |
| `record_observation` | Always journal evidence; mark stale evidence non-authoritative | No state revision for observation-only writes |
| `request_delegation` | Current lease; delegation and child/budget policy permit it | Reserve child capacity and append child-create intent |
| `record_child_result` | Verifier/control actor; exact child authorization | Release that child reservation and active-child slot |
| `claim_completion` | Current lease; no outstanding reservation or active child | Enter `completion_pending_verification` and request verification |
| `request_wait` | Current lease; no active action reservation | Enter `waiting`, release the attempt, optionally schedule wake-up |
| `resume_execution` | Control actor; execution waiting | Return to `queued` and request a newly fenced attempt |
| `verify_completion` | Verifier/control actor; verification pending | Complete and release the attempt, or resume execution |
| `request_cancellation` | User/control/system actor | Enter `cancellation_requested`; request interruption/finalization |
| `confirm_attempt_interrupted` | Cancellation pending; valid attempt evidence or control override | Enter `cancelled` |
| `finalize_cancellation` | Control actor; no active attempt or child | Enter `cancelled` without inventing interruption evidence |
| `fail_execution` | Verifier/control actor | Enter `failed`; atomically revoke reservations, lease, and child authority and project cleanup |

Replacing a lease increments the fencing token and atomically appends cleanup work for the superseded attempt before authorizing the replacement. Late frames can still be recorded as evidence but cannot mutate authority.

## 4. Implementation map

| Module | Responsibility |
| :--- | :--- |
| `ExecutionContracts.ts` | States, actors, proposals, decisions, ordering metadata, policies |
| `ExecutionSupervisor.ts` | Deterministic transition adjudication |
| `BroccoliExecutionLedger.ts` | CAS aggregate commit and proposal idempotency |
| `ExecutionJournalProjector.ts` | Generic at-least-once projector and durable cursors |
| `ExecutionPlaneProjectors.ts` | Queue-intent and live-event projection contracts |
| `DurableExecutionAuthority.ts` | Server-only BroccoliDB WAL lifecycle and flush boundary |
| `galxai/execution` | Runtime-neutral authority exports |
| `galxai/execution/durable` | Server-only WAL-backed host export |

## 5. Consequences and limits

### Positive

- A queue item cannot create authority merely by existing.
- Agent claims are evidence, not self-ratifying state transitions.
- Fencing rejects mutations from replaced attempts.
- State and its journal consequence cannot split across a dual-write crash window.
- Work and event delivery can fail and retry independently.
- WAL restart restores both authoritative state and projector progress.

### Trade-offs

- Projection is at-least-once, so sinks must implement idempotency.
- The aggregate journal grows with an execution. Production retention requires checkpoint/compaction after all required projector cursors pass a safe offset.
- The current kernel governs transitions and resource bounds; it intentionally does not understand arbitrary agent plans.
- BroccoliDB replication and multi-region consensus remain deployment concerns above this in-process authority implementation.

## 6. Verification

Invariant 20 exercises revision rejection, lease-holder binding, sequence-poisoning resistance, attempt-identity uniqueness, lease fencing, forbidden delegation, budget enforcement, premature completion deferral, stale evidence retention, completion verification and attempt release, cancellation/interruption separation, terminal failure revocation, atomic state-plus-journal writes, projector crash recovery, consumer idempotency, WAL restart, and projector cursor recovery.

```bash
npx tsc --noEmit
npx tsx simulations/high-concurrency-10k-fairness/index.test.ts
```

## 7. Related decisions

- [ADR 0010](0010-cloudtasks-cloudrun-asynchronous-queue-substrate.md) — queue delivery substrate
- [ADR 0011](0011-directed-acyclic-graph-workflows-and-realtime-event-streaming.md) — event streaming and DAG projections
- [ADR 0043](0043-broccolidb-hybrid-resilience-outbox-disaster-recovery-and-sla-uptime.md) — BroccoliDB outbox and recovery lineage
- [ADR 0113](0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md) — unpredictable inference transport and scheduling
