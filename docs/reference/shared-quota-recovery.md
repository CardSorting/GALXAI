# Shared quota and bounded continuation

<!-- docs-scope: current-guide -->

Private implementation and operator reference. [Account authority](relay-account-management.md), [pool selection](../ROUTING_ALGORITHMS.md) and customer entitlement remain independent. This guide owns the shared-account failure and SDK continuation contract. It does not claim a measured provider balance or transferable provider session.

## Contain the account, preserve each user's work

Several independently owned requests can share one Premium account. The first attributable quota observation excludes that account across models. Already-started requests may finish or fail individually; their accepted identities remain attached to their original account and epoch. Do not cancel successful sibling work, repeat a partial request automatically, or borrow the other pool.

Premium uses eligibility-aware rotation and forwarding reservations. Healthy Premium accounts allow at most four ongoing jobs each. Central account ceilings and grants can impose lower limits. Queued, running and streaming jobs consume capacity, including the interval after HTTP 202. New requests use current projected cooldowns, credential life and engine observations before an engine is contacted. A full/exhausted pool responds with bounded backpressure rather than accumulating another queue.

An explicit reset deadline is respected. Without one, quota feedback uses 60-second exponential backoff capped at 30 minutes. Newer evidence may extend, but not shorten, a known deadline. Repeated frames for one job count once even while sibling jobs report failures. Cooldown, last use and confirmed recovery are checkpointed for Premium. Checkpoints are best-effort local observations tied to the credential; storage failure is not a durable save and central leases remain authoritative.

After the wait, a recovering account admits one authorized user request only after previous work drains. Only that probe's confirmed success can restore full capacity; a pre-exhaustion sibling completing late cannot. New recovery selections are at least five seconds apart using a monotonic clock; healthy capacity remains available. No timer generates a paid probe. Reset-less stale zero observations are retired at that probe, and fresh exhaustion closes it again. Transient-failure cooldowns are also checkpointed. Central admission denials back off locally. A success whose admission began before a newer denial cannot erase that denial. These process-local controls do not replace central reservations or predict actual supplier quota.

## Keep recovery dependencies bounded

Authenticated submissions reserve a non-queuing request slot before body parsing or database lookup: at most 32 per runtime and eight per verified delegated owner. Status/cancel operations have an independent allowance with the same limits. Stream subscriptions have 64 total/eight per owner and release their lookup allowance once streaming begins. A disconnected request retains its reservation until its underlying work ends; disconnecting cannot create an unbounded collection of abandoned database operations. Request slots are separate from execution grants, and the existing database/transport deadlines still apply. These limits constrain in-flight work, not requests per second or customer token share. Distinct allowances do not create separate database connection pools or promise availability during a database outage.

An overload rejection before original-key lookup cannot prove whether earlier work under that identity was accepted. Its generation response retains `unknown` and a retry veto. After a successful lookup proves a new request, pre-forward rejection may use `not_accepted`. Never weaken that distinction to make a retry button available.

Completed jobs share a serialized terminal-write pass. Successful terminal persistence makes the completed local slot available without waiting for a remote settlement sweep. Failed terminal writes retain the existing admission block even when the local slot is released. The engine starts these writes from its terminal lifecycle event; delivery of a completed stream is not proof that terminal persistence or lease settlement has committed. Retain the original receipt identity after a crash or unconfirmed write. Settlement is a separately tracked, single in-flight maintenance pass: at most eight original leases, at least one second between successful passes, and 1–60 seconds of exponential delay plus up to one second of positive jitter after failure. A dependency failure ends the batch immediately; no new model work is created. The monotonic clock prevents a wall-clock jump from bypassing the delay. The periodic reconciliation supplies later attempts; completion bursts do not spawn another sweep. A lease acquired before a failed local binding is retained for the same paced settlement path and blocks new admission until reconciled. A crash still relies on the central lease and original reserved identity, never replay.

## Separate continuation from replay

| Evidence | Caller behavior |
| --- | --- |
| Confirmed pre-forward rejection | Retain progress; explicit Continue can submit the next step later |
| Explicit terminal quota stop of ordinary text inference | Retain committed tool results and display partial output separately; explicit Continue starts a new bounded model step |
| Lost acknowledgement, timeout, missing engine/epoch, storage ambiguity | Check the original outcome; do not automatically start another model request |
| Tool intent saved but result unconfirmed | Reconcile the application's side effect; never rerun its callback automatically |
| Complete step | Retain output once and proceed under the remaining turn budget |

The allowlisted public `execution_state` can be `not_accepted`, `failed`, `unknown` or the existing `accepted`. Here `failed` is emitted for an explicitly quota-stopped ordinary text job, not arbitrary subscriber errors, image generation or durable Sites receipts. It permits deliberate continuation, not automatic request retry. Public errors never include supplier identity, quota counters, topology, raw errors or reset diagnostics. A five-second `Retry-After` is a polling hint, not a quota-reset promise.

A new continuation has a new step identity under the original agent turn. Replaying the previous identity still reads the previous outcome. A confirmed quota failure may have consumed input or produced incomplete text; it retains its conservative reservation. Partial text is display-only and is never silently inserted as a complete assistant answer. Do not promise seamless completion or zero duplicate model reasoning.

SDK and browser retry helpers veto automatic replay for `failed`, `unknown` and `accepted`. The SDK checks error frames, malformed JSON, missing DONE and missing terminal completion. The stream wrapper retains failure when a caller later requests a final result. The chat API's persistence tap does not mark an error-bearing stream successfully completed.

## Checkpoint and resume API

Use `agent.startSession()`, retain `session.export()`, and restore with `agent.resumeSession(snapshot)`. A session owns its history and allows one active turn. New input cannot bypass its unfinished turn. `session.resume()` / `resumeStream()` or `agent.resume(checkpoint)` / `resumeStream(checkpoint)` explicitly continues a ready checkpoint, retaining completed callback outputs, attempt count, original turn ID and budget. `session.getRecovery()` supplies stable actions and copy for Working, Waiting for capacity, Continue, Check status, Shorten context and Review progress. This is an SDK presentation contract, not a newly installed graphical chat screen.

A confirmed capacity rejection/stop retains `retryAtMs` and consecutive capacity-failure count in its checkpoint. Explicit resume respects `Retry-After` seconds or HTTP date, a 5–60 second exponential fallback and up to one second of positive jitter; no hint is shortened. Before that deadline, recovery returns `action: wait` and the deadline, and resume raises `continuation_wait` with `recovery: wait` without another checkpoint write, model request, charged reservation or step. The application may update its countdown locally; no timer automatically sends a request. Expiry makes Continue available, not a promise of provider capacity. Successful inference clears the consecutive delay history. Application clock changes and an intentionally modified checkpoint are not authorization boundaries; the server independently enforces admission.

Configure an asynchronous `onCheckpoint` callback to save snapshots in the calling application's owner-scoped storage. It is awaited before model dispatch, before callback side effects, after each callback result and at completed step boundaries. Parallel callbacks serialize checkpoint writes and await all started callbacks before reporting failure. A rejected save prevents subsequent model/tool starts; an unconfirmed side effect remains blocked. Without this callback, state is retained only in the live session/export, not durably across application crashes. Imported snapshots are caller-owned data, not an authorization or billing grant. The hook receives `(checkpoint, expectedRevision)`; atomically compare that revision under the verified owner/turn and reject stale writes. The SDK advances its revision only after the write succeeds. This lets a correctly implemented store reject a second restored caller before dispatch. Enforce owner access and this compare-and-swap in the application store; an unconditional overwrite does not provide that guarantee.

```ts
const agent = galx.agent({
  maxSteps: 10,
  maxInputBytes: 65536,
  maxOutputTokens: 2048,
  maxTotalTokens: 131072,
  maxConcurrentTools: 4,
  onCheckpoint: (checkpoint, expectedRevision) =>
    saveOwnedCheckpoint(currentOwner, checkpoint, expectedRevision),
  tools: ownedTools,
});
const session = agent.startSession();
try {
  await session.run('Complete the task');
} catch {
  renderRecovery(session.getRecovery(), session.export());
}
// An explicit user action, only when recovery.action === 'continue':
await session.resume();
```

The application's registered callbacks still own domain idempotency and permissions. An intent record cannot establish exactly-once behavior for an external side effect that succeeded before its result was saved. Unknown tool outcomes have no blind resume override.

Parallel tool execution uses at most four callbacks in flight per batch by default; `maxConcurrentTools` accepts a positive integer and is capped at the protocol's 32 calls. Sequential mode remains one. A rejected persistence write or cancellation stops queued callback starts, awaits already-started callbacks and retains their completed results. A callback's own caught domain error remains a tool result, as before. This is a per-batch bound; applications running many agents still need aggregate downstream concurrency limits.

If storage fails, the session keeps its input, completed callback results and any final answer in the local snapshot, but displays **Check saved progress**. No new turn, continuation or compaction may bypass that state. Reconcile against the owner-scoped store and restore its confirmed checkpoint. Already-started parallel callbacks finish and their results are retained locally; subsequent checkpoint writes stop at the failed revision. This preserves evidence without overwriting another caller's progress or claiming a durable save.

## Bound the cost of resuming

Defaults are 10 model attempts, 65,536 serialized message/tool bytes per request, 2,048 output tokens per step and 131,072 conservative turn-budget units. Each attempt reserves the serialized input bytes plus 1,024 framing units plus the full configured output allowance before I/O. Observed usage above that reservation increases the charged amount; missing usage or a failed request never refunds it. This byte-based upper estimate is not a tokenizer, exact price or provider quota guarantee. The original limits survive exported/restored checkpoints; increasing runtime configuration cannot refill that turn's original budget. Request retry is disabled inside the automatic agent loop.

The server independently rejects ordinary text input exceeding 262,144 message/tool bytes and explicit output limits outside 1–16,384. Omitted output limits become 4,096 in the assigned engine. The connected transport rejects `max_output_tokens`, so isolated ordinary text omits that field from its first and only attempt. Instead, each observed UTF-8 byte of text, reasoning/summary text and function-argument deltas consumes one conservative output unit. Completed function-call envelopes are checked too, without counting streamed arguments twice. An overflow closes the socket before the overflowing data is published, fails the job without account cooldown or retry, and retains unknown usage/receipts; it never manufactures terminal success. The conservative byte limit can stop text earlier than a tokenizer would.

This local bound cannot limit hidden reasoning, work already buffered remotely or total provider spending. The wall deadline, central grant, account slots and no-retry policy remain independent limits. Completed requests retain actual terminal provider usage, even when it exceeds the reservation; estimates never replace observed usage. A request requiring a provider-enforced output ceiling (`require_output_limit: true`) is unavailable and rejected before new reservation/provider I/O; its private strict-profile preflight cannot advertise support. Permanent pre-forward request rejections carry a retry veto. The existing central ledger receives the full serialized request bytes plus framing and output reservation rather than the previous bytes/3 guess; reservations are admission controls, not a provider quota guarantee. [ADR 0157](../adr/0157-compatible-relay-output-budgets.md) records the correction to the earlier unqualified forwarding assumption.

Oversized context pauses before another model request. `session.compact(summary, keepLastTurns = 2)` explicitly replaces older turns with an application-supplied summary, preserves system/developer instructions and complete recent user/tool groups, rotates conversation identity so old server context cannot reappear, and returns the full previous snapshot for archival. Summary size is capped at 8,192 bytes. No automatic summary model request spends quota during exhaustion. A large latest tool group may still exceed the input bound; reduce the task or produce a deliberately reviewed new turn rather than silently deleting tool results. Compaction preserves the unfinished turn's budget. Persistence of the returned archive and the new snapshot belongs to the caller.

Customer seat concurrency, total spend and product fair-use policy remain the aggregate owner controls. Local agent budgets alone cannot prevent a caller from deliberately starting many separate turns. Fair rotation is account/request fairness, not equal token allocation among all users. No new distributed tenant queue or task database is introduced.

## Familiar patterns and deliberate limits

[AWS retry guidance](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) combines exponential backoff, jitter and retry quotas; GALX uses bounded admission and paced recovery without automatic accepted-work replay. [GitHub Actions partial reruns](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs) illustrate continuing failed work while retaining completed work. [Temporal activity execution](https://docs.temporal.io/activity-execution) separates durable orchestration from side effects that need idempotency. [Claude context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing) distinguishes full application history from bounded model context and warns of cache effects. These informed the design; no service is integrated and no equivalence to their durability or compaction guarantees is claimed.

The second audit applies [Google SRE overload guidance](https://sre.google/sre-book/handling-overload/) on client throttling and per-customer isolation, and [cascading-failure guidance](https://sre.google/sre-book/addressing-cascading-failures/) on bounded work and retry amplification. [GitHub REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api) reinforce respecting Retry-After and increasing waits after continued throttling. The local bounds here are deliberately simpler than a distributed adaptive limiter; no equal-share or measured overload-capacity claim follows from them.

## Verification, rollout and rollback

Run `test:agent:tools`, `test:relay:services`, shared transport/quota/usage/public-boundary tests, TypeScript, the production build and compiled private-boundary checks. Fixtures cover simultaneous owners sharing an account, quota exclusion, late sibling success, healthy sibling service, restored cooldowns, paced probes, bounded settlement storms/stalls, owner request isolation, context/output limits, real SDK JSON/SSE pause/wait/resume, lost outcomes, tool persistence failure and fan-out, retained budgets/deadlines and session isolation. They do not spend provider quota.

Use the [service runbook](../runbooks/relay-pool-services.md) to replace both runtime images while preserving volumes, desktops, assignments and execution gates. Central/monitor images and schema do not change. Distribute the updated SDK and deploy the compatible chat application separately; a runtime image cannot update external callers. Qualify successful completion and actual usage against manually connected accounts; test local overflow separately. A short successful request cannot establish a hard provider token ceiling. Rollback preserves all checkpoints and original outcomes; old SDKs must not consume unfinished new checkpoints as fresh input. Do not reset quota or unknown receipts as rollback. [Current state](../../post-mortem/CURRENT_STATE.md) records actual delivery, separately from these source contracts.
