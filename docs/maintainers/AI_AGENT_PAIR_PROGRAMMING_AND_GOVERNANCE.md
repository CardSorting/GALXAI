# Parent and subagent execution guide

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Make familiar developer inputs easy to use while keeping execution authority explicit. The [federation contract](../FEDERATION_STRATEGY.md#parent-and-subagent-execution) defines runtime behavior; this guide defines how maintainers organize work.

## Parent flow

The parent owns the requested outcome, scope, verification, and final integration. Resolve reversible implementation details from repository evidence and existing authorization. Ask only when missing information changes correctness or authorization; continue independent useful work while it is pending.

When delegation is authorized, assign bounded independent tasks with a concrete output, owned files, applicable constraints, and completion criteria. Keep dependency-sensitive edits with one owner. Do not multiply agents merely to produce overlapping audits. Parent and child operations retain separate IDs and traceable results.

### High-throughput operating loop

Use a small fan-out/fan-in loop for work that can genuinely proceed in parallel:

1. **Frame:** write one outcome statement, the public/private boundary, files in scope, and the acceptance command before delegation.
2. **Partition:** split by independent evidence lanes—read-only forensics, implementation, test design, documentation impact—not by arbitrary file count.
3. **Run:** batch independent reads and bounded I/O with a deadline. Give every child one owner, one output contract, and one blocker category.
4. **Reconcile:** the parent owns the merge, resolves overlapping edits, and checks that every accepted result has evidence. An uncertain child result is not success and is not permission to duplicate the side effect.
5. **Verify:** run the smallest relevant checks first, then the production build and boundary scans. Publish one concise decision packet with changed files, checks, limits and next action.

The parent should keep a live work ledger with `queued`, `running`, `accepted`,
`uncertain`, `blocked` and `cancelled` states. `blocked` means a specific
external dependency or missing authorization—not “the work is difficult.” A
child may continue independent read-only work while another lane waits, but a
shared mutation authority has one serialized owner.

### Child handoff packet

Every delegated task returns:

- outcome and state (`accepted`, `completed`, `failed` or `uncertain`);
- exact files/queries inspected or changed;
- evidence and command results, including limits;
- one next safe action or a concrete blocker with what would unblock it;
- operation ID and idempotency key for any external or mutating work.

This keeps subagent ergonomics familiar: the child can focus on a narrow job,
the parent gets a compact result, and a lost acknowledgement can be reconciled
from a stable receipt rather than guessed into a duplicate run.

## Execution identity

Use one idempotency key per logical inference operation, stable payload on retry, and a task ID for correlation. A task ID is not a tenant credential. Save signed job URLs, request IDs, execution state, and receipt scope before fan-out or recovery.

A child reports whether work was accepted, completed, failed, or uncertain. The parent reconciles accepted/uncertain work before dispatching a replacement. Never turn a lost acknowledgement into parallel duplicate synthesis. Bounded process-local receipts are not a durable workflow engine.

## Throughput

Batch independent reads and I/O with explicit concurrency and deadlines. Serialize mutations that share authority. Keep status/cancel traffic available while inference is saturated. Fixed Premium assignment precedes model eligibility, with no borrowing or fallback. Central account leases and bounded observation protect capacity; raising concurrency does not create provider access.

Return concise findings with evidence and the next safe action. Avoid unexplained retry loops, repeated approval questions for already-authorized work, and implementation jargon in product-facing errors. Preserve user intent when accepting familiar request shapes; do not silently substitute a model or grant tool authority.

Use separate lanes for evidence, code, tests and documentation when their inputs
are independent. Do not let a low-risk documentation or static-analysis lane
wait behind a live database check. Conversely, do not parallelize migrations,
shared schema edits, release metadata or any operation with one authoritative
revision. Status and cancellation remain available while inference or long I/O
is saturated; timeouts produce an explicit uncertain receipt when commit state
cannot be known.

The parent has execution authority for the requested workspace scope, but that
authority does not expand the requested data boundary. A faster path is a
bounded path: use explicit concurrency, deadlines, payload limits and
idempotency rather than unbounded retries or broad credentials. Public errors
remain capability-oriented even when a private handoff packet records the
implementation failure class.

## Completion

Integrate bounded changes, review the diff, run relevant checks, and record material limits. Documentation-only changes use documentation checks. Live inference, deployment, and financial changes require their actual authorized scope; a passing mock is not production evidence. Use the [ADR lifecycle](ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md) when the contract changes.
